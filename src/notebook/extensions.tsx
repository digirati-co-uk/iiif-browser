import {
  Extension,
  Node,
  mergeAttributes,
  type Editor,
  type Extensions,
  type JSONContent,
} from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Plugin } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Popover } from "react-aria-components";
import { IIIFLogo } from "../icons/IIIFPluginLogos";
import { CloseIcon } from "../icons/CloseIcon";
import type { IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFImage, IIIFSnippet, IIIFVirtualCollection } from "../tiptap";
import { IIIFLink } from "../tiptap/link";
import { enrichNotebookCrops } from "./crops";
import { NotebookImageSize } from "./ImageSize";
import { parseIIIFImageUrl } from "../mdxeditor/image-api";
import {
  isNotebookUrl,
  notebookPaste,
  resolveNotebookResource,
  enrichNotebookCollection,
  type NotebookResource,
} from "./resources";
import type { NotebookNote, NotebookStore } from "./store";

export interface NotebookActionContext {
  resource: NotebookResource;
  note: NotebookNote;
  notebook: NotebookStore;
  editor: Editor;
  projectId?: string;
  location: "tooltip" | "inline";
  readOnly: boolean;
  isTask: boolean;
  checked: boolean;
  /** Re-finds this node's task at call time; false if deleted or read-only. */
  setChecked(checked?: boolean): boolean;
  open(): void;
}
export interface NotebookAction {
  id: string;
  label: string;
  types?: NotebookResource["type"][];
  isVisible?(context: NotebookActionContext): boolean;
  disabled?(context: NotebookActionContext): boolean;
  run(context: NotebookActionContext): void | Promise<void>;
}
export interface NotebookEditorOptions {
  browserProps?: IIIFBrowserProps;
  actions?: NotebookAction[];
  /** Display developer actions inside resource links as well as previews. */
  inlineActions?: boolean;
  renderActions?(context: NotebookActionContext): ReactNode;
  wrapResource?(content: ReactNode, context: NotebookActionContext): ReactNode;
  onOpenResource?(resource: NotebookResource): void;
  resolveResource?(
    source: string,
    signal: AbortSignal,
  ): Promise<NotebookResource | null>;
  extensions?: Extensions;
}
export const NotebookEditorContext = createContext<
  | (NotebookEditorOptions & { notebook: NotebookStore; note: NotebookNote })
  | null
>(null);

/** Locate task by live node position, never by the user's current selection. */
export function setNotebookTaskChecked(
  editor: Editor,
  position: number | undefined,
  checked = true,
): boolean {
  if (
    !editor.isEditable ||
    editor.isDestroyed ||
    position === undefined ||
    position > editor.state.doc.content.size
  )
    return false;
  const resolved = editor.state.doc.resolve(position);
  for (let depth = resolved.depth; depth > 0; depth--) {
    const node = resolved.node(depth);
    if (node.type.name === "taskItem") {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(resolved.before(depth), undefined, {
          ...node.attrs,
          checked,
        }),
      );
      return true;
    }
  }
  return false;
}
export const NotebookResourceLink = Node.create({
  name: "notebookResource",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      href: { default: "" },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-label"),
        renderHTML: (attrs) =>
          attrs.label == null ? {} : { "data-link-label": attrs.label },
      },
      loadOnPaste: {
        default: false,
        parseHTML: (element) => element.hasAttribute("data-load-on-paste"),
        renderHTML: (attrs) =>
          attrs.loadOnPaste ? { "data-load-on-paste": "" } : {},
      },
      metadataLoaded: {
        default: false,
        parseHTML: (element) => element.hasAttribute("data-metadata-loaded"),
        renderHTML: (attrs) =>
          attrs.metadataLoaded ? { "data-metadata-loaded": "" } : {},
      },
      richContent: {
        default: null,
        parseHTML: (element) => {
          try {
            return JSON.parse(
              element.getAttribute("data-rich-content") || "null",
            );
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) =>
          attrs.richContent
            ? { "data-rich-content": JSON.stringify(attrs.richContent) }
            : {},
      },
      resource: {
        default: null,
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-resource") || "null");
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) => ({
          "data-resource": JSON.stringify(attrs.resource),
        }),
      },
    };
  },
  // Match before StarterKit’s ordinary link mark without changing schema ordering.
  parseHTML: () => [{ tag: "a[data-notebook-resource]", priority: 1100 }],
  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-notebook-resource": "true",
        href: isNotebookUrl(node.attrs.href) ? node.attrs.href : undefined,
      }),
      node.attrs.label ?? node.attrs.resource?.label ?? node.attrs.href,
    ];
  },
  renderText: ({ node }) =>
    node.attrs.label ?? node.attrs.resource?.label ?? node.attrs.href,
  addNodeView: () => ReactNodeViewRenderer(ResourceLinkView),
});
/** Rich resources contain the existing editable image/viewer nodes. */
export const NotebookResourceBlock = NotebookResourceLink.extend({
  name: "notebookResourceBlock",
  group: "block",
  inline: false,
  atom: false,
  content: "(iiifImage | iiifSnippet | notebookCrop)+",
  parseHTML: () => [{ tag: "div[data-notebook-resource]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-notebook-resource": "true" }),
    0,
  ],
});
const NotebookCrop = Node.create({
  name: "notebookCrop",
  group: "block",
  atom: true,
  addAttributes: () => ({
    src: { default: "" },
    alt: { default: "" },
    xywh: { default: "" },
  }),
  parseHTML: () => [
    {
      tag: "img[data-notebook-crop]",
      getAttrs: (element) =>
        isNotebookUrl(element.getAttribute("src")) ? null : false,
    },
  ],
  renderHTML: ({ HTMLAttributes }) => [
    "img",
    mergeAttributes(HTMLAttributes, { "data-notebook-crop": "true" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(CropView),
});
function CropView({ node, editor, getPos }: NodeViewProps) {
  const context = useContext(NotebookEditorContext);
  const open = () => {
    const position = getPos();
    if (position === undefined) return;
    const at = editor.state.doc.resolve(position);
    const resource = at.parent.attrs.resource as NotebookResource | undefined;
    if (resource) context?.onOpenResource?.(resource);
  };
  return (
    <NodeViewWrapper contentEditable={false} className="iiif-notebook__crop">
      <button
        type="button"
        aria-label={`Open crop: ${node.attrs.alt}`}
        onClick={open}
      >
        <img
          src={isNotebookUrl(node.attrs.src) ? node.attrs.src : undefined}
          alt={node.attrs.alt}
        />
      </button>
      <span>
        Crop · {String(node.attrs.xywh).split(",").slice(2).join(" × ")}
        {String(node.attrs.xywh).startsWith("pct:") ? "%" : " px"}
      </span>
    </NodeViewWrapper>
  );
}
function resourceWidgets(resource: NotebookResource): JSONContent[] {
  const targets =
    resource.type === "ContentState" ? (resource.targets ?? []) : [resource];
  return targets.flatMap<JSONContent>((target) => {
    if (
      !target.xywh &&
      (target.type === "Collection" ||
        target.type === "Manifest" ||
        (target.type === "Canvas" && target.parent))
    ) {
      return [
        {
          type: "iiifSnippet",
          attrs: {
            resourceType: target.type,
            collectionId: target.type === "Collection" ? target.id : null,
            manifestId: target.parent?.id ?? target.id,
            canvasId: target.type === "Canvas" ? target.id : null,
            width: 640,
            height: 360,
          },
        },
      ];
    }
    if (
      resource.type === "ContentState" &&
      target.xywh &&
      isNotebookUrl(target.image)
    )
      return [
        {
          type: "notebookCrop",
          attrs: { src: target.image, alt: target.label, xywh: target.xywh },
        },
      ];
    const src = target.image || target.thumbnail;
    return isNotebookUrl(src)
      ? [{ type: "iiifImage", attrs: { src, alt: target.label, width: 480 } }]
      : [];
  });
}
/** Replace the representation in place; source metadata and enclosing tasks survive. */
export function setNotebookResourceView(
  editor: Editor,
  position: number | undefined,
  view: "text" | "rich",
): boolean {
  if (
    !editor.isEditable ||
    editor.isDestroyed ||
    position === undefined ||
    position < 0 ||
    position > editor.state.doc.content.size
  )
    return false;
  const node = editor.state.doc.nodeAt(position);
  if (
    !node ||
    !["notebookResource", "notebookResourceBlock"].includes(node.type.name)
  )
    return false;
  if ((node.type.name === "notebookResourceBlock") === (view === "rich"))
    return true;
  const saved = node.attrs.richContent;
  const content =
    Array.isArray(saved) &&
    saved.length &&
    saved.every((item) =>
      ["iiifImage", "iiifSnippet", "notebookCrop"].includes(item?.type),
    )
      ? saved
      : node.attrs.resource
        ? resourceWidgets(node.attrs.resource)
        : [];
  if (view === "rich" && !content.length) return false;
  const at = editor.state.doc.resolve(position);
  let from = position;
  let to = position + node.nodeSize;
  if (
    view === "rich" &&
    at.parent.type.name === "paragraph" &&
    at.parent.childCount === 1
  ) {
    from = at.before();
    to = at.after();
  } else if (
    view === "text" &&
    at.parent.type.name === "taskItem" &&
    at.index() === 1 &&
    at.nodeBefore?.type.name === "paragraph" &&
    at.nodeBefore.content.size === 0
  ) {
    // Remove the empty first paragraph required by TaskItem when it hosts a block.
    from -= at.nodeBefore.nodeSize;
  }
  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      closeHistory(tr);
      return true;
    })
    .insertContentAt(
      { from, to },
      view === "rich"
        ? {
            type: "notebookResourceBlock",
            attrs: { ...node.attrs, richContent: null },
            content,
          }
        : {
            type: "paragraph",
            content: [
              {
                type: "notebookResource",
                attrs: { ...node.attrs, richContent: node.content.toJSON() },
              },
            ],
          },
    )
    .run();
}
const NotebookTextAlign = Extension.create({
  name: "notebookTextAlign",
  addGlobalAttributes: () => [
    {
      types: ["heading", "paragraph"],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (element) =>
            ["left", "center", "right"].includes(element.style.textAlign)
              ? element.style.textAlign
              : null,
          renderHTML: (attrs) =>
            ["left", "center", "right"].includes(attrs.textAlign)
              ? { style: `text-align: ${attrs.textAlign}` }
              : {},
        },
      },
    },
  ],
});
export const NotebookPaste = Extension.create({
  name: "notebookPaste",
  priority: 120,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _old, state) => {
          if (
            !transactions.some((transaction) => transaction.docChanged) ||
            !this.editor.isEditable
          )
            return null;
          const tr = state.tr;
          const links: {
            from: number;
            to: number;
            href: string;
            label: string;
          }[] = [];
          state.doc.descendants((node, position) => {
            const link = node.marks.find((mark) => mark.type.name === "link");
            if (node.isText && link && isNotebookUrl(link.attrs.href)) {
              const previous = links.at(-1);
              if (
                previous?.to === position &&
                previous.href === link.attrs.href
              ) {
                previous.to += node.nodeSize;
                previous.label += node.text;
              } else
                links.push({
                  from: position,
                  to: position + node.nodeSize,
                  href: link.attrs.href,
                  label: node.text!,
                });
            }
          });
          for (const link of links) {
            tr.replaceWith(
              tr.mapping.map(link.from),
              tr.mapping.map(link.to),
              state.schema.nodes.notebookResource.create({
                href: link.href,
                label: link.label,
                loadOnPaste: true,
              }),
            );
          }
          return tr.docChanged ? tr : null;
        },
        props: {
          handlePaste: (_view, event) => {
            if (!this.editor.isEditable) return false;
            // Let Tiptap retain formatting and existing notebook nodes on rich HTML paste.
            if (event.clipboardData?.getData("text/html")) return false;
            const content = notebookPaste(
              event.clipboardData?.getData("text/plain") ?? "",
            );
            if (!content) return false;
            return this.editor.commands.insertContent(
              content.length === 1 && content[0].type === "paragraph"
                ? (content[0].content ?? [])
                : content,
            );
          },
        },
      }),
    ];
  },
});

function ResourceLinkView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const context = useContext(NotebookEditorContext);
  const [resolved, setResolved] = useState<NotebookResource | null>(
    node.attrs.resource,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(
    Boolean(node.attrs.loadOnPaste) ||
      node.type.name === "notebookResourceBlock",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const anchor = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  const loaded = useRef("");
  const openAfterLoading = useRef(false);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      editable: editor.isEditable,
      doc: editor.state.doc,
    }),
  });
  const href: string = node.attrs.href;
  const resource: NotebookResource | null = state.editable
    ? (node.attrs.resource ?? resolved)
    : (resolved ?? node.attrs.resource);
  const linkLabel: string =
    node.attrs.label ?? node.attrs.resource?.label ?? href;
  const previewTitle =
    linkLabel === href ? resource?.label || "Link" : linkLabel;
  const resolve = context?.resolveResource;
  const history = context?.browserProps?.history;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const supplied = node.attrs.resource as NotebookResource | null;
    const requestKey = `${retry}:${href}`;
    if (
      !requested ||
      loaded.current === requestKey ||
      (node.attrs.metadataLoaded &&
        !retry &&
        !(supplied?.type === "ImageService" && !supplied.imageInfo))
    )
      return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    const options = {
      ...history,
      vault: context?.browserProps?.vault,
      requestInitOptions: {
        ...history?.requestInitOptions,
        signal: controller.signal,
      },
    };
    const resolveLink = (source: string) =>
      resolve
        ? resolve(source, controller.signal)
        : resolveNotebookResource(source, options);
    const request =
      supplied?.type === "ContentState"
        ? Promise.resolve(supplied)
        : resolveLink(href);
    void request
      .then((value) =>
        value
          ? enrichNotebookCrops(
              value,
              {
                ...history,
                requestInitOptions: {
                  ...history?.requestInitOptions,
                  signal: controller.signal,
                },
              },
              context?.browserProps?.vault,
            )
          : null,
      )
      .then((value) =>
        value ? enrichNotebookCollection(value, resolveLink) : null,
      )
      .then((value) => {
        if (!active) return;
        loaded.current = requestKey;
        setResolved(value);
        if (value && openAfterLoading.current) {
          openAfterLoading.current = false;
          setOpen(false);
          setTimeout(() => {
            if (mounted.current) context?.onOpenResource?.(value);
          }, 0);
        }
        if (editor.isEditable && !editor.isDestroyed) {
          const position = getPos();
          const current =
            position === undefined ? null : editor.state.doc.nodeAt(position);
          if (
            ["notebookResource", "notebookResourceBlock"].includes(
              current?.type.name ?? "",
            ) &&
            current?.attrs.href === href
          ) {
            editor.view.dispatch(
              editor.state.tr
                .setNodeMarkup(position!, undefined, {
                  ...current!.attrs,
                  resource: value,
                  label:
                    current!.attrs.loadOnPaste &&
                    (current!.attrs.label ??
                      current!.attrs.resource?.label ??
                      href) === href
                      ? (value?.label ?? href)
                      : (current!.attrs.label ??
                        current!.attrs.resource?.label ??
                        href),
                  metadataLoaded: true,
                  loadOnPaste: false,
                })
                .setMeta("addToHistory", false),
            );
          }
        }
      })
      .catch((reason) => {
        openAfterLoading.current = false;
        if (active)
          setError(
            reason?.name === "AbortError"
              ? "Preview timed out. Retry when connected."
              : "Preview unavailable. The source link is preserved.",
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [href, retry, requested, resolve, history, editor]);
  if (!context)
    return (
      <NodeViewWrapper as="span">
        <a href={isNotebookUrl(href) ? href : undefined}>{href}</a>
      </NodeViewWrapper>
    );
  const task = (() => {
    const position = getPos();
    if (position === undefined || position > state.doc.content.size)
      return null;
    const at = state.doc.resolve(position);
    for (let depth = at.depth; depth > 0; depth--)
      if (at.node(depth).type.name === "taskItem") return at.node(depth);
    return null;
  })();
  const openResource = (value = resource) => {
    setOpen(false);
    // Finish dismissing the preview before opening another overlay from it.
    setTimeout(() => {
      if (value && mounted.current) context.onOpenResource?.(value);
    }, 0);
  };
  const actionContext = (
    location: NotebookActionContext["location"],
  ): NotebookActionContext | null =>
    resource
      ? {
          resource,
          note: context.note,
          notebook: context.notebook,
          editor,
          projectId: context.note.projectId,
          location,
          readOnly: !state.editable,
          isTask: Boolean(task),
          checked: task?.attrs.checked ?? false,
          setChecked: (checked = true) =>
            mounted.current &&
            setNotebookTaskChecked(editor, getPos(), checked),
          open: () => openResource(),
        }
      : null;
  const actions = (location: NotebookActionContext["location"]) => {
    const ctx = actionContext(location);
    return (
      ctx && (
        <span className="iiif-notebook__actions">
          {context.actions
            ?.filter(
              (action) =>
                (!action.types || action.types.includes(ctx.resource.type)) &&
                (!action.isVisible || action.isVisible(ctx)),
            )
            .map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={busy !== null || action.disabled?.(ctx)}
                onClick={async () => {
                  setBusy(action.id);
                  setError("");
                  try {
                    await action.run(ctx);
                  } catch (reason) {
                    if (mounted.current)
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Action failed. Try again.",
                      );
                  } finally {
                    if (mounted.current) setBusy(null);
                  }
                }}
              >
                {busy === action.id ? "Working…" : action.label}
              </button>
            ))}
          {context.renderActions?.(ctx)}
        </span>
      )
    );
  };
  const enter = () => {
    clearTimeout(timer.current);
    setRequested(true);
    setOpen(true);
  };
  const leave = () => {
    timer.current = setTimeout(() => {
      if (!document.activeElement?.closest(".iiif-notebook__preview"))
        setOpen(false);
    }, 180);
  };
  const rich = node.type.name === "notebookResourceBlock";
  const canShowRich = !!resource && resourceWidgets(resource).length > 0;
  const imageSrc = rich
    ? node.firstChild?.attrs.src || resource?.image
    : node.attrs.richContent?.[0]?.attrs.src || resource?.image;
  const previewImage =
    resource?.type === "ImageService" ? imageSrc : resource?.thumbnail;
  const imageSize =
    state.editable && resource?.type === "ImageService" && imageSrc ? (
      <NotebookImageSize
        resource={resource}
        src={imageSrc}
        onChange={(src) => {
          const position = getPos();
          if (
            !editor.isEditable ||
            editor.isDestroyed ||
            position === undefined
          )
            return;
          const current = editor.state.doc.nodeAt(position);
          if (!current || current.attrs.href !== href) return;
          const next = { ...resource, image: src, thumbnail: src };
          const imageAttrs = (attrs: Record<string, unknown>) => ({
            ...attrs,
            src,
            width: Math.min(480, parseIIIFImageUrl(src)?.size.width ?? 480),
            height: null,
          });
          const tr = editor.state.tr.setNodeMarkup(position, undefined, {
            ...current.attrs,
            resource: next,
            richContent: current.attrs.richContent?.map((item: JSONContent) =>
              item.type === "iiifImage"
                ? { ...item, attrs: imageAttrs(item.attrs ?? {}) }
                : item,
            ),
          });
          if (
            current.type.name === "notebookResourceBlock" &&
            current.firstChild?.type.name === "iiifImage"
          )
            tr.setNodeMarkup(
              position + 1,
              undefined,
              imageAttrs(current.firstChild.attrs),
            );
          editor.view.dispatch(tr);
          setResolved(next);
        }}
      />
    ) : null;
  const link = (
    <span
      className="iiif-notebook__resource"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <IIIFLogo className="iiif-notebook__resource-icon" aria-hidden="true" />
      <a
        ref={anchor}
        href={isNotebookUrl(href) ? href : undefined}
        tabIndex={0}
        onFocus={enter}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={linkLabel}
        onClick={(event) => {
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            if (resource) openResource();
            else {
              openAfterLoading.current = true;
              enter();
            }
          }
        }}
      >
        {linkLabel}
      </a>
      <button
        type="button"
        className="iiif-notebook__preview-trigger"
        aria-label={`Preview ${linkLabel}`}
        aria-expanded={open}
        onClick={enter}
      >
        ⋯
      </button>
      {context.inlineActions !== false && actions("inline")}
      {context.inlineActions !== false && error && !open && (
        <span role="alert">{error}</span>
      )}
      <Popover
        triggerRef={anchor}
        isOpen={open}
        onOpenChange={setOpen}
        isNonModal
        placement="bottom start"
        className="iiif-notebook iiif-notebook__preview"
        onMouseEnter={enter}
        onMouseLeave={leave}
        shouldCloseOnInteractOutside={(element) =>
          !anchor.current?.contains(element)
        }
      >
        <div
          role="dialog"
          aria-label="Resource preview"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <div className="iiif-notebook__preview-heading">
            {resource &&
            (!resource.thumbnail || resource.type === "Collection") ? (
              <button
                type="button"
                className="iiif-notebook__preview-title"
                onClick={() => openResource()}
              >
                {previewTitle}
              </button>
            ) : (
              <strong>
                {loading && previewTitle === "Link"
                  ? "Loading preview…"
                  : previewTitle}
              </strong>
            )}
            <button
              type="button"
              className="iiif-notebook__icon"
              aria-label="Close preview"
              onClick={() => setOpen(false)}
            >
              <CloseIcon aria-hidden="true" />
            </button>
          </div>
          {resource?.type === "Collection" && !!resource.items?.length ? (
            <div className="iiif-notebook__collection-preview">
              <div className="iiif-notebook__collection-grid">
                {resource.items.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={`Open ${item.label}`}
                    onClick={() => openResource(item)}
                  >
                    {item.thumbnail && isNotebookUrl(item.thumbnail) ? (
                      <img src={item.thumbnail} alt="" />
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </button>
                ))}
              </div>
              {(resource.totalItems ?? 0) > resource.items.length && (
                <button
                  type="button"
                  className="iiif-notebook__collection-more"
                  onClick={() => openResource()}
                >
                  +{" "}
                  {(
                    (resource.totalItems ?? 0) - resource.items.length
                  ).toLocaleString()}{" "}
                  more
                </button>
              )}
            </div>
          ) : (
            resource &&
            previewImage &&
            isNotebookUrl(previewImage) && (
              <button
                type="button"
                className="iiif-notebook__preview-image"
                aria-label={`Open ${resource.label}`}
                onClick={() => openResource()}
              >
                <img
                  className="iiif-notebook__thumbnail"
                  src={previewImage}
                  alt=""
                />
              </button>
            )
          )}
          {loading && <p role="status">Loading preview…</p>}
          {imageSize}
          {state.editable &&
            (editingLabel ? (
              <form
                className="iiif-notebook__label-editor"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editor.isEditable || !draftLabel.trim()) return;
                  updateAttributes({ label: draftLabel.trim() });
                  setEditingLabel(false);
                }}
              >
                <label>
                  Link label
                  <input
                    autoFocus
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={!draftLabel.trim()}>
                  Save label
                </button>
                <button type="button" onClick={() => setEditingLabel(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="iiif-notebook__edit-label"
                onClick={() => {
                  setDraftLabel(linkLabel);
                  setEditingLabel(true);
                }}
              >
                Edit label
              </button>
            ))}
          {state.editable && canShowRich && (
            <div className="iiif-notebook__view-control">
              <span>View</span>
              <div role="group" aria-label="Switch view">
                {(["text", "rich"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={rich === (view === "rich")}
                    onClick={() => {
                      setOpen(false);
                      setNotebookResourceView(editor, getPos(), view);
                    }}
                  >
                    {view === "text" ? "Text" : "Rich"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {actions("tooltip")}
          {error && (
            <p role="alert">
              {error}{" "}
              {
                <button
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry preview
                </button>
              }
            </p>
          )}
          <div className="iiif-notebook__source">
            {resource?.infoUrl &&
              resource.infoUrl !== href &&
              isNotebookUrl(resource.infoUrl) && (
                <a href={resource.infoUrl} target="_blank" rel="noreferrer">
                  info.json ↗
                </a>
              )}
            {isNotebookUrl(href) ? (
              <a href={href} target="_blank" rel="noreferrer">
                {href === resource?.infoUrl ? "info.json" : href} ↗
              </a>
            ) : (
              <span>
                IIIF Content State
                {resource?.targets?.length
                  ? ` · ${resource.targets.length} targets`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </Popover>
    </span>
  );
  const ctx = actionContext("inline");
  return (
    <NodeViewWrapper
      as={rich ? "div" : "span"}
      className={rich ? "iiif-notebook__rich-resource" : undefined}
    >
      <span contentEditable={false}>
        {ctx && context.wrapResource ? context.wrapResource(link, ctx) : link}
      </span>
      {rich && <div contentEditable={false}>{imageSize}</div>}
      {rich && <NodeViewContent />}
    </NodeViewWrapper>
  );
}

export function notebookExtensions(
  options: NotebookEditorOptions = {},
): Extensions {
  return [
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
      a11y: {
        checkboxLabel: (node) => {
          const parts: string[] = [];
          node.descendants((child) => {
            if (child.isText) parts.push(child.text || "");
            if (
              ["notebookResource", "notebookResourceBlock"].includes(
                child.type.name,
              )
            )
              parts.push(
                child.attrs.label ??
                  child.attrs.resource?.label ??
                  child.attrs.href,
              );
          });
          return `Task: ${parts.join(" ") || "Untitled task"}`;
        },
      },
    }),
    NotebookResourceLink,
    NotebookResourceBlock,
    NotebookCrop,
    NotebookTextAlign,
    NotebookPaste,
    IIIFLink.configure({ browserProps: options.browserProps }),
    IIIFImage.configure({ browserProps: options.browserProps }),
    IIIFSnippet.configure({ browserProps: options.browserProps }),
    IIIFVirtualCollection.configure({ browserProps: options.browserProps }),
    ...(options.extensions ?? []),
  ];
}
