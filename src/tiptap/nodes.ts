import { mergeAttributes, Node } from "@tiptap/core";
import { isNotebookUrl } from "../notebook/resource-data";
import type { IIIFBrowserProps } from "../IIIFBrowser";
import type {
  CanvasSnippetOptions,
  IIIFImageOptions,
} from "../editor/image-options";
import type { IIIFVirtualCollectionOptions } from "../editor/virtual-collection";

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
export const safeUrl = isNotebookUrl;
export function validSnippet(attrs: IIIFSnippetAttributes) {
  return attrs.resourceType === "Collection"
    ? safeUrl(attrs.collectionId)
    : (attrs.resourceType === "Manifest" || attrs.resourceType === "Canvas") &&
        safeUrl(attrs.manifestId) &&
        (attrs.resourceType !== "Canvas" || safeUrl(attrs.canvasId));
}
export const IIIFImageNode = Node.create<IIIFImageExtensionOptions>({
  name: "iiifImage",
  group: "block",
  atom: true,
  draggable: true,
  addOptions: () => ({}),
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
});

export const IIIFSnippetNode = Node.create<IIIFSnippetExtensionOptions>({
  name: "iiifSnippet",
  group: "block",
  atom: true,
  draggable: true,
  // Prefer snippets when both extensions receive a Content State drop.
  priority: 110,
  addOptions: () => ({}),
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
});

export const IIIFVirtualCollectionNode =
  Node.create<IIIFVirtualCollectionOptions>({
    name: "iiifVirtualCollection",
    group: "block",
    atom: true,
    draggable: true,
    addOptions: () => ({}),
    addAttributes() {
      const defaults = {
        title: "Untitled collection",
        items: "[]",
        width: this.options.defaultSize?.width ?? 640,
        height: this.options.defaultSize?.height ?? 420,
      };
      return Object.fromEntries(
        Object.entries(defaults).map(([name, value]) => [
          name,
          {
            default: value,
            parseHTML: (element: HTMLElement) => {
              const attribute = element.getAttribute(`data-${name}`);
              return typeof value === "number"
                ? Number(attribute) > 0
                  ? Number(attribute)
                  : value
                : (attribute ?? value);
            },
            renderHTML: (attributes: Record<string, unknown>) => ({
              [`data-${name}`]: attributes[name],
            }),
          },
        ]),
      );
    },
  });
