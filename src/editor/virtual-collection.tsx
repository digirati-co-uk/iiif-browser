import { useId, useState } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { VaultProvider } from "react-iiif-vault";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFCollection } from "../mdxeditor-snippet/components";
import { resourceLabel, type Selection } from "./image-options";

export interface VirtualCollectionItem {
  id: string;
  type: "Collection" | "Manifest";
  label: string;
}

export interface IIIFVirtualCollectionAttributes {
  title: string;
  /** JSON-encoded resource references; stored directly in the document. */
  items: string;
  width?: number;
  height?: number;
}

export interface IIIFVirtualCollectionOptions {
  browserProps?: Omit<IIIFBrowserProps, "output">;
  defaultSize?: { width?: number; height?: number };
}

export function parseVirtualCollectionItems(
  value: string,
): VirtualCollectionItem[] {
  const items: unknown = JSON.parse(value);
  if (
    !Array.isArray(items) ||
    items.some((item) => {
      if (
        !item ||
        typeof item.id !== "string" ||
        typeof item.label !== "string" ||
        (item.type !== "Collection" && item.type !== "Manifest")
      )
        return true;
      try {
        return !["http:", "https:"].includes(new URL(item.id).protocol);
      } catch {
        return true;
      }
    })
  )
    throw new Error("Invalid virtual collection items.");
  return items;
}

/** Published MDX component and shared editor preview. No remote collection is created. */
export function IIIFVirtualCollection({
  title = "Untitled collection",
  items = "[]",
  width = 640,
  height = 420,
  onChange,
  browserProps = {},
}: Partial<IIIFVirtualCollectionAttributes> &
  IIIFVirtualCollectionOptions & {
    onChange?: (attributes: Partial<IIIFVirtualCollectionAttributes>) => void;
  }) {
  const id = `urn:iiif:virtual:${useId()}`;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  let resources: VirtualCollectionItem[];
  try {
    resources = parseVirtualCollectionItems(items);
  } catch (caught) {
    return <p role="alert">{(caught as Error).message}</p>;
  }
  const close = () => {
    setOpen(false);
    setError("");
  };
  return (
    <div className="iiif-virtual-collection">
      {onChange && (
        <div className="iiif-virtual-collection__controls">
          <label>
            Collection title{" "}
            <input
              value={title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </label>
          <button type="button" onClick={() => setOpen(true)}>
            Add collection or manifest
          </button>
        </div>
      )}
      <VaultProvider>
        <IIIFCollection
          collectionId={id}
          collection={{
            id,
            label: { none: [title] },
            items: resources.map((item) => ({
              id: item.id,
              type: item.type,
              label: { none: [item.label] },
            })),
          }}
          width={width}
          height={height}
          resizable={!!onChange}
          onSizeChange={(width, height) => onChange?.({ width, height })}
        />
      </VaultProvider>
      <ModalOverlay
        isOpen={open && !!onChange}
        isDismissable
        onOpenChange={(next) => {
          if (!next) close();
        }}
        className="iiif-browser-mdx-overlay"
      >
        <Modal className="iiif-browser-mdx-modal">
          <Dialog className="iiif-browser-mdx-dialog">
            <header className="iiif-browser-mdx-header">
              <Heading slot="title" className="iiif-browser-mdx-title">
                Add to collection
              </Heading>
              <button
                type="button"
                className="iiif-browser-mdx-close"
                aria-label="Close"
                onClick={close}
              >
                ×
              </button>
            </header>
            {error && (
              <p role="alert" className="iiif-browser-mdx-alert">
                {error}
              </p>
            )}
            <div className="iiif-browser-mdx-browser iiif-browser">
              <IIIFBrowser
                {...browserProps}
                className={
                  browserProps.className ??
                  "h-full w-full border-none border-t rounded-none"
                }
                navigation={{
                  ...browserProps.navigation,
                  multiSelect: false,
                  canCropImage: false,
                }}
                output={
                  [
                    {
                      type: "callback",
                      label: "Add to collection",
                      supportedTypes: ["Collection", "Manifest"],
                      format: {
                        type: "custom",
                        format: (
                          resource: Selection["resource"],
                          _parent: unknown,
                          vault: Selection["vault"],
                        ) => ({ resource, vault }),
                      },
                      cb: ({ resource, vault }: Selection) => {
                        if (!onChange) return;
                        try {
                          if (Array.isArray(resource))
                            throw new Error(
                              "Select one collection or manifest.",
                            );
                          const item = {
                            id: resource.id,
                            type: resource.type,
                            label: resourceLabel(resource, vault),
                          };
                          const next = parseVirtualCollectionItems(
                            JSON.stringify([item]),
                          );
                          if (
                            !resources.some(
                              (existing) => existing.id === item.id,
                            )
                          ) {
                            onChange({
                              items: JSON.stringify([...resources, ...next]),
                            });
                          }
                          close();
                        } catch (caught) {
                          setError(
                            caught instanceof Error
                              ? caught.message
                              : "Could not add resource.",
                          );
                        }
                      },
                    },
                  ] as any
                }
              />
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
