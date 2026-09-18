import "../mdx-plugins.css";
import { Extension, type Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFLogo } from "../icons/IIIFPluginLogos";
import {
  isNotebookUrl,
  resourceNode,
  type NotebookResource,
} from "../notebook/resources";
import { notebookSelection } from "../notebook/selection";
import type { OutputTarget, SelectedItem } from "../stores/output-store";
import type { Vault } from "@iiif/helpers";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iiifLink: {
      insertIIIFLink: (resource: NotebookResource) => ReturnType;
      openIIIFLink: () => ReturnType;
    };
  }
  interface Storage {
    iiifLink: { open: boolean };
  }
}
/** Inserts ordinary labelled links, or notebook links when its node is installed. */
export const IIIFLink = Extension.create<
  { browserProps?: IIIFBrowserProps },
  { open: boolean }
>({
  name: "iiifLink",
  addOptions: () => ({}),
  addStorage: () => ({ open: false }),
  addCommands() {
    return {
      openIIIFLink:
        () =>
        ({ tr, dispatch }) => {
          if (!this.editor.isEditable) return false;
          if (dispatch) {
            this.storage.open = true;
            tr.setMeta("iiif-link-dialog", true);
          }
          return true;
        },
      insertIIIFLink:
        (resource) =>
        ({ commands }) => {
          if (
            !this.editor.isEditable ||
            (!isNotebookUrl(resource.source) &&
              resource.type !== "ContentState")
          )
            return false;
          const href = isNotebookUrl(resource.source)
            ? resource.source
            : `https://theseusviewer.org/?iiif-content=${encodeURIComponent(resource.source)}`;
          return commands.insertContent(
            this.editor.schema.nodes.notebookResource
              ? resourceNode(resource.source, resource)
              : {
                  type: "text",
                  text: resource.label,
                  marks: [{ type: "link", attrs: { href } }],
                },
          );
        },
    };
  },
});
export function InsertIIIFLink({
  editor,
  browserProps: input,
  children,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  editor: Editor | null;
  browserProps?: IIIFBrowserProps;
}) {
  const request = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      open: editor?.storage.iiifLink?.open,
      editable: editor?.isEditable,
    }),
  });
  const close = () => {
    request.current++;
    setBusy(false);
    if (editor && !editor.isDestroyed) {
      editor.storage.iiifLink.open = false;
      editor.view.dispatch(editor.state.tr.setMeta("iiif-link-dialog", true));
    }
  };
  useEffect(() => {
    if (!state?.editable && state?.open) close();
  }, [state?.editable, state?.open]);
  if (!editor) return null;
  const browserProps =
    input ??
    editor.extensionManager.extensions.find(
      (extension) => extension.name === "iiifLink",
    )?.options.browserProps ??
    {};
  const choose = (mode: "link" | "image" | "crop"): OutputTarget["format"] => ({
    type: "custom",
    format: (resource, _parent, vault) => ({ resource, vault, mode }),
  });
  const insert = async ({
    resource,
    vault,
    mode,
  }: {
    resource: SelectedItem;
    vault: Vault;
    mode: "link" | "image" | "crop";
  }) => {
    const token = ++request.current;
    setBusy(true);
    setError("");
    try {
      if (Array.isArray(resource)) throw new Error("Select one resource");
      const link = await notebookSelection(resource, vault, mode);
      if (
        token === request.current &&
        !editor.isDestroyed &&
        editor.isEditable &&
        editor.storage.iiifLink.open &&
        editor.chain().focus().insertIIIFLink(link).run()
      )
        close();
    } catch (reason) {
      if (token === request.current)
        setError(
          reason instanceof Error ? reason.message : "Could not insert link",
        );
    } finally {
      if (token === request.current) setBusy(false);
    }
  };
  const output: OutputTarget[] = [
    {
      type: "callback",
      label: "Insert crop",
      supportedTypes: ["CanvasRegion", "ImageServiceRegion"],
      format: choose("crop"),
      cb: insert,
    },
    {
      type: "callback",
      label: "Insert link",
      supportedTypes: ["Collection", "Manifest", "Canvas", "ImageService"],
      format: choose("link"),
      cb: insert,
    },
    {
      type: "callback",
      label: "Insert image service",
      supportedTypes: ["Canvas"],
      format: choose("image"),
      cb: insert,
    },
  ];
  return (
    <>
      <button
        type="button"
        aria-label="Insert IIIF link"
        title="Insert IIIF link"
        {...props}
        disabled={!(state?.editable ?? editor.isEditable) || props.disabled}
        onClick={() => {
          setError("");
          editor.commands.openIIIFLink();
        }}
      >
        {children ?? <IIIFLogo />}
      </button>
      <ModalOverlay
        isOpen={!!state?.open && !!state?.editable}
        isDismissable
        onOpenChange={(open) => {
          if (!open) close();
        }}
        className="iiif-browser-mdx-overlay"
      >
        <Modal className="iiif-browser-mdx-modal">
          <Dialog
            aria-label="Insert IIIF link"
            className="iiif-browser-mdx-dialog"
          >
            <header className="iiif-browser-mdx-header">
              <Heading slot="title" className="iiif-browser-mdx-title">
                Insert IIIF link
              </Heading>
              <button
                type="button"
                className="iiif-browser-mdx-close"
                aria-label="Close link picker"
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
            {busy && (
              <p role="status" className="iiif-browser-mdx-alert">
                Preparing link…
              </p>
            )}
            <div
              className="iiif-browser-mdx-browser iiif-browser"
              style={busy ? { pointerEvents: "none", opacity: 0.7 } : undefined}
            >
              <IIIFBrowser
                {...browserProps}
                navigation={{
                  ...browserProps.navigation,
                  multiSelect: false,
                  canCropImage: true,
                }}
                className={
                  browserProps.className ??
                  "h-full w-full border-none rounded-none"
                }
                output={output}
              />
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
