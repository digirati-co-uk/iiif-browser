import { describe, expect, it } from "vitest";
import {
  applyNotebookSteps,
  appendNotebookResourceSteps,
  getNotebookSchema,
  NOTEBOOK_CONTENT_SCHEMA_VERSION,
  parseNotebookContent,
  type NotebookCheckpoint,
} from "../src/notebook/document";

describe("notebook document codec in Node", () => {
  const empty: NotebookCheckpoint = {
    schemaVersion: NOTEBOOK_CONTENT_SCHEMA_VERSION,
    version: 0,
    content: { type: "doc", content: [{ type: "paragraph" }] },
  };

  it("applies a headless resource append and preserves its authored crop", () => {
    expect(typeof window).toBe("undefined");
    const url = "https://example.org/iiif/canvas";
    const image =
      "https://example.org/iiif/image/10,20,30,40/30,/90/default.jpg";
    const contentState = {
      id: url,
      type: "Canvas",
      selector: { type: "FragmentSelector", value: "xywh=10,20,30,40" },
    };
    const resource = {
      id: url,
      source: url,
      type: "ContentState" as const,
      label: "Rotated crop",
      contentState,
      image,
      targets: [
        {
          id: url,
          source: url,
          type: "Canvas" as const,
          label: "Canvas",
          xywh: "10,20,30,40",
          image,
        },
      ],
    };
    const batch = appendNotebookResourceSteps(empty, resource, true);
    const updated = applyNotebookSteps(empty, batch);
    expect(updated.version).toBe(2);
    const doc = parseNotebookContent(updated.content);
    expect(doc.child(1).firstChild?.attrs.resource).toMatchObject(resource);
    expect(doc.child(2).attrs.src).toBe(image);
    expect(() => applyNotebookSteps(updated, batch)).toThrow(/versions/);
    expect(empty.version).toBe(0);
    expect(getNotebookSchema().nodes.iiifVirtualCollection).toBeDefined();
  });

  it("rejects invalid structure, unsafe images, and batches beyond host limits", () => {
    expect(() =>
      parseNotebookContent({
        type: "doc",
        content: [{ type: "text", text: "no block" }],
      }),
    ).toThrow();
    expect(() =>
      parseNotebookContent({
        type: "doc",
        content: [{ type: "iiifImage", attrs: { src: "javascript:alert(1)" } }],
      }),
    ).toThrow(/invalid IIIF URL/);
    expect(() =>
      parseNotebookContent(empty.content, { maxDocumentBytes: 20 }),
    ).toThrow();
    expect(() =>
      applyNotebookSteps(empty, {
        version: 0,
        steps: [{ stepType: "replace", from: 0, to: 2 }],
      }),
    ).toThrow();
    expect(() =>
      applyNotebookSteps(
        empty,
        { version: 0, steps: [{ stepType: "replace", from: 1, to: 1 }] },
        { maxBatchSteps: 0 },
      ),
    ).toThrow();
  });
});
