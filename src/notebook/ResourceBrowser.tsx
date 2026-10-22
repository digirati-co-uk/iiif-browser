import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import type { OutputTarget } from "../stores/output-store";
import { notebookSelection } from "./selection";
import { contentStateFormat } from "../formats/content-state";
import { notebookResourceHistory } from "./navigation";
import { isNotebookUrl, type NotebookResource } from "./resources";

export const notebookBrowserOutputs: OutputTarget[] = [
  {
    type: "clipboard",
    label: "Copy to clipboard",
    supportedTypes: [
      "Collection",
      "Manifest",
      "Canvas",
      "CanvasRegion",
      "ImageService",
      "ImageServiceRegion",
    ],
    format: {
      type: "custom",
      format: (resource, _parent, vault) =>
        resource.type === "ImageService" && resource.selector
          ? notebookSelection(resource, vault, "crop").then(
              (link) => link.source,
            )
          : resource.type === "Canvas" && resource.selector
            ? contentStateFormat.format(
                resource as any,
                { type: "content-state" },
                vault,
              )
            : resource.id,
    },
  },
  {
    type: "open-new-window",
    label: "Open in Theseus",
    supportedTypes: [
      "Collection",
      "Manifest",
      "Canvas",
      "CanvasRegion",
      "ImageService",
    ],
    format: {
      type: "custom",
      format: (resource, _parent, vault) =>
        resource.type.startsWith("ImageService")
          ? encodeURIComponent(resource.id)
          : contentStateFormat.format(
              resource as any,
              { type: "content-state", encoded: true },
              vault,
            ),
    },
    urlPattern: "https://theseusviewer.org/?iiif-content={RESULT}",
  },
];
/** A controlled modal; onOpenResource on the notebook may replace it entirely. */
export function NotebookResourceBrowser({
  resource,
  onClose,
  browserProps = {},
}: {
  resource: NotebookResource | null;
  onClose(): void;
  browserProps?: IIIFBrowserProps;
}) {
  return (
    <ModalOverlay
      isOpen={!!resource}
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="iiif-browser-mdx-overlay"
    >
      <Modal className="iiif-browser-mdx-modal">
        <Dialog
          aria-label="Notebook browser"
          className="iiif-browser-mdx-dialog"
        >
          <header className="iiif-browser-mdx-header">
            <Heading slot="title" className="iiif-browser-mdx-title">
              {resource?.label}
            </Heading>
            <button
              type="button"
              className="iiif-browser-mdx-close"
              aria-label="Close browser"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <div className="iiif-browser-mdx-browser iiif-browser">
            {resource &&
              (resource.type === "Image" ? (
                <a href={resource.source} target="_blank" rel="noreferrer">
                  <img
                    src={
                      isNotebookUrl(resource.image) ? resource.image : undefined
                    }
                    alt={resource.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </a>
              ) : (
                <IIIFBrowser
                  key={resource.source}
                  {...browserProps}
                  className={
                    browserProps.className ??
                    "h-full w-full border-none rounded-none"
                  }
                  output={browserProps.output ?? notebookBrowserOutputs}
                  history={{
                    ...browserProps.history,
                    ...notebookResourceHistory(resource),
                    saveToLocalStorage:
                      browserProps.history?.saveToLocalStorage ?? false,
                  }}
                />
              ))}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
