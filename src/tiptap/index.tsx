import "../mdx-plugins.css";
import { type Editor, mergeAttributes, Node } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import {
  dropBrowserHistory,
  type IIIFDropTarget,
  parseIIIFDrop,
} from "../editor/content-state";
import {
  type CanvasSnippetOptions,
  type Draft,
  type IIIFImageOptions,
  ImageOptions,
  imageService,
  initialEditorImageSize,
  loadImageInfo,
  resourceLabel,
  type Selection,
} from "../editor/image-options";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";
import {
  createIIIFRequest,
  getImageCapabilities,
  imageRequestUrl,
  imageServiceId,
  parseIIIFImageUrl,
  requestAtWidth,
} from "../mdxeditor/image-api";
import {
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
  IIIFSnippetProvider,
} from "../mdxeditor-snippet/components";

export type { IIIFDropTarget } from "../editor/content-state";
export type { IIIFImageOptions } from "../editor/image-options";

export interface IIIFImageAttributes {
  src: string;
  alt?: string;
  lockAspectRatio?: boolean;
  objectFit?: "contain" | "cover";
  width?: number | null;
  height?: number | null;
}
export interface IIIFSnippetAttributes {
  resourceType: "Collection" | "Manifest" | "Canvas";
  collectionId?: string | null;
  manifestId?: string | null;
  canvasId?: string | null;
  width?: number;
  height?: number;
  navigation?: "breadcrumbs" | "button";
}
interface BrowserOptions {
  browserProps?: Omit<IIIFBrowserProps, "output">;
}
export interface IIIFImageExtensionOptions extends BrowserOptions {
  image?: IIIFImageOptions;
  canvasSnippet?: boolean | CanvasSnippetOptions;
}
export interface IIIFSnippetExtensionOptions extends BrowserOptions {
  defaultSize?: { width?: number; height?: number };
  collectionNavigation?: "breadcrumbs" | "button";
}
type DialogState = {
  target?: IIIFDropTarget;
  position?: number;
  image?: IIIFImageAttributes;
  snippet?: IIIFSnippetAttributes;
};
interface DialogStorage {
  dialog: DialogState | null;
  mounted: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iiifImage: {
      insertIIIFImage: (attributes: IIIFImageAttributes) => ReturnType;
      openIIIFImage: (state?: DialogState) => ReturnType;
    };
    iiifSnippet: {
      insertIIIFSnippet: (attributes: IIIFSnippetAttributes) => ReturnType;
      openIIIFSnippet: (state?: DialogState) => ReturnType;
    };
  }
  interface Storage {
    iiifImage: DialogStorage;
    iiifSnippet: DialogStorage;
  }
}

function safeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
function validSnippet(attrs: IIIFSnippetAttributes) {
  return attrs.resourceType === "Collection"
    ? safeUrl(attrs.collectionId)
    : (attrs.resourceType === "Manifest" || attrs.resourceType === "Canvas") &&
        safeUrl(attrs.manifestId) &&
        (attrs.resourceType !== "Canvas" || safeUrl(attrs.canvasId));
}
function snippetAttributes(
  target: IIIFDropTarget,
  options: IIIFSnippetExtensionOptions,
): IIIFSnippetAttributes {
  return {
    resourceType: target.type,
    collectionId: target.type === "Collection" ? target.id : null,
    manifestId: target.type === "Manifest" ? target.id : target.parent?.id,
    canvasId: target.type === "Canvas" ? target.id : null,
    width: options.defaultSize?.width ?? 640,
    height: options.defaultSize?.height ?? 420,
    navigation: options.collectionNavigation ?? "breadcrumbs",
  };
}

/** Image API images, with the same browser and image options as MDXEditor. */
export const IIIFImage = Node.create<IIIFImageExtensionOptions, DialogStorage>({
  name: "iiifImage",
  group: "block",
  atom: true,
  draggable: true,
  addOptions: () => ({}),
  addStorage: () => ({ dialog: null, mounted: 0 }),
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      lockAspectRatio: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute("data-lock-aspect-ratio") !== "false",
        renderHTML: (attrs) => ({
          "data-lock-aspect-ratio": String(attrs.lockAspectRatio),
        }),
      },
      objectFit: {
        default: "contain",
        parseHTML: (element) =>
          element.getAttribute("data-object-fit") === "cover"
            ? "cover"
            : "contain",
        renderHTML: (attrs) => ({ "data-object-fit": attrs.objectFit }),
      },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "img[data-iiif-image]",
        getAttrs: (element) =>
          safeUrl(element.getAttribute("src")) ? null : false,
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-iiif-image": "true",
        style: `max-width:100%;${node.attrs.lockAspectRatio ? "height:auto;" : ""}object-fit:${node.attrs.objectFit === "cover" ? "cover" : "contain"}`,
      }),
    ];
  },
  addCommands() {
    return {
      insertIIIFImage:
        (attrs) =>
        ({ commands }) =>
          this.editor.isEditable &&
          safeUrl(attrs.src) &&
          commands.insertContent({ type: this.name, attrs }),
      openIIIFImage:
        (state = {}) =>
        ({ tr, dispatch }) => {
          if (!this.editor.isEditable) return false;
          if (dispatch) {
            this.storage.dialog = state;
            tr.setMeta("iiif-dialog", true);
          }
          return true;
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop: (view, event, _slice, moved) => {
            if (moved || !this.editor.isEditable || !this.storage.mounted)
              return false;
            const targets = parseIIIFDrop(
              event.dataTransfer?.getData("text/plain") ?? "",
            );
            if (targets?.length !== 1) return false;
            const position = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })?.pos;
            return this.editor.commands.openIIIFImage({
              target: targets[0],
              position,
            });
          },
        },
      }),
    ];
  },
});

/** Interactive Collection, Manifest and Canvas blocks. */
export const IIIFSnippet = Node.create<
  IIIFSnippetExtensionOptions,
  DialogStorage
>({
  name: "iiifSnippet",
  group: "block",
  atom: true,
  draggable: true,
  // Prefer snippets when both extensions receive a Content State drop.
  priority: 110,
  addOptions: () => ({}),
  addStorage: () => ({ dialog: null, mounted: 0 }),
  addAttributes() {
    const defaults = {
      resourceType: "Manifest",
      collectionId: null,
      manifestId: null,
      canvasId: null,
      width: this.options.defaultSize?.width ?? 640,
      height: this.options.defaultSize?.height ?? 420,
      navigation: this.options.collectionNavigation ?? "breadcrumbs",
    };
    return Object.fromEntries(
      Object.entries(defaults).map(([name, value]) => [
        name,
        {
          default: value,
          parseHTML: (element: HTMLElement) => {
            const attr = element.getAttribute(`data-${name.toLowerCase()}`);
            return typeof value === "number"
              ? Number(attr) > 0
                ? Number(attr)
                : value
              : (attr ?? value);
          },
          renderHTML: (attributes: Record<string, unknown>) => ({
            [`data-${name.toLowerCase()}`]: attributes[name],
          }),
        },
      ]),
    );
  },
  parseHTML() {
    return [
      {
        tag: "div[data-iiif-snippet]",
        getAttrs: (element) =>
          validSnippet({
            resourceType: element.getAttribute(
              "data-resourcetype",
            ) as IIIFSnippetAttributes["resourceType"],
            collectionId: element.getAttribute("data-collectionid"),
            manifestId: element.getAttribute("data-manifestid"),
            canvasId: element.getAttribute("data-canvasid"),
          })
            ? null
            : false,
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const id = node.attrs.collectionId || node.attrs.manifestId;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-iiif-snippet": "true" }),
      [
        "a",
        { href: safeUrl(id) ? id : undefined },
        `IIIF ${node.attrs.resourceType}`,
      ],
    ];
  },
  addCommands() {
    return {
      insertIIIFSnippet:
        (attrs) =>
        ({ commands }) =>
          this.editor.isEditable &&
          validSnippet(attrs) &&
          commands.insertContent({ type: this.name, attrs }),
      openIIIFSnippet:
        (state = {}) =>
        ({ tr, dispatch }) => {
          if (!this.editor.isEditable) return false;
          if (dispatch) {
            this.storage.dialog = state;
            tr.setMeta("iiif-dialog", true);
          }
          return true;
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(SnippetView);
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop: (view, event, _slice, moved) => {
            if (moved || !this.editor.isEditable) return false;
            const targets = parseIIIFDrop(
              event.dataTransfer?.getData("text/plain") ?? "",
            );
            if (!targets) return false;
            const position =
              view.posAtCoords({ left: event.clientX, top: event.clientY })
                ?.pos ?? view.state.selection.from;
            return this.editor.commands.insertContentAt(
              position,
              targets.map((target) => ({
                type: this.name,
                attrs: snippetAttributes(target, this.options),
              })),
            );
          },
        },
      }),
    ];
  },
});

function ImageView({
  node,
  editor,
  getPos,
  selected,
  updateAttributes,
  extension,
}: NodeViewProps) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable,
  });
  const [cache] = useState(() => new Map());
  const [resizeError, setResizeError] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const options = extension.options as IIIFImageExtensionOptions;
  const resize = async (width: number, height: number) => {
    if (
      !editor.isEditable ||
      (width === node.attrs.width && height === node.attrs.height)
    )
      return;
    updateAttributes({ width, height });
    const request = parseIIIFImageUrl(node.attrs.src);
    const multiplier = options.image?.resizeMultiplier ?? 2;
    if (!request || multiplier === false) return;
    try {
      const info = await loadImageInfo(
        cache,
        imageServiceId(request),
        options.browserProps?.history?.requestInitOptions,
      );
      const capabilities = getImageCapabilities(info, request.region);
      const pos = getPos();
      if (
        !editor.isDestroyed &&
        editor.isEditable &&
        pos !== undefined &&
        editor.state.doc.nodeAt(pos)?.attrs.src === node.attrs.src &&
        editor.state.doc.nodeAt(pos)?.attrs.width === width &&
        editor.state.doc.nodeAt(pos)?.attrs.height === height &&
        capabilities.customSize
      ) {
        updateAttributes({
          src: imageRequestUrl(
            requestAtWidth(
              request,
              width * (multiplier > 0 ? multiplier : 2),
              capabilities,
            ),
            info,
          ),
        });
      }
      setResizeError("");
    } catch {
      setResizeError(
        "Display size saved; the Image API request could not be resized.",
      );
    }
  };
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let width =
      node.attrs.width == null ? "fit-content" : `${node.attrs.width}px`;
    let height =
      node.attrs.lockAspectRatio || node.attrs.height == null
        ? "auto"
        : `${node.attrs.height}px`;
    const finishResize = () => {
      if (
        !editor.isEditable ||
        (frame.style.width === width && frame.style.height === height)
      )
        return;
      width = frame.style.width;
      height = frame.style.height;
      const bounds = frame.getBoundingClientRect();
      void resize(Math.round(bounds.width), Math.round(bounds.height));
    };
    // Native CSS resize can release outside the element without a React pointerup.
    window.addEventListener("pointerup", finishResize, true);
    window.addEventListener("mouseup", finishResize, true);
    return () => {
      window.removeEventListener("pointerup", finishResize, true);
      window.removeEventListener("mouseup", finishResize, true);
    };
  });
  return (
    <NodeViewWrapper
      contentEditable={false}
      style={{
        position: "relative",
        width: "fit-content",
        maxWidth: "100%",
        outline: selected ? "2px solid #2563eb" : undefined,
      }}
    >
      <div
        style={{
          width: node.attrs.width ?? "fit-content",
          height: node.attrs.lockAspectRatio
            ? "auto"
            : (node.attrs.height ?? "auto"),
          maxWidth: "100%",
          overflow: "hidden",
          resize: editable
            ? node.attrs.lockAspectRatio
              ? "horizontal"
              : "both"
            : "none",
        }}
        ref={frameRef}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt ?? ""}
          width={node.attrs.width ?? undefined}
          height={node.attrs.height ?? undefined}
          style={{
            display: "block",
            width: "100%",
            height: node.attrs.lockAspectRatio ? "auto" : "100%",
            objectFit: node.attrs.objectFit === "cover" ? "cover" : "contain",
          }}
        />
      </div>
      {resizeError && <p role="alert">{resizeError}</p>}
      {editable && (
        <button
          type="button"
          className="iiif-editor-edit"
          onClick={() =>
            editor.commands.openIIIFImage({
              image: node.attrs as IIIFImageAttributes,
              position: getPos(),
            })
          }
        >
          Edit IIIF image
        </button>
      )}
    </NodeViewWrapper>
  );
}
function SnippetView({
  node,
  editor,
  updateAttributes,
  getPos,
}: NodeViewProps) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable,
  });
  const attrs = node.attrs as IIIFSnippetAttributes;
  const common = {
    width: attrs.width,
    height: attrs.height,
    resizable: editable,
    onSizeChange: (width: number, height: number) => {
      if (editor.isEditable) updateAttributes({ width, height });
    },
  };
  return (
    <NodeViewWrapper contentEditable={false}>
      <IIIFSnippetProvider
        collectionId={attrs.collectionId ?? undefined}
        manifestId={attrs.manifestId ?? undefined}
        canvasId={attrs.canvasId ?? undefined}
      >
        {attrs.resourceType === "Collection" ? (
          <IIIFCollection
            collectionId={attrs.collectionId!}
            navigation={attrs.navigation}
            {...common}
          />
        ) : attrs.resourceType === "Canvas" ? (
          <IIIFCanvas
            manifestId={attrs.manifestId!}
            canvasId={attrs.canvasId!}
            {...common}
          />
        ) : (
          <IIIFManifest manifestId={attrs.manifestId!} {...common} />
        )}
      </IIIFSnippetProvider>
      {editable && (
        <button
          type="button"
          className="iiif-editor-edit"
          onClick={() =>
            editor.commands.openIIIFSnippet({
              position: getPos(),
              snippet: attrs,
              target: {
                type: attrs.resourceType,
                id: (attrs.collectionId || attrs.canvasId || attrs.manifestId)!,
                ...(attrs.resourceType === "Canvas"
                  ? {
                      parent: {
                        id: attrs.manifestId!,
                        type: "Manifest" as const,
                      },
                    }
                  : {}),
              },
            })
          }
        >
          Edit IIIF snippet
        </button>
      )}
    </NodeViewWrapper>
  );
}

/** Mount once alongside EditorContent (the insertion buttons include it). */
export function IIIFImageDialog({ editor }: { editor: Editor }) {
  return <BrowserDialog editor={editor} kind="iiifImage" />;
}
export function IIIFSnippetDialog({ editor }: { editor: Editor }) {
  return <BrowserDialog editor={editor} kind="iiifSnippet" />;
}
type InsertProps = Omit<ComponentProps<"button">, "onClick"> & {
  editor: Editor | null;
};
export function InsertIIIFImage({ editor, children, ...props }: InsertProps) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isEditable ?? false,
  });
  return (
    <>
      <button
        type="button"
        aria-label="Insert IIIF image"
        {...props}
        disabled={!editable || props.disabled}
        onClick={() => editor?.commands.openIIIFImage()}
      >
        {children ?? <IIIFPluginLogo icon="stack" />}
      </button>
      {editor && <IIIFImageDialog editor={editor} />}
    </>
  );
}
export function InsertIIIFSnippet({ editor, children, ...props }: InsertProps) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isEditable ?? false,
  });
  return (
    <>
      <button
        type="button"
        aria-label="Insert IIIF snippet"
        {...props}
        disabled={!editable || props.disabled}
        onClick={() => editor?.commands.openIIIFSnippet()}
      >
        {children ?? <IIIFPluginLogo icon="add" />}
      </button>
      {editor && <IIIFSnippetDialog editor={editor} />}
    </>
  );
}

function BrowserDialog({
  editor,
  kind,
}: {
  editor: Editor;
  kind: "iiifImage" | "iiifSnippet";
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      dialog: editor.storage[kind].dialog,
      editable: editor.isEditable,
    }),
  });
  const options = editor.extensionManager.extensions.find(
    (extension) => extension.name === kind,
  )!.options as IIIFImageExtensionOptions & IIIFSnippetExtensionOptions;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState({
    lockAspectRatio: true,
    objectFit: "contain" as "contain" | "cover",
  });
  const [error, setError] = useState("");
  const [cache] = useState(() => new Map());
  useEffect(() => {
    editor.storage[kind].mounted++;
    return () => {
      editor.storage[kind].mounted--;
    };
  }, [editor, kind]);
  useEffect(() => {
    const image = state.dialog?.image;
    const request = image && parseIIIFImageUrl(image.src);
    setLayout({
      lockAspectRatio: image?.lockAspectRatio ?? true,
      objectFit: image?.objectFit ?? "contain",
    });
    setDraft(request ? { request, label: image?.alt ?? "" } : null);
    setError("");
  }, [state.dialog]);
  const close = () => {
    editor.storage[kind].dialog = null;
    editor.view.dispatch(editor.state.tr.setMeta("iiif-dialog", true));
  };
  useEffect(() => {
    if (!state.editable && editor.storage[kind].dialog) {
      editor.storage[kind].dialog = null;
      editor.view.dispatch(editor.state.tr.setMeta("iiif-dialog", true));
    }
  }, [editor, kind, state.editable]);
  const save = (src: string, caption = false) => {
    if (!editor.isEditable || !state.dialog || !draft) return;
    const attrs = { ...state.dialog.image, ...layout, src, alt: draft.label };
    const pos = state.dialog.position;
    if (state.dialog.image && pos !== undefined) {
      if (
        editor.state.doc.nodeAt(pos)?.type.name !== "iiifImage" ||
        editor.state.doc.nodeAt(pos)?.attrs.src !== state.dialog.image.src
      ) {
        setError("The image is no longer at this position. Reopen its editor.");
        return;
      }
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(pos, undefined, attrs),
      );
    } else {
      const content = [
        { type: "iiifImage", attrs },
        ...(caption
          ? [
              {
                type: "paragraph",
                content: [{ type: "text", text: draft.label || "IIIF image" }],
              },
            ]
          : []),
      ];
      if (pos !== undefined) editor.commands.insertContentAt(pos, content);
      else editor.chain().focus().insertContent(content).run();
    }
    close();
  };
  const browserProps = options.browserProps ?? {};
  return (
    <ModalOverlay
      isOpen={!!state.dialog && state.editable}
      isDismissable
      onOpenChange={(open) => {
        if (!open) close();
      }}
      className="iiif-browser-mdx-overlay"
    >
      <Modal className="iiif-browser-mdx-modal">
        <Dialog className="iiif-browser-mdx-dialog">
          <header className="iiif-browser-mdx-header">
            {draft && !state.dialog?.image && (
              <button
                type="button"
                className="iiif-browser-mdx-back"
                onClick={() => setDraft(null)}
              >
                ← Back
              </button>
            )}
            <Heading slot="title" className="iiif-browser-mdx-title">
              {draft
                ? "Image options"
                : kind === "iiifImage"
                  ? "Insert IIIF image"
                  : state.dialog?.snippet
                    ? "Edit IIIF snippet"
                    : "Insert IIIF snippet"}
            </Heading>
            <button
              type="button"
              className="iiif-browser-mdx-close"
              onClick={close}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          {error && (
            <p role="alert" className="iiif-browser-mdx-alert">
              {error}
            </p>
          )}
          {draft ? (
            <ImageOptions
              key={imageServiceId(draft.request)}
              draft={draft}
              setDraft={setDraft}
              cache={cache}
              requestInit={browserProps.history?.requestInitOptions}
              onCancel={close}
              imageAction={{
                label: state.dialog?.image
                  ? "Save changes"
                  : (options.image?.actionLabel ?? "Insert image"),
                onClick: save,
              }}
              canvasAction={
                !state.dialog?.image && options.canvasSnippet
                  ? {
                      label:
                        options.canvasSnippet === true
                          ? "Insert Canvas snippet"
                          : (options.canvasSnippet.actionLabel ??
                            "Insert Canvas snippet"),
                      onClick: (src) => save(src, true),
                    }
                  : null
              }
            >
              <fieldset className="iiif-browser-mdx-fieldset">
                <legend>Display layout</legend>
                <label className="iiif-browser-mdx-toggle">
                  <input
                    type="checkbox"
                    checked={layout.lockAspectRatio}
                    onChange={(event) =>
                      setLayout({
                        ...layout,
                        lockAspectRatio: event.target.checked,
                      })
                    }
                  />{" "}
                  <span>Keep image aspect ratio</span>
                </label>
                {!layout.lockAspectRatio && (
                  <label className="iiif-browser-mdx-field">
                    <span>Image fit</span>
                    <select
                      value={layout.objectFit}
                      onChange={(event) =>
                        setLayout({
                          ...layout,
                          objectFit: event.target.value as "contain" | "cover",
                        })
                      }
                    >
                      <option value="contain">
                        Contain — show the whole image
                      </option>
                      <option value="cover">
                        Cover — fill the frame and crop
                      </option>
                    </select>
                  </label>
                )}
              </fieldset>
            </ImageOptions>
          ) : (
            <div className="iiif-browser-mdx-browser iiif-browser">
              <IIIFBrowser
                {...browserProps}
                history={
                  state.dialog?.target
                    ? {
                        ...browserProps.history,
                        ...dropBrowserHistory(state.dialog.target),
                      }
                    : browserProps.history
                }
                className={
                  browserProps.className ??
                  "h-full w-full border-none border-t rounded-none"
                }
                navigation={{
                  multiSelect: false,
                  canCropImage: kind === "iiifImage",
                  ...browserProps.navigation,
                }}
                output={
                  [
                    {
                      type: "callback",
                      label:
                        kind === "iiifImage"
                          ? (options.image?.selectLabel ?? "Continue")
                          : state.dialog?.snippet
                            ? "Save changes"
                            : "Insert snippet",
                      supportedTypes:
                        kind === "iiifImage"
                          ? [
                              "Canvas",
                              "CanvasRegion",
                              "ImageService",
                              "ImageServiceRegion",
                            ]
                          : ["Collection", "Manifest", "Canvas"],
                      format: {
                        type: "custom",
                        format: (
                          resource: Selection["resource"],
                          _parent: unknown,
                          vault: Selection["vault"],
                        ) => ({ resource, vault }),
                      },
                      cb: ({ resource, vault }: Selection) => {
                        try {
                          if (Array.isArray(resource))
                            throw new Error("Select one IIIF resource");
                          if (kind === "iiifSnippet") {
                            const attrs = snippetAttributes(
                              resource as IIIFDropTarget,
                              options,
                            );
                            if (!validSnippet(attrs))
                              throw new Error(
                                "The selected resource needs a parent Manifest.",
                              );
                            if (
                              state.dialog?.snippet &&
                              state.dialog.position !== undefined
                            ) {
                              const pos = state.dialog.position;
                              const current = editor.state.doc.nodeAt(pos);
                              if (
                                !editor.isEditable ||
                                current?.type.name !== "iiifSnippet"
                              )
                                throw new Error(
                                  "The snippet is no longer available. Reopen its editor.",
                                );
                              editor.view.dispatch(
                                editor.state.tr.setNodeMarkup(pos, undefined, {
                                  ...attrs,
                                  width: current.attrs.width,
                                  height: current.attrs.height,
                                  navigation: current.attrs.navigation,
                                }),
                              );
                            } else if (
                              !editor
                                .chain()
                                .focus()
                                .insertIIIFSnippet(attrs)
                                .run()
                            )
                              return;
                            close();
                          } else {
                            const service = imageService(resource, vault);
                            const spatial =
                              resource.imageSelector?.spatial ??
                              resource.selector?.spatial;
                            setDraft({
                              request: createIIIFRequest(
                                service.id,
                                service.version,
                                spatial
                                  ? {
                                      x: Math.round(spatial.x),
                                      y: Math.round(spatial.y),
                                      w: Math.round(spatial.width),
                                      h: Math.round(spatial.height),
                                    }
                                  : { full: true },
                                {
                                  ...options.image,
                                  ...initialEditorImageSize(
                                    options.image ?? {},
                                    editor.view.dom,
                                  ),
                                  rotation:
                                    resource.rotation ??
                                    options.image?.rotation,
                                },
                              ),
                              label: resourceLabel(resource, vault),
                              autoSize:
                                !options.image?.width && !options.image?.height,
                            });
                          }
                        } catch (error) {
                          setError(
                            error instanceof Error
                              ? error.message
                              : "Could not insert IIIF content",
                          );
                        }
                      },
                    },
                  ] as any
                }
              />
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export type {
  IIIFVirtualCollectionAttributes,
  IIIFVirtualCollectionOptions,
} from "./virtual-collection";
export {
  IIIFVirtualCollection,
  InsertIIIFVirtualCollection,
} from "./virtual-collection";
