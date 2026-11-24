import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { isNotebookUrl, sanitizeNotebookResource } from "./resource-data";

/** Saved attributes are untrusted JSON; a non-string label must not break rendering. */
export function resourceLinkText(attrs: Record<string, any>): string {
  return (
    stringAttribute(attrs.label) ??
    stringAttribute(attrs.resource?.label) ??
    stringAttribute(attrs.href) ??
    "Link"
  );
}
export const NotebookResourceNode = Node.create({
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
          typeof attrs.label === "string"
            ? { "data-link-label": attrs.label }
            : {},
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
            return sanitizeNotebookResource(
              JSON.parse(element.getAttribute("data-resource") || "null"),
            );
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
      resourceLinkText(node.attrs),
    ];
  },
  renderText: ({ node }) => resourceLinkText(node.attrs),
});
/** Rich resources contain the existing editable image/viewer nodes. */
export const NotebookResourceBlockNode = NotebookResourceNode.extend({
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
export const NotebookCropNode = Node.create({
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
});
export const NotebookTextAlign = Extension.create({
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
/** Remembers that a link was checked and is not a IIIF resource. */
export const NotebookPlainLink = Extension.create({
  name: "notebookPlainLink",
  addGlobalAttributes: () => [
    {
      types: ["link"],
      attributes: {
        notebookPlain: {
          default: false,
          parseHTML: (element) => element.hasAttribute("data-notebook-plain"),
          renderHTML: (attrs) =>
            attrs.notebookPlain ? { "data-notebook-plain": "" } : {},
        },
      },
    },
  ],
});
function stringAttribute(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function notebookTaskExtensions() {
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
              parts.push(resourceLinkText(child.attrs));
          });
          return `Task: ${parts.join(" ") || "Untitled task"}`;
        },
      },
    }),
  ];
}
