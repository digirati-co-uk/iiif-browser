import { useCallback, useRef, useState } from "react";
import { Button } from "react-aria-components";
import {
  CollectionContext,
  LocaleString,
  ManifestContext,
  useCollection,
  useVault,
} from "react-iiif-vault";
import { OmnisearchBox } from "../components/OmisearchBox";
import { useResolve, useSearchResults, useSearchState } from "../context";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { CollectionGridSnippet } from "./CollectionGridSnippet";
import { CollectionListSnippet } from "./CollectionListSnippet";
import { ManifestGridSnippet } from "./ManifestGridSnippet";
import { ManifestListSnippet } from "./ManifestListSnippet";

export function CollectionItemList({ id }: { id: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const collection = useCollection({ id });
  const [isListView, setIsListView] = useState(true);
  const [items, actions] = usePaginateArray(collection?.items || [], 48);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  if (!collection) return null;

  return (
    <div ref={setRef} className="px-2">
      <div ref={actions.topRef} />
      <LocaleString as="h1" className="text-2xl font-bold m-8 text-center">
        {collection.label}
      </LocaleString>

      {actions.totalPages > 1 ? (
        <div className="grid grid-cols-3 sticky left-0 right-0 top-2 bg-white p-4 rounded-full items-center mb-4 shadow">
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

      <div>
        <Button onPress={() => setIsListView(false)}>Grid view</Button>
        <Button onPress={() => setIsListView(true)}>List view</Button>
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
