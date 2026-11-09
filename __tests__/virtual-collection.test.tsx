// @vitest-environment jsdom
import { Vault } from "@iiif/helpers/vault";
import {
  MDXEditor,
  type MDXEditorMethods,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { VaultProvider } from "react-iiif-vault";
import { describe, expect, it, vi } from "vitest";
import { parseVirtualCollectionItems } from "../src/editor/virtual-collection";
import {
  IIIFCollection,
  InsertIIIFVirtualCollection,
  iiifSnippetPlugin,
  iiifVirtualCollectionPlugin,
} from "../src/mdxeditor-snippet";
import { IIIFVirtualCollection } from "../src/tiptap";

vi.mock("../src/IIIFBrowser", () => ({
  IIIFBrowser: ({ output }: any) => (
    <>
      {["Collection", "Manifest"].map((type) => (
        <button
          key={type}
          type="button"
          onClick={() =>
            output[0].cb({
              resource: {
                id: `https://example.org/${type.toLowerCase()}`,
                type,
                label: { en: [`Selected ${type.toLowerCase()}`] },
              },
              vault: { get: () => null },
            })
          }
        >
          Choose {type.toLowerCase()}
        </button>
      ))}
    </>
  ),
}));

const items = JSON.stringify([
  {
    id: "https://example.org/collection",
    type: "Collection",
    label: 'A "collection" & more',
  },
  { id: "https://example.org/manifest", type: "Manifest", label: "A manifest" },
]);

describe("virtual collections", () => {
  it("validates persisted resources", () => {
    expect(parseVirtualCollectionItems(items)).toHaveLength(2);
    for (const value of [
      "{}",
      "[null]",
      '[{"id":"javascript:alert(1)","type":"Manifest","label":"x"}]',
      '[{"id":"https://example.org/canvas","type":"Canvas","label":"x"}]',
    ]) {
      expect(() => parseVirtualCollectionItems(value)).toThrow();
    }
  });

  it("inserts empty TipTap collections, persists HTML/JSON, supports undo and blocks read-only insertion", () => {
    const editor = new Editor({
      extensions: [StarterKit, IIIFVirtualCollection],
      content: "<p>Before</p>",
    });
    try {
      expect(editor.commands.insertIIIFVirtualCollection()).toBe(true);
      expect(
        editor
          .getJSON()
          .content?.find((node) => node.type === "iiifVirtualCollection")
          ?.attrs,
      ).toMatchObject({ title: "Untitled collection", items: "[]" });
      editor.commands.undo();
      expect(editor.getText()).toBe("Before");
      editor.commands.insertIIIFVirtualCollection({
        title: 'Title " & < >',
        items,
        width: 700,
        height: 500,
      });
      const json = editor.getJSON();
      editor.commands.setContent(editor.getHTML());
      expect(editor.getJSON()).toEqual(json);
      expect(
        editor.commands.insertIIIFVirtualCollection({ items: "[null]" }),
      ).toBe(false);
      editor.setEditable(false);
      expect(editor.commands.insertIIIFVirtualCollection()).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it("uses the collection snippet to navigate into child collections and back", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const vault = new Vault();
    const child = {
      id: "https://example.org/child",
      type: "Collection",
      label: { en: ["Child collection"] },
      items: [],
    };
    await vault.load(child.id, child);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <VaultProvider vault={vault}>
            <IIIFCollection
              collectionId="urn:test:parent"
              collection={{
                id: "urn:test:parent",
                label: { en: ["Parent collection"] },
                items: [
                  { id: child.id, type: "Collection", label: child.label },
                ],
              }}
            />
          </VaultProvider>,
        ),
      );
      await act(async () =>
        (
          container.querySelector(
            ".iiif-snippet__collection-card",
          ) as HTMLButtonElement
        ).click(),
      );
      expect(container.querySelector("figcaption")?.textContent).toBe(
        "Child collection",
      );
      expect(container.textContent).toContain("This collection has no items.");
      await act(async () => container.querySelector("button")!.click());
      expect(container.querySelector("figcaption")?.textContent).toBe(
        "Parent collection",
      );
      expect(
        container.querySelector(".iiif-snippet__collection-card")?.textContent,
      ).toContain("Child collection");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });

  it("inserts and edits MDX collections, saves browser selections, and restores them read-only", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const ref = createRef<MDXEditorMethods>();
    const plugins = [
      iiifSnippetPlugin(),
      iiifVirtualCollectionPlugin(),
      toolbarPlugin({ toolbarContents: () => <InsertIIIFVirtualCollection /> }),
    ];
    try {
      await act(async () =>
        root.render(
          <MDXEditor ref={ref} markdown="Before" plugins={plugins} />,
        ),
      );
      await act(async () =>
        (
          container.querySelector(
            '[aria-label="Insert virtual IIIF collection"]',
          ) as HTMLButtonElement
        ).click(),
      );
      expect(container.textContent).toContain("This collection has no items.");
      const input = container.querySelector("input")!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, 'My "collection" & more');
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      for (const type of ["collection", "manifest", "manifest"]) {
        await act(async () =>
          [...container.querySelectorAll("button")]
            .find(
              (button) => button.textContent === "Add collection or manifest",
            )!
            .click(),
        );
        await act(async () =>
          [...document.querySelectorAll("button")]
            .find((button) => button.textContent === `Choose ${type}`)!
            .click(),
        );
      }
      expect(
        container.querySelectorAll(".iiif-snippet__collection-card"),
      ).toHaveLength(2);
      const markdown = ref.current!.getMarkdown();
      expect(markdown).toContain("IIIFVirtualCollection");
      expect(markdown).toContain("https://example.org/collection");
      expect(markdown).toContain("https://example.org/manifest");
      expect(markdown).toContain("width={640}");
      expect(container.querySelector("figcaption")?.textContent).toBe(
        'My "collection" & more',
      );
      await act(async () => ref.current!.setMarkdown(markdown));
      await act(async () =>
        root.render(
          <MDXEditor
            ref={ref}
            markdown={markdown}
            readOnly
            plugins={plugins}
          />,
        ),
      );
      expect(container.querySelector("input")).toBeNull();
      expect(container.querySelector("figcaption")?.textContent).toBe(
        'My "collection" & more',
      );
      expect(container.textContent).toContain("Selected collection");
      expect(container.textContent).toContain("Selected manifest");
      expect(container.textContent).not.toContain("Add collection or manifest");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});
