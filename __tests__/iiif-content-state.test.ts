import { describe, expect, it } from "vitest";
import {
  contentStatePayload,
  cookbookCanvas,
  cookbookManifest,
} from "../src/editor/ContentStateDragSource";
import { dropBrowserHistory, parseIIIFDrop } from "../src/editor/content-state";

describe("IIIF cookbook drag and drop", () => {
  it("accepts both recipe payloads and retains the Canvas parent", () => {
    expect(parseIIIFDrop(contentStatePayload())).toEqual([
      { id: cookbookManifest, type: "Manifest" },
    ]);
    const [canvas] = parseIIIFDrop(contentStatePayload(true))!;
    expect(canvas).toEqual({
      id: cookbookCanvas,
      type: "Canvas",
      parent: { id: cookbookManifest, type: "Manifest" },
    });
    expect(dropBrowserHistory(canvas).initialHistory[0].route).toBe(
      `/manifest?id=${encodeURIComponent(cookbookManifest)}&canvas=${encodeURIComponent(cookbookCanvas)}`,
    );
  });
  it("leaves ordinary drops and unsupported or unsafe content untouched", () => {
    for (const text of [
      "hello",
      cookbookManifest,
      "null",
      "{}",
      JSON.stringify({
        type: "Annotation",
        motivation: "commenting",
        target: { id: cookbookManifest, type: "Manifest" },
      }),
    ])
      expect(parseIIIFDrop(text)).toBeNull();
    for (const target of [
      { id: "javascript:alert(1)", type: "Manifest" },
      { id: "https://user:secret@example.org/manifest", type: "Manifest" },
      { id: cookbookCanvas, type: "Canvas" },
      { id: cookbookManifest, type: "Unknown" },
      { type: "SpecificResource", source: cookbookCanvas },
      { id: cookbookManifest, type: "Manifest", selector: {} },
    ])
      expect(
        parseIIIFDrop(
          JSON.stringify({
            type: "Annotation",
            motivation: ["contentState"],
            target,
          }),
        ),
      ).toBeNull();
  });
  it("accepts multiple targets and string motivation", () => {
    const annotation = JSON.parse(contentStatePayload());
    annotation.motivation = "contentState";
    annotation.target = [
      annotation.target,
      { id: "https://example.org/collection", type: "Collection" },
    ];
    expect(parseIIIFDrop(JSON.stringify(annotation))).toHaveLength(2);
  });
});
