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
  if (typeof value === "string") return value.trim() || fallback;
  try {
    const result = getValue(value);
    return typeof result === "string" && result.trim() ? result : fallback;
  } catch {
    return fallback;
  }
}

const RESOURCE_TYPES: ReadonlySet<string> = new Set<NotebookResource["type"]>([
  "Manifest",
  "Collection",
  "Canvas",
  "ImageService",
  "Image",
  "ContentState",
]);
const MAX_PREVIEW_ITEMS = 12;
const MAX_TARGETS = 100;
const MAX_REMOTE_BYTES = 50 * 1024 * 1024;
const XYWH = /^(?:pct:)?[-+0-9.eE]+(?:,[-+0-9.eE]+){3}$/;

function safeUrl(value: unknown): string | undefined {
  return isNotebookUrl(value) ? value : undefined;
}

/**
 * Notebook documents are user-editable JSON that may be imported, synced or
 * hand-written. Anything displayed, indexed or loaded into a vault goes through
 * here first so a malformed resource is dropped instead of crashing a renderer.
 */
export function sanitizeNotebookResource(
  value: unknown,
  depth = 0,
): NotebookResource | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 2)
    return null;
  const input = value as Record<string, unknown>;
  const type = input.type;
  if (typeof type !== "string" || !RESOURCE_TYPES.has(type)) return null;
  const id = input.id;
  if (typeof id !== "string" || !id) return null;
  // Content States are encoded payloads; every other resource is an http(s) URL.
  if (type !== "ContentState" && !isNotebookUrl(id)) return null;
  const source =
    typeof input.source === "string" && input.source ? input.source : id;
  const resource: NotebookResource = {
    id,
    source,
    type: type as NotebookResource["type"],
    label: label(input.label, type),
  };
  const thumbnail = safeUrl(input.thumbnail);
  const image = safeUrl(input.image);
  const infoUrl = safeUrl(input.infoUrl);
  if (thumbnail) resource.thumbnail = thumbnail;
  if (image) resource.image = image;
  if (infoUrl) resource.infoUrl = infoUrl;
  const parent = input.parent as { id?: unknown } | undefined;
  if (parent && typeof parent === "object" && isNotebookUrl(parent.id))
    resource.parent = { id: parent.id, type: "Manifest" };
  if (typeof input.xywh === "string" && XYWH.test(input.xywh))
    resource.xywh = input.xywh;
  if (input.contentState !== undefined)
    resource.contentState = input.contentState;
  if (
    input.imageInfo &&
    typeof input.imageInfo === "object" &&
    !Array.isArray(input.imageInfo)
  )
    resource.imageInfo = input.imageInfo as IIIFImageInfo;
  if (Array.isArray(input.items)) {
    const items = input.items
      .slice(0, MAX_PREVIEW_ITEMS)
      .map((item) => sanitizeNotebookResource(item, depth + 1))
      .filter((item): item is NotebookResource => !!item);
    resource.items = items;
    const total = Number(input.totalItems);
    resource.totalItems =
      Number.isFinite(total) && total >= items.length
        ? Math.floor(total)
        : items.length;
  }
  if (Array.isArray(input.targets)) {
    const targets = input.targets
      .slice(0, MAX_TARGETS)
      .map((target) => sanitizeNotebookResource(target, depth + 1))
      .filter((target): target is NotebookResource => !!target);
    if (targets.length) resource.targets = targets;
  }
  if (type === "ContentState" && !resource.targets?.length) return null;
  return resource;
}
function imageId(value: any): string | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  const id = typeof item === "string" ? item : item?.id || item?.["@id"];
  return isNotebookUrl(id) ? id : undefined;
}
function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/** Non-narrowing variant, for values that are deliberately kept as `any`. */
function isObject(value: unknown): boolean {
  return isRecord(value);
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
    const contentType = (response.headers.get("content-type") ?? "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    if (contentType.startsWith("image/"))
      return {
        id: url,
        source: input,
        type: "Image",
        label: "Image",
        image: url,
        thumbnail: url,
      };
    // Pages, documents and media remain ordinary links; never inject remote
    // content into a note or download something that cannot be IIIF.
    if (
      contentType &&
      !/json|text\/plain|octet-stream|javascript/.test(contentType)
    )
      return null;
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_REMOTE_BYTES) return null;
    try {
      json = JSON.parse(await response.text());
    } catch (error) {
      // Not JSON at all: an ordinary link. Aborts and network failures still throw.
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  }
  // JSON that is not an object (numbers, strings, arrays) cannot be IIIF.
  if (!isObject(json)) return null;
  const state = stateResource(json, input);
  if (state) return state;
  let imageService = false;
  try {
    imageService = isImageService(json as any);
  } catch {
    imageService = false;
  }
  if (imageService) {
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
  try {
    json = upgrade(json);
  } catch {
    // Arbitrary JSON the IIIF upgrader cannot read is not a IIIF resource.
    return null;
  }
  if (!isObject(json)) return null;
  if (json.type === "Manifest" && options.preprocessManifest)
    json = await options.preprocessManifest(json as any);
  if (json.type === "Collection" && options.preprocessCollection)
    json = await options.preprocessCollection(json as any);
  if (!isObject(json)) return null;
  if (!["Manifest", "Collection", "Canvas"].includes(json.type)) return null;
  const id = typeof json.id === "string" && json.id ? json.id : url;
  if (!isNotebookUrl(id)) throw new Error("Invalid resource identifier.");
  const resourceParent = [json.partOf]
    .flat()
    .find(
      (part) =>
        isRecord(part) && part.type === "Manifest" && isNotebookUrl(part.id),
    );
  const items =
    json.type === "Collection"
      ? (Array.isArray(json.items) ? json.items : []).filter(
          (item: any) =>
            isRecord(item) &&
            ["Manifest", "Collection"].includes(item.type) &&
            isNotebookUrl(item.id),
        )
      : undefined;
  const firstItem = Array.isArray(json.items) ? json.items[0] : undefined;
  return {
    id,
    source: input,
    type: json.type,
    label: label(json.label, json.type),
    thumbnail:
      imageId(json.thumbnail) ||
      (isRecord(firstItem) ? imageId(firstItem.thumbnail) : undefined),
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
  const add = (key: unknown, value: unknown) => {
    const resource = sanitizeNotebookResource(value);
    if (resource && typeof key === "string" && key) found.set(key, resource);
  };
  const visit = (node: JSONContent, depth = 0) => {
    // Imported documents are untrusted: tolerate malformed or absurdly deep nodes.
    if (!node || typeof node !== "object" || depth > 200) return;
    const attrs = (
      node.attrs && typeof node.attrs === "object" ? node.attrs : {}
    ) as Record<string, any>;
    if (
      ["notebookResource", "notebookResourceBlock"].includes(node.type ?? "") &&
      attrs.resource
    ) {
      add(attrs.href, attrs.resource);
      return;
    }
    if (node.type === "iiifImage" && isNotebookUrl(attrs.src))
      add(attrs.src, {
        id: attrs.src,
        source: attrs.src,
        type: "Image",
        label: typeof attrs.alt === "string" && attrs.alt ? attrs.alt : "Image",
        thumbnail: attrs.src,
        image: attrs.src,
      });
    if (node.type === "iiifSnippet") {
      const id = attrs.canvasId || attrs.collectionId || attrs.manifestId;
      add(id, {
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
        const items = JSON.parse(attrs.items);
        if (Array.isArray(items))
          for (const item of items)
            if (isRecord(item))
              add(item.id, {
                id: item.id,
                source: item.id,
                type: item.type,
                label: label(item.label, item.type),
              });
      } catch {
        /* Invalid imported widget. */
      }
    }
    if (Array.isArray(node.content))
      for (const child of node.content) visit(child, depth + 1);
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
