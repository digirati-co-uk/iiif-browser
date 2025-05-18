import { Button, GridList } from "react-aria-components";
import { CanvasContext, LocaleString, useManifest } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import invariant from "tiny-invariant";
import { LayoutSwitcher } from "../components/LayoutSwitcher";
import { useLinkConfig, useSelectedActions } from "../context";
import { useDragBox } from "../hooks/use-drag-box";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { useLocalStorage } from "../utilities/use-local-storage";
import { CanvasGridSnippet } from "./CanvasGridSnippet";
import { CanvasListSnippet } from "./CanvasListSnippet";

export function ManifestItemList() {
  const manifest = useManifest();
  const config = useLinkConfig();
  const [items, actions] = usePaginateArray(manifest?.items || [], 48);
  const selectedActions = useSelectedActions();
  const [isListView, setIsListView] = useLocalStorage(
    "list-view-toggle-canvas",
    false,
  );
  const { containerProps, refs, selectionBox } = useDragBox({
    enabled: config.multiSelect,
    onSelection: (toUpdate, isShiftKeyPressed) => {
      const itemsToUpdate = toUpdate.map((key) => items[key]);
      if (isShiftKeyPressed) {
        for (const item of itemsToUpdate) {
          selectedActions.toggleItemSelection(item);
        }
      } else {
        selectedActions.replaceSelectedItems(itemsToUpdate);
      }
    },
  });

  invariant(manifest);

  return (
    <div className={twMerge("p-2 relative")} {...containerProps}>
      {selectionBox}
      <div ref={actions.topRef} />
      <LocaleString as="h1" className="text-2xl font-bold m-3 text-center">
        {manifest.label}
      </LocaleString>
      <LayoutSwitcher isListView={isListView} setIsListView={setIsListView} />

      {actions.totalPages > 1 ? (
        <div className="grid grid-cols-3 sticky left-0 right-0 top-2 mt-2 bg-white p-4 rounded-full items-center mb-4 shadow z-30">
          <Button
            className="text-blue-600 hover:underline disabled:text-gray-300 text-start focus:outline-none px-4"
            onPress={actions.prevPage}
            isDisabled={actions.currentPage === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <div
            className="text-center text-sm text-gray-400"
            aria-label="Page number"
          >
            Page {actions.currentPage} of {actions.totalPages}
          </div>
          <Button
            className="text-blue-600 hover:underline disabled:text-gray-300 text-end focus:outline-none px-4"
            onPress={actions.nextPage}
            isDisabled={actions.currentPage === actions.totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      ) : null}

      {isListView ? (
        <GridList selectionMode="multiple" layout="stack">
          {items.map((item) => (
            <CanvasContext key={item.id} canvas={item.id}>
              <CanvasListSnippet manifest={manifest} />
            </CanvasContext>
          ))}
        </GridList>
      ) : (
        <GridList
          ref={refs.gridList}
          className="grid grid-sm gap-0.5"
          selectionMode="multiple"
          layout="grid"
          items={items}
        >
          {(item) => (
            <CanvasContext key={item.id} canvas={item.id}>
              <CanvasGridSnippet manifest={manifest} />
            </CanvasContext>
          )}
        </GridList>
      )}
    </div>
  );
}
