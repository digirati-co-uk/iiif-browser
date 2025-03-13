import { useCallback, useRef, useState } from "react";
import { Button, Toolbar } from "react-aria-components";
import {
  CollectionContext,
  LocaleString,
  ManifestContext,
  useCollection,
  useVault,
} from "react-iiif-vault";
import { OmnisearchBox } from "../components/OmnisearchBox";
import {
  useResolve,
  useSearchBoxState,
  useSearchResults,
  useSearchState,
} from "../context";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { GridIcon } from "../icons/GridIcon";
import { ListIcon } from "../icons/ListIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { useLocalStorage } from "../utilities/use-local-storage";
import { CollectionGridSnippet } from "./CollectionGridSnippet";
import { CollectionListSnippet } from "./CollectionListSnippet";
import { ManifestGridSnippet } from "./ManifestGridSnippet";
import { ManifestListSnippet } from "./ManifestListSnippet";

export function CollectionItemList({ id }: { id: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const collection = useCollection({ id });
  const [isListView, setIsListView] = useLocalStorage("list-view-toggle", true);
  const [items, actions] = usePaginateArray(collection?.items || [], 48);
  const { openWithFilter } = useSearchBoxState();

  const setRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  if (!collection) return null;

  return (
    <div ref={setRef} className="px-2">
      <div ref={actions.topRef} />
      <LocaleString as="h1" className="text-2xl font-bold p-8 text-center">
        {collection.label}
      </LocaleString>

      {actions.totalPages > 1 ? (
        <div className="grid grid-cols-3 z-20 sticky left-0 right-0 top-2 bg-white p-4 rounded-full items-center mb-4 shadow">
          <Button
            className="text-blue-600 hover:underline disabled:text-gray-300 text-start focus:outline-none px-4"
            onPress={actions.prevPage}
            isDisabled={actions.currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-center text-sm text-gray-400">
            Page {actions.currentPage} of {actions.totalPages}
          </div>
          <Button
            className="text-blue-600 hover:underline disabled:text-gray-300 text-end focus:outline-none px-4"
            onPress={actions.nextPage}
            isDisabled={actions.currentPage === actions.totalPages}
          >
            Next
          </Button>
        </div>
      ) : null}

      <div className="flex px-4 py-4 justify-between">
        <div>
          <Button
            className="text-blue-600 hover:underline flex items-center gap-2"
            onPress={() => openWithFilter("", "collection")}
          >
            <SearchIcon />
            <span>Search collection</span>
          </Button>
        </div>
        <div className="inline-flex border rounded border-gray-300 overflow-hidden p-0.5">
          <Button
            aria-selected={!isListView}
            className={
              // biome-ignore lint/style/useTemplate: <explanation>
              `p-2 rounded-sm ` +
              //
              `${!isListView ? "bg-gray-200" : ""}`
            }
            onPress={() => setIsListView(false)}
          >
            <GridIcon />
          </Button>
          <Button
            aria-selected={isListView}
            className={
              // biome-ignore lint/style/useTemplate: <explanation>
              `p-2 rounded-sm ` +
              //
              `${isListView ? "bg-gray-200" : ""}`
            }
            onPress={() => setIsListView(true)}
          >
            <ListIcon />
          </Button>
        </div>
      </div>

      {isListView ? (
        <div>
          {items.map((item) =>
            item.type === "Collection" ? (
              <CollectionListSnippet key={item.id} id={item.id} />
            ) : (
              <ManifestContext key={item.id} manifest={item.id}>
                <ManifestListSnippet />
              </ManifestContext>
            ),
          )}
        </div>
      ) : (
        <div className="grid grid-sm gap-2">
          {items.map((item) =>
            item.type === "Collection" ? (
              <CollectionGridSnippet key={item.id} id={item.id} />
            ) : (
              <ManifestContext key={item.id} manifest={item.id}>
                <ManifestGridSnippet />
              </ManifestContext>
            ),
          )}
        </div>
      )}
    </div>
  );
}
