import { Button, GridList, GridListItem } from "react-aria-components";
import { CanvasContext, LocaleString, useManifest } from "react-iiif-vault";
import invariant from "tiny-invariant";
import { CanvasThumbnailImage } from "../components/CanvasThumbnailImage";
import { LayoutSwitcher } from "../components/LayoutSwitcher";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { useLocalStorage } from "../utilities/use-local-storage";
import { CanvasGridSnippet } from "./CanvasGridSnippet";
import { CanvasListSnippet } from "./CanvasListSnippet";
import { CanvasSnippet } from "./CanvasSnippet";

export function ManifestItemList() {
  const manifest = useManifest();
  const [items, actions] = usePaginateArray(manifest?.items || [], 48);
  const [isListView, setIsListView] = useLocalStorage(
    "list-view-toggle-canvas",
    false,
  );

  invariant(manifest);

  return (
    <div className="p-2">
      <div ref={actions.topRef} />
      <LocaleString as="h1" className="text-2xl font-bold m-3 text-center">
        {manifest.label}
      </LocaleString>
      <LayoutSwitcher isListView={isListView} setIsListView={setIsListView} />

      {actions.totalPages > 1 ? (
        <div className="grid grid-cols-3 sticky left-0 right-0 top-2 bg-white p-4 rounded-full items-center mb-4 shadow z-20">
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
