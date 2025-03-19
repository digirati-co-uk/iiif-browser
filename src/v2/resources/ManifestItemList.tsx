import { Button } from "react-aria-components";
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

      {isListView ? (
        <div>
          {items.map((item) => (
            <CanvasContext key={item.id} canvas={item.id}>
              <CanvasListSnippet manifest={manifest} />
            </CanvasContext>
          ))}
        </div>
      ) : (
        <div className="grid grid-sm gap-0.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-md cursor-pointer hover:bg-slate-200 p-1 group aspect-square items-center"
            >
              <CanvasContext canvas={item.id}>
                <CanvasGridSnippet manifest={manifest} />
              </CanvasContext>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
