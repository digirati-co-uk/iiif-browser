import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { IIIFImage, IIIFSnippet } from "../src/tiptap";

const schema = getSchema([StarterKit, IIIFImage, IIIFSnippet]);
describe("TipTap IIIF nodes", () => {
  it("round-trips image and snippet attributes through JSON", () => {
    for (const [name, attrs] of [
      [
        "iiifImage",
        {
          src: "https://example.org/image/full/max/0/default.jpg",
          alt: "A picture",
          width: 600,
          height: 400,
        },
      ],
      [
        "iiifSnippet",
        {
          resourceType: "Canvas",
          manifestId: "https://example.org/manifest",
          canvasId: "https://example.org/canvas",
          width: 800,
          height: 500,
          navigation: "button",
        },
      ],
    ] as const) {
      const node = schema.nodes[name].create(attrs);
      expect(schema.nodeFromJSON(node.toJSON()).attrs).toMatchObject(attrs);
      expect(node.isAtom).toBe(true);
      expect(schema.nodes.doc.validContent(node.content)).toBe(false);
    }
  });
  it("serializes an HTML fallback with persistent resource attributes", () => {
    const node = schema.nodes.iiifSnippet.create({
      resourceType: "Manifest",
      manifestId: "https://example.org/manifest",
      width: 700,
    });
    const output = schema.nodes.iiifSnippet.spec.toDOM!(node) as any;
    expect(output[1]["data-manifestid"]).toBe("https://example.org/manifest");
    expect(output[1]["data-width"]).toBe(700);
    expect(output[2]).toEqual([
      "a",
      { href: "https://example.org/manifest" },
      "IIIF Manifest",
    ]);
  });
});
