import { getValue } from "@iiif/helpers";
import type { JSONContent } from "@tiptap/core";
import type { IIIFImageInfo } from "../mdxeditor/image-api";

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
export function resourceLabel(value: any, fallback: string): string {
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
    label: resourceLabel(input.label, type),
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
export function resourceNode(
  href: string,
  resource?: NotebookResource,
): JSONContent {
  return {
    type: "notebookResource",
    attrs: { href, label: resource?.label ?? href, resource: resource ?? null },
  };
}
/** The same payload used by the standalone append action and headless hosts. */
export function notebookResourceContent(
  resource: NotebookResource,
  asImage = false,
): JSONContent[] {
  const content: JSONContent[] = [
    { type: "paragraph", content: [resourceNode(resource.source, resource)] },
  ];
  const image = resource.image || resource.thumbnail;
  if (asImage && image)
    content.push({
      type: "iiifImage",
      attrs: { src: image, alt: resource.label, width: 480 },
    });
  return content;
}
