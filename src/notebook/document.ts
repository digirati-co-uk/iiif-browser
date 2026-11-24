import { getSchema, type JSONContent } from "@tiptap/core";
import type { Node, Schema } from "@tiptap/pm/model";
import { Step, Transform } from "@tiptap/pm/transform";
import StarterKit from "@tiptap/starter-kit";
import {
  IIIFImageNode,
  IIIFSnippetNode,
  IIIFVirtualCollectionNode,
} from "../tiptap/nodes";
import {
  NotebookCropNode,
  NotebookPlainLink,
  NotebookResourceBlockNode,
  NotebookResourceNode,
  NotebookTextAlign,
  notebookTaskExtensions,
} from "./nodes";
import {
  isNotebookUrl,
  notebookResourceContent,
  type NotebookResource,
} from "./resource-data";

export const NOTEBOOK_CONTENT_SCHEMA_VERSION = 1;

export interface NotebookCheckpoint {
  schemaVersion: typeof NOTEBOOK_CONTENT_SCHEMA_VERSION;
  version: number;
  content: JSONContent;
}

export interface NotebookStepBatch {
  version: number;
  steps: readonly unknown[];
}

export interface NotebookAcceptedSteps extends NotebookStepBatch {
  /** One editor client ID per accepted step, including the local author's steps. */
  clientIds: readonly (string | number)[];
}

export const DEFAULT_NOTEBOOK_BATCH_STEPS = 256;
export const DEFAULT_NOTEBOOK_BATCH_BYTES = 256 * 1024;

export interface NotebookContentLimits {
  maxDocumentBytes?: number;
  maxBatchBytes?: number;
  maxBatchSteps?: number;
  maxDepth?: number;
}

let schema: Schema | undefined;

/** The stock editor schema, without a view, DOM, or React. */
export function getNotebookSchema(): Schema {
  return (schema ??= getSchema([
    StarterKit.configure({ link: { openOnClick: false } }),
    ...notebookTaskExtensions(),
    NotebookResourceNode,
    NotebookResourceBlockNode,
    NotebookCropNode,
    NotebookTextAlign,
    NotebookPlainLink,
    IIIFImageNode,
    IIIFSnippetNode,
    IIIFVirtualCollectionNode,
  ]));
}

function checkJSON(value: unknown, maxBytes: number, maxDepth: number) {
  const pending = [{ value, depth: 0 }];
  let remaining = maxBytes;
  while (pending.length) {
    const entry = pending.pop()!;
    const item = entry.value;
    if (--remaining < 0 || entry.depth > maxDepth)
      throw new RangeError("Notebook data exceeds its size or depth limit.");
    if (Array.isArray(item)) {
      if (item.length > remaining)
        throw new RangeError("Notebook data is too large.");
      for (const value of item) pending.push({ value, depth: entry.depth + 1 });
    } else if (item && typeof item === "object") {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== null && prototype !== Object.prototype)
        throw new TypeError("Notebook data must be JSON.");
      for (const [key, value] of Object.entries(item)) {
        remaining -= key.length;
        if (remaining < 0) throw new RangeError("Notebook data is too large.");
        pending.push({ value, depth: entry.depth + 1 });
      }
    } else if (typeof item === "string") {
      remaining -= item.length;
    } else if (
      item !== null &&
      typeof item !== "boolean" &&
      !(typeof item === "number" && Number.isFinite(item))
    ) {
      throw new TypeError("Notebook data must be JSON.");
    }
  }
  if (
    remaining < 0 ||
    new TextEncoder().encode(JSON.stringify(value)).length > maxBytes
  )
    throw new RangeError("Notebook data is too large.");
}

function checkDocument(doc: Node) {
  doc.check();
  doc.descendants((node) => {
    const attrs = node.attrs;
    const urls =
      node.type.name === "iiifImage" || node.type.name === "notebookCrop"
        ? [attrs.src]
        : node.type.name === "iiifSnippet"
          ? [attrs.collectionId, attrs.manifestId, attrs.canvasId]
          : [];
    if (urls.some((url) => url != null && url !== "" && !isNotebookUrl(url)))
      throw new RangeError("Notebook content has an invalid IIIF URL.");
    for (const mark of node.marks) {
      if (
        mark.type.name === "link" &&
        (typeof mark.attrs.href !== "string" ||
          /^[\s\x00-\x1f]*(?:javascript|vbscript|data):/i.test(
            mark.attrs.href.replace(/[\x00-\x1f]/g, ""),
          ))
      )
        throw new RangeError("Notebook content has an invalid link URL.");
    }
  });
}

const notebookStepTypes = new Set([
  "replace",
  "replaceAround",
  "addMark",
  "removeMark",
  "addNodeMark",
  "removeNodeMark",
  "attr",
]);

function versionIsValid(version: number) {
  return Number.isSafeInteger(version) && version >= 0;
}

export function parseNotebookContent(
  value: unknown,
  limits: NotebookContentLimits = {},
): Node {
  checkJSON(
    value,
    limits.maxDocumentBytes ?? 1024 * 1024,
    limits.maxDepth ?? 64,
  );
  const schema = getNotebookSchema();
  const doc = schema.nodeFromJSON(value);
  if (doc.type !== schema.topNodeType)
    throw new RangeError("Expected a notebook document.");
  checkDocument(doc);
  return doc;
}

/** Applies a whole batch without mutating the checkpoint. Call inside the host's atomic commit. */
export function applyNotebookSteps(
  checkpoint: NotebookCheckpoint,
  batch: NotebookStepBatch,
  limits: NotebookContentLimits = {},
): NotebookCheckpoint {
  if (checkpoint.schemaVersion !== NOTEBOOK_CONTENT_SCHEMA_VERSION)
    throw new RangeError("Unsupported notebook content schema.");
  if (
    !versionIsValid(checkpoint.version) ||
    batch.version !== checkpoint.version
  )
    throw new RangeError("Notebook versions do not match.");
  if (
    !Array.isArray(batch.steps) ||
    !batch.steps.length ||
    batch.steps.length >
      (limits.maxBatchSteps ?? DEFAULT_NOTEBOOK_BATCH_STEPS) ||
    !versionIsValid(batch.version + batch.steps.length)
  )
    throw new RangeError("Invalid notebook step count.");
  checkJSON(
    batch.steps,
    limits.maxBatchBytes ?? DEFAULT_NOTEBOOK_BATCH_BYTES,
    limits.maxDepth ?? 64,
  );
  const transform = new Transform(
    parseNotebookContent(checkpoint.content, limits),
  );
  for (const json of batch.steps) {
    if (
      !json ||
      typeof json !== "object" ||
      !("stepType" in json) ||
      typeof json.stepType !== "string" ||
      !notebookStepTypes.has(json.stepType)
    )
      throw new RangeError("Unknown notebook step type.");
    transform.step(Step.fromJSON(transform.doc.type.schema, json));
    if (transform.doc.content.size > (limits.maxDocumentBytes ?? 1024 * 1024))
      throw new RangeError("Notebook data is too large.");
  }
  checkDocument(transform.doc);
  const content = transform.doc.toJSON() as JSONContent;
  checkJSON(
    content,
    limits.maxDocumentBytes ?? 1024 * 1024,
    limits.maxDepth ?? 64,
  );
  return {
    ...checkpoint,
    version: batch.version + batch.steps.length,
    content,
  };
}

/** Creates a versioned append batch for a note with no mounted editor. */
export function appendNotebookResourceSteps(
  checkpoint: NotebookCheckpoint,
  resource: NotebookResource,
  asImage = false,
  limits?: NotebookContentLimits,
): NotebookStepBatch {
  const doc = parseNotebookContent(checkpoint.content, limits);
  const transform = new Transform(doc);
  for (const content of notebookResourceContent(resource, asImage))
    transform.insert(
      transform.doc.content.size,
      doc.type.schema.nodeFromJSON(content),
    );
  return {
    version: checkpoint.version,
    steps: transform.steps.map((step) => step.toJSON()),
  };
}
