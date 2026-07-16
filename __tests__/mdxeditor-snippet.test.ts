import { describe, expect, it } from "vitest";
import { createIIIFSnippetMarkdown } from "../src/mdxeditor-snippet/plugin";

describe("createIIIFSnippetMarkdown", () => {
  it("passes a Canvas and its Manifest to the default wrapped component", () => {
    expect(
      createIIIFSnippetMarkdown({
        id: "https://example.org/canvas/1",
        type: "Canvas",
        parent: { id: "https://example.org/manifest", type: "Manifest" },
      }),
    ).toBe(
      '<IIIFSnippetProvider manifestId="https://example.org/manifest" canvasId="https://example.org/canvas/1">\n' +
        '  <IIIFCanvas width={640} height={420} manifestId="https://example.org/manifest" canvasId="https://example.org/canvas/1" />\n' +
        "</IIIFSnippetProvider>",
    );
  });

  it("supports custom unwrapped components", () => {
    expect(
      createIIIFSnippetMarkdown(
        { id: "https://example.org/collection", type: "collection" },
        {
          provider: false,
          defaultSize: false,
          components: {
            Collection: {
              name: "MuseumCollection",
              source: false,
              props: { theme: "paper" },
            },
          },
        },
      ),
    ).toBe(
      '<MuseumCollection theme="paper" collectionId="https://example.org/collection" />',
    );
  });

  it("preserves an explicit selection size", () => {
    expect(
      createIIIFSnippetMarkdown({
        id: "https://example.org/manifest",
        type: "Manifest",
        width: 960,
        height: 540,
      }),
    ).toContain("width={960} height={540}");
  });

  it("persists button navigation for Collection snippets", () => {
    expect(
      createIIIFSnippetMarkdown(
        { id: "https://example.org/collection", type: "Collection" },
        { collectionNavigation: "button" },
      ),
    ).toContain('navigation="button"');
  });

  it("rejects a Canvas without its Manifest", () => {
    expect(() =>
      createIIIFSnippetMarkdown({ id: "canvas", type: "Canvas" }),
    ).toThrow("parent Manifest");
  });
});
