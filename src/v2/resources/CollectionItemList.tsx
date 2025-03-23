import { useCallback, useMemo, useState } from "react";
import { Button } from "react-aria-components";
import { LocaleString, ManifestContext, useCollection } from "react-iiif-vault";
import { LayoutSwitcher } from "../components/LayoutSwitcher";
import { useCanSelect, useSearchBoxState, useUIConfig } from "../context";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { FilterOnOffIcon } from "../icons/FilterOnOffIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { useLocalStorage } from "../utilities/use-local-storage";
import { CollectionGridSnippet } from "./CollectionGridSnippet";
import { CollectionListSnippet } from "./CollectionListSnippet";
import { ManifestGridSnippet } from "./ManifestGridSnippet";
import { ManifestListSnippet } from "./ManifestListSnippet";

export function CollectionItemList({ id }: { id: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const collection = useCollection({ id });
  const canSelect = useCanSelect();
  const [isListView, setIsListView] = useLocalStorage("list-view-toggle", true);
  const [hideDisabled, setHideDisabled] = useState(false);
  const { showFilterButton } = useUIConfig();

  const filteredItems = useMemo(() => {
    const items = collection?.items || [];
    if (!hideDisabled) {
      return items;
    }
    return items.filter((item) => canSelect(item));
  }, [hideDisabled, collection, canSelect]);

  const [items, actions] = usePaginateArray(filteredItems, 48);
  const { openWithFilter } = useSearchBoxState();

  const setRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  if (!collection) return null;

  return (
    <div ref={setRef} className="px-2">
      <div ref={actions.topRef} />
      <LocaleString as="h1" className="text-2xl font-bold p-3 text-center">
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
        <div className="flex items-center gap-1">
          {showFilterButton ? (
            <Button
              onPress={() => setHideDisabled(!hideDisabled)}
              className="border rounded border-gray-300 overflow-hidden py-1 px-3 self-stretch"
            >
              <FilterOnOffIcon enabled={!hideDisabled} />
            </Button>
          ) : null}

          <LayoutSwitcher
            isListView={isListView}
            setIsListView={setIsListView}
          />
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
