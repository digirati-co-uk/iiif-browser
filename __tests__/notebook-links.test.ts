// @vitest-environment jsdom
import type { Editor } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { notebookCollection } from "../src/notebook/collections";
import { IIIFNotebook } from "../src/notebook/Notebook";
import {
  notebookPaste,
  noteResources,
  resolveNotebookResource,
  sanitizeNotebookResource,
} from "../src/notebook/resources";
import { createNotebook } from "../src/notebook/store";

const manifest = "https://example.org/manifest";
const page = "https://example.org/articles/not-iiif";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function json(body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("resource sanitising", () => {
  it("drops malformed resources instead of passing them to renderers", () => {
    for (const bad of [
      null,
      undefined,
      "https://example.org/x",
      42,
      [],
      {},
      { type: "Manifest" },
      { type: "Manifest", id: "javascript:alert(1)" },
      { type: "Nonsense", id: manifest },
      { type: "ContentState", id: "abc" },
    ])
      expect(sanitizeNotebookResource(bad)).toBeNull();
  });

  it("keeps the usable parts of a damaged resource", () => {
    const resource = sanitizeNotebookResource({
      type: "Collection",
      id: manifest,
      label: 12,
      thumbnail: "javascript:alert(1)",
      image: 5,
      xywh: "drop table",
      parent: { id: "nope" },
      totalItems: "lots",
      items: [
        null,
        7,
        { type: "Manifest", id: `${manifest}/a`, label: "A", thumbnail: {} },
        { type: "Manifest", id: "ftp://x" },
      ],
    });
    expect(resource).toMatchObject({
      id: manifest,
      type: "Collection",
      label: "Collection",
      totalItems: 1,
    });
    expect(resource?.thumbnail).toBeUndefined();
    expect(resource?.xywh).toBeUndefined();
    expect(resource?.parent).toBeUndefined();
    expect(resource?.items?.map((item) => item.label)).toEqual(["A"]);
  });

  it("lets notes and collections survive imported garbage", () => {
    const content = {
      type: "doc",
      content: [
        null,
        { type: "paragraph", content: "not an array" },
        {
          type: "paragraph",
          content: [
            { type: "notebookResource", attrs: { href: 7, resource: {} } },
            { type: "notebookResource", attrs: null },
            {
              type: "notebookResource",
              attrs: { href: manifest, resource: { type: "Manifest", id: 5 } },
            },
            {
              type: "notebookResource",
              attrs: {
                href: manifest,
                resource: { type: "Manifest", id: manifest, label: "Fine" },
              },
            },
            { type: "iiifSnippet", attrs: { resourceType: "Weird" } },
            { type: "iiifVirtualCollection", attrs: { items: "{not json" } },
            { type: "iiifVirtualCollection", attrs: { items: '"str"' } },
          ],
        },
      ],
    } as any;
    expect(noteResources(content).map((resource) => resource.label)).toEqual([
      "Fine",
    ]);
    const collection = notebookCollection([
      { id: "a", title: "A", content } as any,
      { id: "b", title: "B", content: null } as any,
    ]);
    expect(collection.items).toHaveLength(2);
    expect(collection.items[0].items?.map((item: any) => item.id)).toEqual([
      manifest,
    ]);
  });

  it("never lets two notes disagree about what an id is", () => {
    const link = (type: string) => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "notebookResource",
              attrs: {
                href: manifest,
                resource: { type, id: manifest, source: manifest, label: type },
              },
            },
          ],
        },
      ],
    });
    const collection = notebookCollection([
      { id: "a", title: "A", content: link("Manifest") } as any,
      { id: "b", title: "B", content: link("Collection") } as any,
    ]);
    expect(collection.items[0].items).toHaveLength(1);
    expect(collection.items[1].items).toHaveLength(0);
  });
});

describe("remote resources that are not IIIF", () => {
  const resolve = (body: Response) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(body);
    return resolveNotebookResource(page);
  };

  it("treats bodies that are not IIIF as ordinary links", async () => {
    expect(await resolve(json("<xml>nope</xml>"))).toBeNull();
    expect(await resolve(json("not json at all"))).toBeNull();
    expect(await resolve(json("null"))).toBeNull();
    expect(await resolve(json("[1,2,3]"))).toBeNull();
    expect(await resolve(json('"a string"'))).toBeNull();
    expect(await resolve(json({ hello: "world" }))).toBeNull();
    expect(await resolve(json({ type: "Annotation", id: page }))).toBeNull();
    expect(
      await resolve(json("%PDF-1.4", { "content-type": "application/pdf" })),
    ).toBeNull();
    expect(
      await resolve(json("{}", { "content-type": "video/mp4" })),
    ).toBeNull();
  });

  it("does not download enormous responses", async () => {
    const response = json({ type: "Manifest", id: page });
    Object.defineProperty(response.headers, "get", {
      value: (name: string) =>
        name === "content-length"
          ? String(500 * 1024 * 1024)
          : "application/json",
    });
    expect(await resolve(response)).toBeNull();
  });

  it("survives collections with damaged members", async () => {
    const resource = await resolve(
      json({
        "@context": "http://iiif.io/api/presentation/3/context.json",
        type: "Collection",
        id: page,
        label: { en: ["Odd"] },
        items: [
          null,
          "string",
          { type: "Manifest", id: `${page}/m1`, label: { en: ["One"] } },
          { type: "Manifest", id: "not a url" },
        ],
      }),
    );
    expect(resource?.type).toBe("Collection");
    expect(resource?.items?.map((item) => item.label)).toEqual(["One"]);
    expect(
      (
        await resolve(
          json({
            "@context": "http://iiif.io/api/presentation/3/context.json",
            type: "Collection",
            id: page,
            items: { not: "an array" },
          }),
        )
      )?.items,
    ).toEqual([]);
  });

  it("still reports network failures so the caller can decide", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("blocked"));
    await expect(resolveNotebookResource(page)).rejects.toThrow("blocked");
  });
});

// ── Rendered notebook ─────────────────────────────────────────────────────

const fullManifest = {
  id: manifest,
  source: manifest,
  type: "Manifest" as const,
  label: "A manuscript",
  thumbnail: "https://example.org/thumb.jpg",
};

function paragraph(...content: any[]) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content }],
  };
}

async function mount(content: any, props: Record<string, unknown> = {}) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const store = createNotebook({ storageKey: false });
  const note = store.getState().createNote();
  store.getState().updateNote(note.id, { content });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(createElement(IIIFNotebook, { notebook: store, ...props })),
  );
  return {
    act,
    container,
    editor: () => (container.querySelector(".tiptap") as any).editor as Editor,
    unmount: () => act(async () => root.unmount()),
  };
}

const previewDialog = () =>
  document.querySelector('[role="dialog"][aria-label="Resource preview"]');

function pointer(target: Element, type: string, init: PointerEventInit = {}) {
  const outside = type === "pointerover" || type === "pointerout";
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerType: "mouse",
      relatedTarget: outside ? document.body : null,
      ...init,
    }),
  );
}

describe("link preview hover intent", () => {
  const savedLink = paragraph({
    type: "notebookResource",
    attrs: {
      href: manifest,
      label: "A manuscript",
      resource: fullManifest,
      metadataLoaded: true,
    },
  });

  it("waits for the pointer to rest before opening, and not on a quick pass", async () => {
    const view = await mount(savedLink);
    vi.useFakeTimers();
    const chip = view.container.querySelector(".iiif-notebook__resource")!;
    const anchor = chip.querySelector("a")!;
    // The native title tooltip would stack a second popup on top of ours.
    expect(anchor.hasAttribute("title")).toBe(false);

    await view.act(async () => pointer(anchor, "pointerover"));
    await view.act(async () => vi.advanceTimersByTime(200));
    expect(previewDialog()).toBeNull();

    // Sweeping across the link and out again never opens it.
    await view.act(async () => pointer(anchor, "pointerout"));
    await view.act(async () => vi.advanceTimersByTime(2000));
    expect(previewDialog()).toBeNull();

    // Moving while over the link keeps postponing the preview.
    await view.act(async () => pointer(anchor, "pointerover"));
    for (let i = 0; i < 5; i++) {
      await view.act(async () => vi.advanceTimersByTime(300));
      await view.act(async () => pointer(anchor, "pointermove"));
    }
    expect(previewDialog()).toBeNull();

    // Resting opens it.
    await view.act(async () => vi.advanceTimersByTime(700));
    expect(previewDialog()).not.toBeNull();
    await view.unmount();
  });

  it("does not open while a mouse button is held (selecting text)", async () => {
    const view = await mount(savedLink);
    vi.useFakeTimers();
    const anchor = view.container.querySelector(".iiif-notebook__resource a")!;
    await view.act(async () => pointer(anchor, "pointerover", { buttons: 1 }));
    await view.act(async () => vi.advanceTimersByTime(3000));
    expect(previewDialog()).toBeNull();
    await view.unmount();
  });

  it("ignores touch hover but offers the explicit preview button", async () => {
    const view = await mount(savedLink);
    vi.useFakeTimers();
    const anchor = view.container.querySelector(".iiif-notebook__resource a")!;
    await view.act(async () =>
      pointer(anchor, "pointerover", { pointerType: "touch" }),
    );
    await view.act(async () => vi.advanceTimersByTime(3000));
    expect(previewDialog()).toBeNull();
    await view.act(async () =>
      (
        view.container.querySelector(
          'button[aria-label="Preview A manuscript"]',
        ) as HTMLElement
      ).click(),
    );
    expect(previewDialog()).not.toBeNull();
    await view.unmount();
  });

  it("closes shortly after the pointer leaves, but not while crossing into it", async () => {
    const view = await mount(savedLink);
    vi.useFakeTimers();
    const anchor = view.container.querySelector(".iiif-notebook__resource a")!;
    await view.act(async () => pointer(anchor, "pointerover"));
    await view.act(async () => vi.advanceTimersByTime(600));
    expect(previewDialog()).not.toBeNull();

    await view.act(async () => pointer(anchor, "pointerout"));
    await view.act(async () => vi.advanceTimersByTime(100));
    await view.act(async () => pointer(previewDialog()!, "pointerover"));
    await view.act(async () => vi.advanceTimersByTime(1000));
    expect(previewDialog()).not.toBeNull();

    await view.act(async () => pointer(previewDialog()!, "pointerout"));
    await view.act(async () => vi.advanceTimersByTime(600));
    expect(previewDialog()).toBeNull();
    await view.unmount();
  });

  it("opens one preview at a time", async () => {
    const view = await mount(
      paragraph(
        {
          type: "notebookResource",
          attrs: { href: manifest, label: "One", resource: fullManifest },
        },
        { type: "text", text: " " },
        {
          type: "notebookResource",
          attrs: {
            href: `${manifest}/2`,
            label: "Two",
            resource: { ...fullManifest, id: `${manifest}/2`, label: "Two" },
          },
        },
      ),
    );
    vi.useFakeTimers();
    const [one, two] = [
      ...view.container.querySelectorAll(".iiif-notebook__resource a"),
    ];
    await view.act(async () => pointer(one, "pointerover"));
    await view.act(async () => vi.advanceTimersByTime(600));
    await view.act(async () => pointer(one, "pointerout"));
    await view.act(async () => pointer(two, "pointerover"));
    await view.act(async () => vi.advanceTimersByTime(600));
    expect(
      document.querySelectorAll('[aria-label="Resource preview"]'),
    ).toHaveLength(1);
    await view.unmount();
  });

  it("does not pop open just because the link was clicked", async () => {
    const view = await mount(savedLink, { onOpenResource: vi.fn() });
    const anchor = view.container.querySelector(
      ".iiif-notebook__resource a",
    ) as HTMLElement;
    await view.act(async () => {
      pointer(anchor, "pointerdown");
      anchor.focus();
    });
    expect(previewDialog()).toBeNull();
    await view.unmount();
  });
});

describe("links that are not IIIF", () => {
  const pasted = () =>
    paragraph(...notebookPaste(`See ${page} for more`)![0].content!);

  it("shows an unverified link as an ordinary link until it resolves", async () => {
    let finish!: (value: null) => void;
    const view = await mount(pasted(), {
      resolveResource: () =>
        new Promise<null>((resolve) => {
          finish = resolve;
        }),
    });
    expect(view.container.querySelector(".iiif-notebook__resource")).toBeNull();
    expect(
      view.container.querySelector("button[aria-label^='Preview']"),
    ).toBeNull();
    const anchor = view.container.querySelector(`a[href="${page}"]`)!;
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toContain("noopener");
    await view.act(async () => finish(null));
    await view.unmount();
  });

  it.each([
    ["is not IIIF", () => Promise.resolve(null)],
    ["cannot be fetched", () => Promise.reject(new TypeError("CORS"))],
  ])(
    "turns a pasted link back into a normal link when it %s",
    async (_n, resolveResource) => {
      const view = await mount(pasted(), { resolveResource });
      const editor = view.editor();
      const kinds = JSON.stringify(editor.getJSON());
      expect(kinds).not.toContain("notebookResource");
      expect(kinds).toContain('"type":"link"');
      expect(kinds).toContain('"notebookPlain":true');
      expect(editor.getText()).toContain(page);
      expect(
        view.container.querySelector(".iiif-notebook__resource"),
      ).toBeNull();

      // A later edit must not turn it back into a smart link.
      await view.act(async () => {
        editor.commands.insertContentAt(1, "Hello ");
      });
      expect(JSON.stringify(editor.getJSON())).not.toContain(
        "notebookResource",
      );
      expect(editor.getHTML()).toContain("data-notebook-plain");
      await view.unmount();
    },
  );

  it("keeps a pasted link that really is IIIF as a resource", async () => {
    const view = await mount(pasted(), {
      resolveResource: async (source: string) => ({
        ...fullManifest,
        id: source,
        source,
        label: "Resolved",
      }),
    });
    expect(JSON.stringify(view.editor().getJSON())).toContain(
      "notebookResource",
    );
    expect(
      view.container.querySelector(".iiif-notebook__resource"),
    ).not.toBeNull();
    expect(view.container.querySelector(`a[href="${page}"]`)?.textContent).toBe(
      "Resolved",
    );
    await view.unmount();
  });

  it("renders already-known non-IIIF links as ordinary links without fetching", async () => {
    const resolveResource = vi.fn();
    const view = await mount(
      paragraph({
        type: "notebookResource",
        attrs: {
          href: page,
          label: "An article",
          metadataLoaded: true,
          resource: null,
        },
      }),
      { resolveResource },
    );
    const anchor = view.container.querySelector(
      `a[href="${page}"]`,
    ) as HTMLElement;
    expect(anchor.textContent).toBe("An article");
    expect(view.container.querySelector(".iiif-notebook__resource")).toBeNull();
    await view.act(async () => anchor.focus());
    expect(resolveResource).not.toHaveBeenCalled();
    await view.unmount();
  });

  it("does not convert links already marked as plain, or code", async () => {
    const view = await mount("<p></p>");
    const editor = view.editor();
    await view.act(async () => {
      editor.commands.insertContent(
        `<p><a data-notebook-plain href="${page}">kept</a> <code><a href="${manifest}">code</a></code></p>`,
      );
    });
    expect(JSON.stringify(editor.getJSON())).not.toContain("notebookResource");
    await view.unmount();
  });
});

describe("a broken link never takes the notebook down", () => {
  it("renders damaged saved resources", async () => {
    const view = await mount(
      paragraph({
        type: "notebookResource",
        attrs: {
          href: manifest,
          label: { not: "a string" },
          richContent: 5,
          resource: {
            type: "Collection",
            id: manifest,
            label: 12,
            items: [null, { id: 1 }, "x"],
            totalItems: "many",
            thumbnail: { nope: true },
          },
        },
      }),
    );
    expect(
      view.container.querySelector('[aria-label="IIIF notebook"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector(`a[href="${manifest}"]`),
    ).not.toBeNull();
    await view.unmount();
  });

  it("contains a throwing preview to that one link", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = await mount(
      paragraph(
        { type: "text", text: "Before " },
        {
          type: "notebookResource",
          attrs: { href: manifest, label: "Boom", resource: fullManifest },
        },
        { type: "text", text: " after" },
      ),
      {
        renderActions: () => {
          throw new Error("custom action exploded");
        },
      },
    );
    expect(
      view.container.querySelector('[aria-label="IIIF notebook"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector(`a[href="${manifest}"]`)?.textContent,
    ).toBe("Boom");
    expect(view.editor().getText()).toContain("Before");
    expect(view.editor().getText()).toContain("after");
    await view.unmount();
  });
});
