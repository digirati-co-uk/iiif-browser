import {
  decodeContentState,
  getValue,
  createThumbnailHelper,
  type Vault,
} from "@iiif/helpers";
import { isImageService } from "@iiif/parser/image-3";
import { upgrade } from "@iiif/parser/upgrader";
import type { JSONContent } from "@tiptap/core";
import { getIIIFResourceFromDigitalCollection } from "../digital-collections";
import {
  createIIIFRequest,
  fitInitialImageRequest,
  imageApiVersion,
  imageRequestUrl,
  imageServiceId,
  parseIIIFImageUrl,
  type IIIFImageInfo,
} from "../mdxeditor/image-api";
import { findCanvasParent } from "../utilities/find-canvas-parent";
import type { BrowserStoreConfig } from "../stores/browser-store";

export interface NotebookResource {
  id: string;
  type:
    | "Manifest"
    | "Collection"
    | "Canvas"
    | "ImageService"
    | "Image"
    | "ContentState";
  label: string;
  source: string;
  thumbnail?: string;
  image?: string;
  parent?: { id: string; type: "Manifest" };
  /** Original Content State, including selectors and all targets. */
  contentState?: unknown;
  targets?: NotebookResource[];
  xywh?: string;
  /** First six collection entries, with thumbnails when available. */
  items?: NotebookResource[];
  totalItems?: number;
  imageInfo?: IIIFImageInfo;
  infoUrl?: string;
}
export function isNotebookUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
function label(value: any, fallback: string): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  try {
    return getValue(value) || fallback;
  } catch {
    return fallback;
  }
}
function imageId(value: any): string | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  const id = typeof item === "string" ? item : item?.id || item?.["@id"];
  return isNotebookUrl(id) ? id : undefined;
}
function stateResource(
  json: any,
  source: string,
  allowReference = false,
): NotebookResource | null {
  const original = json;
  if (
    allowReference &&
    (Array.isArray(json) ||
      isNotebookUrl(json) ||
      ["Manifest", "Collection", "Canvas", "SpecificResource"].includes(
        json?.type,
      ))
  ) {
    json = { type: "Annotation", motivation: ["contentState"], target: json };
  }
  if (
    json?.type !== "Annotation" ||
    ![json.motivation].flat().includes("contentState")
  )
    return null;
  const targets: NotebookResource[] = [];
  for (const target of [json.target].flat()) {
    const item = target?.type === "SpecificResource" ? target.source : target;
    const id = typeof item === "string" ? item : item?.id;
    if (!isNotebookUrl(id))
      throw new Error("Content State contains an invalid target URL.");
    const url = new URL(id);
    const fragment =
      new URLSearchParams(url.hash.slice(1)).get("xywh") || undefined;
    url.hash = "";
    const type = item?.type ?? "Manifest";
    if (!["Manifest", "Collection", "Canvas"].includes(type))
      throw new Error(`Unsupported Content State target: ${type}`);
    const parent = [item?.partOf]
      .flat()
      .find((part) => part?.type === "Manifest" && isNotebookUrl(part.id));
    if (type === "Canvas" && !parent)
      throw new Error("A Canvas Content State needs its parent Manifest.");
    const selector = target?.selector;
    const xywh =
      selector?.type === "FragmentSelector"
        ? new URLSearchParams(selector.value).get("xywh") || fragment
        : fragment;
    targets.push({
      id: url.toString(),
      type,
      source,
      label: label(item?.label, type),
      ...(parent ? { parent: { id: parent.id, type: "Manifest" } } : {}),
      xywh,
    });
  }
  if (!targets.length) throw new Error("Content State has no targets.");
  return {
    id: source,
    source,
    type: "ContentState",
    label: label(
      json.label,
      `Content State · ${targets.length} target${targets.length === 1 ? "" : "s"}`,
    ),
    contentState: original,
    targets,
  };
}
export type NotebookResolverOptions = Pick<
  BrowserStoreConfig,
  | "requestInitOptions"
  | "beforeFetchUrl"
  | "preprocessManifest"
  | "preprocessCollection"
> & { vault?: Vault };

export function notebookResourceUrls(resource: NotebookResource): string[] {
  if (resource.xywh || resource.type === "ContentState")
    return [resource.source].filter(isNotebookUrl);
  const urls = [resource.id, resource.source, resource.infoUrl].filter(
    isNotebookUrl,
  );
  if (resource.type === "ImageService") {
    const info = new URL(resource.id);
    info.pathname = `${info.pathname.replace(/\/info.json$|\/$/g, "")}/info.json`;
    urls.push(info.toString());
  }
  return [...new Set(urls)];
}

/** Uses the same digital collection adapters and Image API helpers as the browser. */
export async function resolveNotebookResource(
  input: string,
  options: NotebookResolverOptions = {},
  depth = 0,
): Promise<NotebookResource | null> {
  if (depth > 4) throw new Error("Too many nested Content State links.");
  let url = input.trim();
  if (!isNotebookUrl(input.trim())) {
    try {
      const parsed = JSON.parse(
        /^[{[]/.test(url) ? url : decodeContentState(url),
      );
      return stateResource(parsed, input, true);
    } catch (error) {
      if (/^[{[]/.test(url)) throw error;
      return null;
    }
  }
  const embedded = new URL(url).searchParams.get("iiif-content");
  if (embedded) {
    const resource = await resolveNotebookResource(
      embedded,
      options,
      depth + 1,
    );
    return resource ? { ...resource, source: input } : null;
  }
  const canvasUrl = new URL(url);
  const xywh =
    new URLSearchParams(canvasUrl.hash.slice(1)).get("xywh") || undefined;
  canvasUrl.hash = "";
  const parent = findCanvasParent(canvasUrl.toString(), options.vault);
  if (parent && options.vault) {
    const canvas = options.vault.get<any>(canvasUrl.toString());
    const thumbnail = await createThumbnailHelper(options.vault)
      .getBestThumbnailAtSize(
        { id: canvasUrl.toString(), type: "Canvas" },
        { width: 640, height: 400 },
      )
      .catch(() => null);
    return {
      id: canvasUrl.toString(),
      source: input,
      type: "Canvas",
      label: label(canvas?.label, "Canvas"),
      parent,
      xywh,
      thumbnail: thumbnail?.best?.id,
    };
  }
  const imageRequest = parseIIIFImageUrl(url);
  if (imageRequest) {
    const infoUrl = new URL(`${imageServiceId(imageRequest)}/info.json`);
    infoUrl.search = new URL(url).search;
    url = infoUrl.toString();
  }
  if (!imageRequest && /\.(jpe?g|png|webp|gif|avif|tiff?)(?:[?#]|$)/i.test(url))
    return {
      id: url,
      source: input,
      type: "Image",
      label: decodeURIComponent(
        new URL(url).pathname.split("/").pop() || "Image",
      ),
      image: url,
      thumbnail: url,
    };
  const digital = await getIIIFResourceFromDigitalCollection(url, {
    requestInitOptions: options.requestInitOptions,
  });
  url = digital?.id ?? url;
  if (!isNotebookUrl(url)) throw new Error("Invalid resolved resource URL.");
  let json: any = digital?.resource;
  if (!json) {
    const fetchUrl = options.beforeFetchUrl
      ? await options.beforeFetchUrl(url)
      : url;
    if (!isNotebookUrl(fetchUrl)) throw new Error("Invalid fetch URL.");
    const response = await fetch(fetchUrl, options.requestInitOptions);
    if (!response.ok)
      throw new Error(`Resource returned HTTP ${response.status}.`);
    if (response.headers.get("content-type")?.startsWith("image/"))
      return {
        id: url,
        source: input,
        type: "Image",
        label: "Image",
        image: url,
        thumbnail: url,
      };
    // HTML pages remain ordinary links; never inject remote HTML into a note.
    if (response.headers.get("content-type")?.includes("text/html"))
      return null;
    json = await response.json();
  }
  const state = stateResource(json, input);
  if (state) return state;
  if (isImageService(json as any)) {
    if (!(json.width > 0) || !(json.height > 0))
      throw new Error("The Image API information document has no dimensions.");
    const id =
      json.id || json["@id"] || url.replace(/\/info.json(?:\?.*)?$/, "");
    if (!isNotebookUrl(id)) throw new Error("Invalid image service URL.");
    const request = imageRequest
      ? {
          ...imageRequest,
          size: {
            ...imageRequest.size,
            ...(imageRequest.size.max ? { max: false, width: 640 } : {}),
          },
        }
      : createIIIFRequest(
          id,
          imageApiVersion(json),
          { full: true },
          { width: 640 },
        );
    const imageUrl = new URL(
      imageRequestUrl(fitInitialImageRequest(request, json), json),
    );
    imageUrl.search = new URL(url).search;
    const image = imageUrl.toString();
    return {
      id,
      source: input,
      type: "ImageService",
      label: label(json.label, "IIIF image service"),
      image,
      thumbnail: image,
      infoUrl: url,
      imageInfo: json,
    };
  }
  json = upgrade(json);
  if (json?.type === "Manifest" && options.preprocessManifest)
    json = await options.preprocessManifest(json);
  if (json?.type === "Collection" && options.preprocessCollection)
    json = await options.preprocessCollection(json);
  if (!["Manifest", "Collection", "Canvas"].includes(json?.type)) return null;
  const id = json.id || url;
  if (!isNotebookUrl(id)) throw new Error("Invalid resource identifier.");
  const resourceParent = [json.partOf]
    .flat()
    .find((part) => part?.type === "Manifest" && isNotebookUrl(part.id));
  const items =
    json.type === "Collection"
      ? (json.items ?? []).filter(
          (item: any) =>
            ["Manifest", "Collection"].includes(item.type) &&
            isNotebookUrl(item.id),
        )
      : undefined;
  return {
    id,
    source: input,
    type: json.type,
    label: label(json.label, json.type),
    thumbnail: imageId(json.thumbnail) || imageId(json.items?.[0]?.thumbnail),
    ...(items
      ? {
          totalItems: items.length,
          items: items.slice(0, 6).map((item: any) => ({
            id: item.id,
            source: item.id,
            type: item.type,
            label: label(item.label, item.type),
            thumbnail: imageId(item.thumbnail),
          })),
        }
      : {}),
    ...(resourceParent
      ? { parent: { id: resourceParent.id, type: "Manifest" } }
      : {}),
  };
}

/** Only the visible collection entries need additional requests. */
export async function enrichNotebookCollection(
  resource: NotebookResource,
  resolve: (source: string) => Promise<NotebookResource | null>,
): Promise<NotebookResource> {
  if (resource.type !== "Collection" || !resource.items?.length)
    return resource;
  const items = await Promise.all(
    resource.items.slice(0, 6).map(async (item) => {
      if (item.thumbnail) return item;
      try {
        return (await resolve(item.source)) ?? item;
      } catch {
        return item;
      } // One unavailable member must not hide the collection.
    }),
  );
  return { ...resource, items };
}

export function resourceNode(
  href: string,
  resource?: NotebookResource,
): JSONContent {
  return {
    type: "notebookResource",
    attrs: { href, label: resource?.label ?? href, resource: resource ?? null },
  };
}
/** Synchronous paste keeps the insertion position stable while metadata loads. */
export function notebookPaste(text: string): JSONContent[] | null {
  const trimmed = text.trim();
  if (/^[{[]/.test(trimmed) || /^[A-Za-z0-9_-]{40,}={0,2}$/.test(trimmed)) {
    try {
      const state = stateResource(
        JSON.parse(
          /^[{[]/.test(trimmed) ? trimmed : decodeContentState(trimmed),
        ),
        trimmed,
        true,
      );
      if (state)
        return [
          {
            type: "paragraph",
            content: [
              {
                ...resourceNode(trimmed, state),
                attrs: { href: trimmed, resource: state, loadOnPaste: true },
              },
            ],
          },
        ];
    } catch {
      /* Preserve malformed payloads as ordinary text. */
    }
  }
  if (!/https?:\/\//.test(text) && !/^\s*(?:[-*]\s*)?\[[ xX]?\]\s/m.test(text))
    return null;
  const blocks: JSONContent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const task = line.match(/^\s*(?:[-*]\s*)?\[([ xX]?)\]\s+(.*)$/);
    const body = task ? task[2] : line;
    const content: JSONContent[] = [];
    let last = 0;
    for (const match of body.matchAll(/https?:\/\/[^\s<>]+/g)) {
      const href = match[0].replace(/[.,;!?)\]]+$/, "");
      const start = match.index!;
      if (start > last)
        content.push({ type: "text", text: body.slice(last, start) });
      content.push(
        isNotebookUrl(href)
          ? { ...resourceNode(href), attrs: { href, loadOnPaste: true } }
          : { type: "text", text: href },
      );
      last = start + href.length;
    }
    if (last < body.length)
      content.push({ type: "text", text: body.slice(last) });
    const paragraph = {
      type: "paragraph",
      ...(content.length ? { content } : {}),
    };
    if (task) {
      const item = {
        type: "taskItem",
        attrs: { checked: /x/i.test(task[1]) },
        content: [paragraph],
      };
      const previous = blocks.at(-1);
      if (previous?.type === "taskList") previous.content!.push(item);
      else blocks.push({ type: "taskList", content: [item] });
    } else blocks.push(paragraph);
  }
  return blocks;
}

export function noteResources(content: JSONContent): NotebookResource[] {
  const found = new Map<string, NotebookResource>();
  const visit = (node: JSONContent) => {
    const attrs = node.attrs ?? {};
    if (
      ["notebookResource", "notebookResourceBlock"].includes(node.type ?? "") &&
      attrs.resource
    ) {
      found.set(attrs.href, attrs.resource);
      return;
    }
    if (node.type === "iiifImage" && isNotebookUrl(attrs.src))
      found.set(attrs.src, {
        id: attrs.src,
        source: attrs.src,
        type: "Image",
        label: attrs.alt || "Image",
        thumbnail: attrs.src,
        image: attrs.src,
      });
    if (node.type === "iiifSnippet") {
      const id = attrs.canvasId || attrs.collectionId || attrs.manifestId;
      if (isNotebookUrl(id))
        found.set(id, {
          id,
          source: id,
          type: attrs.resourceType,
          label: attrs.resourceType,
          ...(attrs.canvasId
            ? { parent: { id: attrs.manifestId, type: "Manifest" } }
            : {}),
        });
    }
    if (node.type === "iiifVirtualCollection") {
      try {
        for (const item of JSON.parse(attrs.items))
          if (isNotebookUrl(item.id))
            found.set(item.id, {
              id: item.id,
              source: item.id,
              type: item.type,
              label: label(item.label, item.type),
            });
      } catch {
        /* Invalid imported widget. */
      }
    }
    node.content?.forEach(visit);
  };
  visit(content);
  return Array.from(found.values());
}
export function noteText(content: JSONContent): string {
  return [
    content.text,
    content.attrs?.label ?? content.attrs?.resource?.label,
    ...(content.content ?? []).map(noteText),
  ]
    .filter(Boolean)
    .join(" ");
}
