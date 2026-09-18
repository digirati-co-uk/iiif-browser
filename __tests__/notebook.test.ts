// @vitest-environment jsdom
import { Vault, encodeContentState } from "@iiif/helpers";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createMemoryHistory } from "history";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmitter } from "../src/events";
import {
  notebookCollection,
  loadNotebookCollection,
  noteUrl,
} from "../src/notebook/collections";
import {
  notebookExtensions,
  setNotebookTaskChecked,
  setNotebookResourceView,
} from "../src/notebook/extensions";
import {
  isNotebookUrl,
  notebookPaste,
  noteResources,
  resolveNotebookResource,
  enrichNotebookCollection,
  notebookResourceUrls,
} from "../src/notebook/resources";
import {
  createNotebook,
  currentNote,
  notesForProject,
  searchNotebook,
} from "../src/notebook/store";
import { outputTypesForItem } from "../src/stores/output-store";
import { createOmnisearchStore } from "../src/stores/omnisearch-store";

const manifest = "https://example.org/manifest";
const image = "https://example.org/image/info.json";
const editors: Editor[] = [];
function editor(content: any = "<p></p>") {
  const instance = new Editor({
    extensions: [StarterKit, ...notebookExtensions()],
    content,
  });
  editors.push(instance);
  return instance;
}
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("notebook source detection", () => {
  it("recovers pasted Canvas links and crops from the shared vault without fetching their identifiers", async () => {
    const vault = new Vault();
    const canvas = `${manifest}/canvas`;
    vault.loadSync(manifest, {
      id: manifest,
      type: "Manifest",
      items: [
        {
          id: canvas,
          type: "Canvas",
          label: { en: ["Plate one"] },
          width: 1000,
          height: 800,
          items: [],
          thumbnail: [{ id: "https://example.org/thumb.jpg", type: "Image" }],
        },
      ],
    });
    const network = vi.spyOn(globalThis, "fetch");
    for (const suffix of ["", "#xywh=10,20,30,40"]) {
      expect(
        await resolveNotebookResource(`${canvas}${suffix}`, { vault }),
      ).toMatchObject({
        id: canvas,
        source: `${canvas}${suffix}`,
        type: "Canvas",
        label: "Plate one",
        parent: { id: manifest, type: "Manifest" },
        ...(suffix ? { xywh: "10,20,30,40" } : {}),
      });
    }
    expect(network).not.toHaveBeenCalled();
  });
  it("loads info.json for image requests, preserves crops and authentication, and chooses a supported default size", async () => {
    const info = {
      id: "https://example.org/image",
      type: "ImageService3",
      protocol: "http://iiif.io/api/image",
      profile: "level2",
      width: 2400,
      height: 1600,
      label: { en: ["Image title"] },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify(info)));
    const signal = new AbortController().signal;
    const result = await resolveNotebookResource(
      "https://example.org/image/10,20,1000,800/max/90/default.jpg?token=test",
      {
        requestInitOptions: { signal },
        beforeFetchUrl: async (url) => `${url}&proxy=1`,
      },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.org/image/info.json?token=test&proxy=1",
      { signal },
    );
    expect(result).toMatchObject({
      type: "ImageService",
      label: "Image title",
      infoUrl: "https://example.org/image/info.json?token=test",
      image:
        "https://example.org/image/10,20,1000,800/640,512/90/default.jpg?token=test",
      imageInfo: { width: 2400, height: 1600 },
    });
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            ...info,
            profile: "level0",
            sizes: [
              { width: 256, height: 171 },
              { width: 512, height: 341 },
            ],
          }),
        ),
    );
    expect(
      await resolveNotebookResource(
        "https://example.org/image/full/max/0/default.jpg",
      ),
    ).toMatchObject({
      image: "https://example.org/image/full/512,341/0/default.jpg",
    });
  });
  it("resolves Delft manifest labels and limits collection preview requests to six entries", async () => {
    const url =
      "https://heritage.tudelft.nl/iiif/manifests/015fcbc0-6ccb-4dd9-bffe-9e5b64545f6f/manifest.json";
    const network = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input) === "https://example.org/collection"
              ? {
                  id: String(input),
                  type: "Collection",
                  label: { en: ["Instruments"] },
                  items: Array.from({ length: 16 }, (_, i) => ({
                    id: `${manifest}/${i}`,
                    type: "Manifest",
                    label: { en: [`Instrument ${i}`] },
                    ...(i === 0
                      ? {
                          thumbnail: [
                            {
                              id: "https://example.org/thumb.jpg",
                              type: "Image",
                            },
                          ],
                        }
                      : {}),
                  })),
                }
              : {
                  id: String(input),
                  type: "Manifest",
                  label: { nl: ["Elektronische teller"] },
                  thumbnail: [
                    { id: "https://example.org/thumb.jpg", type: "Image" },
                  ],
                  items: [],
                },
          ),
        ),
    );
    expect(await resolveNotebookResource(url)).toMatchObject({
      type: "Manifest",
      label: "Elektronische teller",
      thumbnail: "https://example.org/thumb.jpg",
    });
    const collection = await resolveNotebookResource(
      "https://example.org/collection",
    );
    expect(collection?.totalItems).toBe(16);
    expect(collection?.items).toHaveLength(6);
    network.mockClear();
    const preview = await enrichNotebookCollection(
      collection!,
      resolveNotebookResource,
    );
    expect(network).toHaveBeenCalledTimes(5);
    expect(preview.items?.every((item) => item.thumbnail)).toBe(true);
    expect(preview.items?.[0].label).toBe("Instrument 0");
  });
  it("keeps text and ordered source lists while recognizing Markdown checklists", () => {
    const content = notebookPaste(
      `Research\n[] ${image}\n- [x] ${manifest}\nLook at ${manifest}.`,
    )!;
    const instance = editor({ type: "doc", content });
    expect(content[1].type).toBe("taskList");
    expect(content[1].content?.map((item) => item.attrs?.checked)).toEqual([
      false,
      true,
    ]);
    expect(content[2].content?.at(-1)?.text).toBe(".");
    const json = instance.getJSON();
    instance.commands.setContent(instance.getHTML());
    expect(instance.getJSON()).toEqual(json);
    expect(notebookPaste("ordinary notes")).toBeNull();
  });
  it("pastes a single source inline at the caret without splitting the paragraph", () => {
    const instance = editor("<p>Before after</p>");
    instance.commands.setTextSelection(8);
    instance.view.someProp("handlePaste", (handler) =>
      handler(
        instance.view,
        {
          clipboardData: {
            getData: (type: string) => (type === "text/plain" ? manifest : ""),
          },
        } as unknown as ClipboardEvent,
        null as never,
      ),
    );
    expect(instance.state.doc.childCount).toBe(1);
    expect(
      instance.getJSON().content?.[0].content?.map((node) => node.type),
    ).toEqual(["text", "notebookResource", "text"]);
  });
  it("turns formatted pasted links into smart links and can undo the complete paste", () => {
    const instance = editor();
    instance.commands.insertContent(
      `<p><b>Source</b> <a href="${manifest}">My <b>reference</b></a></p>`,
    );
    expect(
      instance
        .getJSON()
        .content?.[0].content?.some((node) => node.type === "notebookResource"),
    ).toBe(true);
    expect(instance.getJSON().content?.[0].content?.[0].marks?.[0].type).toBe(
      "bold",
    );
    expect(instance.state.doc.child(0).lastChild?.attrs.label).toBe(
      "My reference",
    );
    instance.commands.undo();
    expect(instance.getJSON().content?.[0].content).toBeUndefined();
  });
  it("recognizes v2/v3 presentation, Image API services and static images", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          "@context": "http://iiif.io/api/presentation/2/context.json",
          "@id": manifest,
          "@type": "sc:Manifest",
          label: "Old manuscript",
          sequences: [],
        }),
      ),
    );
    expect(await resolveNotebookResource(manifest)).toMatchObject({
      type: "Manifest",
      label: "Old manuscript",
    });
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": "https://example.org/image",
            protocol: "http://iiif.io/api/image",
            profile: ["http://iiif.io/api/image/2/level2.json"],
            width: 1200,
            height: 800,
          }),
        ),
    );
    expect(await resolveNotebookResource(image)).toMatchObject({
      type: "ImageService",
      image: "https://example.org/image/full/640,/0/default.jpg",
    });
    expect(
      await resolveNotebookResource("https://example.org/photo.jpg"),
    ).toMatchObject({ type: "Image" });
    expect(
      await resolveNotebookResource(
        "https://example.org/image/full/600,/0/default.jpg",
      ),
    ).toMatchObject({
      type: "ImageService",
      image: "https://example.org/image/full/600,/0/default.jpg",
    });
  });
  it("reuses digital collection adapters and passes authentication and cancellation", async () => {
    const leedsManifest =
      "https://iiif.library.leeds.ac.uk/presentation/cc/pfk4sgw8";
    const url =
      "https://explore.library.leeds.ac.uk/special-collections-explore/372659/horae_beatae_mariae_virginis";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        String(input) === url
          ? new Response(`<p><strong>Manifest:</strong> ${leedsManifest}</p>`, {
              headers: { "content-type": "text/html" },
            })
          : new Response(
              JSON.stringify({
                id: leedsManifest,
                type: "Manifest",
                label: { en: ["Leeds source"] },
                items: [],
              }),
            ),
      );
    const controller = new AbortController();
    const result = await resolveNotebookResource(url, {
      requestInitOptions: {
        signal: controller.signal,
        headers: { "X-Test": "example" },
      },
    });
    expect(result).toMatchObject({
      id: leedsManifest,
      source: url,
      label: "Leeds source",
    });
    expect(
      fetchMock.mock.calls.every(
        (call) => call[1]?.signal === controller.signal,
      ),
    ).toBe(true);
  });
  it("preserves all Content State targets and region selectors in raw, encoded and viewer URLs", async () => {
    const state = {
      type: "Annotation",
      motivation: ["contentState"],
      target: [
        {
          id: `${manifest}/canvas#xywh=10,20,30,40`,
          type: "Canvas",
          partOf: [{ id: manifest, type: "Manifest" }],
        },
        { id: manifest, type: "Manifest" },
      ],
    };
    for (const input of [
      JSON.stringify(state),
      encodeContentState(JSON.stringify(state)),
      `https://viewer.example/?iiif-content=${encodeURIComponent(encodeContentState(JSON.stringify(state)))}`,
    ]) {
      const resource = await resolveNotebookResource(input);
      expect(resource?.contentState).toEqual(state);
      expect(resource?.targets).toHaveLength(2);
      expect(resource?.targets?.[0]).toMatchObject({
        id: `${manifest}/canvas`,
        xywh: "10,20,30,40",
        parent: { id: manifest, type: "Manifest" },
      });
    }
    expect(
      notebookPaste(JSON.stringify(state))?.[0].content?.[0].attrs?.resource
        .contentState,
    ).toEqual(state);
  });
  it("accepts Content State resource references and arrays without fetching their targets", async () => {
    const references = [
      { id: manifest, type: "Manifest" },
      { id: `${manifest}/collection`, type: "Collection" },
    ];
    expect(
      (
        await resolveNotebookResource(
          encodeContentState(JSON.stringify(references)),
        )
      )?.targets,
    ).toHaveLength(2);
    expect(
      notebookPaste(JSON.stringify(references))?.[0].content?.[0].attrs
        ?.resource.contentState,
    ).toEqual(references);
    expect(
      (await resolveNotebookResource(JSON.stringify(references[0])))
        ?.targets?.[0].id,
    ).toBe(manifest);
  });
  it("rejects unsafe URLs and retains unknown links without treating HTML as IIIF", async () => {
    expect(isNotebookUrl("javascript:alert(1)")).toBe(false);
    expect(isNotebookUrl("https://user:secret@example.org/a")).toBe(false);
    expect(await resolveNotebookResource("javascript:alert(1)")).toBeNull();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<h1>Hello</h1>", {
        headers: { "content-type": "text/html" },
      }),
    );
    expect(await resolveNotebookResource(manifest)).toBeNull();
  });
});

it("prefers notebook resource aliases over duplicate notes, history and collection results", () => {
  const vault = new Vault();
  const emitter = createEmitter({});
  const parent = { id: manifest, type: "Manifest" };
  const history = [
    {
      url: image,
      route: `/image-service?id=${encodeURIComponent(image)}`,
      resource: "https://example.org/image",
      metadata: { type: "ImageService", label: { en: ["Prism"] } },
      parent,
    },
  ];
  const store = createOmnisearchStore({
    vault,
    emitter,
    history: createMemoryHistory(),
    initialHistory: history,
    initialRoute: { url: "iiif://home", route: "/", resource: null },
    staticItems: [],
  });
  const resource = {
    id: "https://example.org/image",
    source: image,
    type: "ImageService" as const,
    label: "Prism",
  };
  const action = vi.fn();
  const preferred = {
    id: "note:first",
    label: "Prism from notes",
    source: "custom" as const,
    type: "action" as const,
    resourceUrls: notebookResourceUrls(resource),
    action,
    showWhenEmpty: true,
  };
  store.getState().setDynamicItems([
    {
      id: resource.id,
      type: "resource",
      source: "collection",
      resource,
      label: "Prism from collection",
    },
  ]);
  store
    .getState()
    .setSupplementalItems("notebook", [
      preferred,
      { ...preferred, id: "note:second" },
    ]);
  for (const query of ["", "Prism", image, resource.id]) {
    store.getState().updateQuery(query);
    expect(store.getState().results).toEqual([preferred]);
  }
  expect(store.getState().getResult(image)).toBe(preferred);
  expect(store.getState().preferredResourceUrls).toEqual([resource.id, image]);
  store.getState().openWithFilter("", "collection");
  expect(store.getState().results).toEqual([preferred]);
  store.getState().setSupplementalItems("notebook", []);
  expect(store.getState().getResult(image)).toMatchObject({
    resource: { id: image },
    parent,
  });
  expect(store.getState().preferredResourceUrls).toEqual([]);
  expect(
    notebookResourceUrls({
      ...resource,
      xywh: "1,2,3,4",
      source: "https://example.org/image/1,2,3,4/max/0/default.jpg",
    }),
  ).not.toContain(image);
});

it("represents notes as nested vault collections, excludes images and preserves loaded Manifests", () => {
  const notebook = createNotebook({ storageKey: false });
  const first = notebook.getState().createNote("project", "Research");
  const second = notebook.getState().createNote("project", "Empty note");
  const add = (resource: any) =>
    notebook
      .getState()
      .appendResource(resource, { noteId: first.id, projectId: "project" });
  add({
    id: manifest,
    source: manifest,
    type: "Manifest",
    label: "Manuscript",
  });
  add({
    id: `${manifest}/canvas`,
    source: `${manifest}/canvas`,
    type: "Canvas",
    parent: { id: manifest, type: "Manifest" },
    label: "Canvas",
  });
  add({ id: image, source: image, type: "ImageService", label: "Image" });
  add({
    id: `${manifest}/collection`,
    source: `${manifest}/collection`,
    type: "Collection",
    label: "Collection",
  });
  const collection = notebookCollection(
    notesForProject(notebook.getState(), "project"),
  );
  expect(collection.items).toHaveLength(2);
  const child = collection.items?.find(
    (item) => item.id === noteUrl(first.id, true),
  ) as any;
  expect(child.items.map((item: any) => item.id)).toEqual([
    manifest,
    `${manifest}/collection`,
  ]);
  const vault = new Vault();
  vault.loadSync(manifest, {
    id: manifest,
    type: "Manifest",
    items: [
      {
        id: `${manifest}/canvas`,
        type: "Canvas",
        width: 100,
        height: 100,
        items: [],
      },
    ],
  });
  loadNotebookCollection(vault, collection);
  expect(vault.get<any>(collection.id).items).toHaveLength(2);
  expect(vault.get<any>(noteUrl(second.id, true)).items).toEqual([]);
  expect(vault.get<any>(manifest).items).toHaveLength(1);
  notebook
    .getState()
    .updateNote(first.id, {
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
  notebook.getState().deleteNote(second.id);
  loadNotebookCollection(
    vault,
    notebookCollection(notesForProject(notebook.getState(), "project")),
  );
  expect(vault.get<any>(collection.id).items).toHaveLength(1);
  expect(vault.get<any>(noteUrl(first.id, true)).items).toHaveLength(0);
});

describe("notebook persistence and project context", () => {
  it("restores each project's last note, appends sources and isolates projects", () => {
    const store = createNotebook({ storageKey: "test-notebook" });
    const first = store.getState().createNote("A", "First note");
    store.getState().createNote("A", "Second note");
    store.getState().createNote("B", "Other project");
    store.getState().openNote(first.id);
    store.getState().appendResource(
      {
        id: manifest,
        source: manifest,
        type: "Manifest",
        label: "Manuscript",
      },
      { projectId: "A" },
    );
    const restored = createNotebook({ storageKey: "test-notebook" });
    expect(currentNote(restored.getState(), "A")?.id).toBe(first.id);
    expect(notesForProject(restored.getState(), "B")).toHaveLength(1);
    expect(searchNotebook(restored, "Manuscript", "A")).toHaveLength(1);
    expect(searchNotebook(restored, "Manuscript", "B")).toHaveLength(0);
    expect(() =>
      store.getState().appendResource(
        {
          id: manifest,
          source: manifest,
          type: "Manifest",
          label: "Wrong project",
        },
        { projectId: "B", noteId: first.id },
      ),
    ).toThrow();
  });
  it("preserves unreadable storage and exposes failures without losing in-memory notes", () => {
    localStorage.setItem("broken", "not json");
    const broken = createNotebook({ storageKey: "broken" });
    broken.getState().createNote();
    expect(localStorage.getItem("broken")).toBe("not json");
    expect(broken.getState().persistenceError).toContain("preserved");
    expect(JSON.parse(broken.getState().exportJSON()).notes).toHaveLength(1);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const full = createNotebook({ storageKey: "full" });
    full.getState().createNote();
    expect(full.getState().persistenceError).toContain("only in memory");
    expect(full.getState().notes).toHaveLength(1);
  });
  it("completes the source's checklist, even after the selection moves; respects read-only and undo", () => {
    const instance = editor({
      type: "doc",
      content: notebookPaste(`[] ${image}\n[] ${manifest}`),
    });
    let position = 0;
    instance.state.doc.descendants((node, pos) => {
      if (node.type.name === "notebookResource" && node.attrs.href === image)
        position = pos;
    });
    instance.commands.setTextSelection(instance.state.doc.content.size - 3);
    expect(setNotebookTaskChecked(instance, position)).toBe(true);
    expect(
      instance
        .getJSON()
        .content?.[0].content?.map((node) => (node as any).attrs?.checked),
    ).toEqual([true, false]);
    instance.commands.undo();
    expect(
      (instance.getJSON().content?.[0].content?.[0] as any).attrs?.checked,
    ).toBe(false);
    instance.setEditable(false);
    expect(setNotebookTaskChecked(instance, position)).toBe(false);
  });
  it("indexes existing image, snippet and virtual collection widgets", () => {
    expect(
      noteResources({
        type: "doc",
        content: [
          {
            type: "iiifSnippet",
            attrs: {
              resourceType: "Canvas",
              manifestId: manifest,
              canvasId: `${manifest}/canvas`,
            },
          },
          {
            type: "iiifImage",
            attrs: { src: "https://example.org/photo.jpg", alt: "Photograph" },
          },
          {
            type: "iiifVirtualCollection",
            attrs: {
              items: JSON.stringify([
                { id: manifest, type: "Manifest", label: { en: ["Source"] } },
              ]),
            },
          },
        ],
      }).map((resource) => resource.type),
    ).toEqual(["Canvas", "Image", "Manifest"]);
  });
  it("keeps notebook search results across collection and page navigation without replacing collection results", () => {
    const emitter = createEmitter({});
    const vault = new Vault();
    const collection = {
      id: "https://example.org/collection",
      type: "Collection" as const,
      items: [
        {
          id: manifest,
          type: "Manifest" as const,
          label: { en: ["Collection manuscript"] },
        },
      ],
    };
    vault.loadSync(collection.id, collection);
    const store = createOmnisearchStore({
      vault,
      emitter,
      history: createMemoryHistory(),
      initialRoute: { url: "iiif://home", route: "/", resource: null },
      initialHistory: [],
      staticItems: [],
    });
    const action = vi.fn();
    store.getState().setSupplementalItems("notebook", [
      {
        id: "note:1",
        label: "Notebook manuscript",
        source: "custom",
        type: "action",
        action,
      },
    ]);
    emitter.emit("collection.change", {
      id: collection.id,
      type: "Collection",
    });
    store.getState().updateQuery("manuscript");
    expect(
      store
        .getState()
        .results?.map((item) => item.label)
        .sort(),
    ).toEqual(["Collection manuscript", "Notebook manuscript"]);
    emitter.emit("history.page", { url: "iiif://home", route: "/" });
    store.getState().updateQuery("manuscript");
    expect(store.getState().results).toHaveLength(1);
    store.getState().setSupplementalItems("notebook", []);
    expect(store.getState().results).toHaveLength(0);
  });
});

it("shares external saves between mounted editors without changing a read-only note on mount", async () => {
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { IIIFNotebook } = await import("../src/notebook/Notebook");
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const store = createNotebook({ storageKey: false });
  const note = store.getState().createNote("project", "Shared research");
  const before = store.getState().notes;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const errors = vi.spyOn(console, "error");
  try {
    await act(async () =>
      root.render(
        createElement(
          "div",
          {},
          createElement(IIIFNotebook, {
            notebook: store,
            projectId: "project",
          }),
          createElement(IIIFNotebook, {
            notebook: store,
            projectId: "project",
            readOnly: true,
          }),
        ),
      ),
    );
    expect(store.getState().notes).toBe(before);
    expect(
      container.querySelectorAll('[aria-label="Note content"]'),
    ).toHaveLength(2);
    await act(async () => {
      store.getState().appendResource(
        {
          id: manifest,
          source: manifest,
          type: "Manifest",
          label: "Shared source",
        },
        { noteId: note.id, projectId: "project" },
      );
    });
    for (const editor of container.querySelectorAll(
      '[aria-label="Note content"]',
    ))
      expect(editor.textContent).toContain("Shared source");
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes("flushSync")),
    ).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it("switches a checklist source between text and existing rich widgets without losing provenance or task identity", () => {
  const resource = {
    id: image,
    source: image,
    type: "ImageService",
    label: "Source image",
    image: "https://example.org/image/full/max/0/default.jpg",
  };
  const instance = editor({
    type: "doc",
    content: [
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "notebookResource",
                    attrs: { href: image, resource },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const position = (type: string) => {
    let found = -1;
    instance.state.doc.descendants((node, pos) => {
      if (node.type.name === type) found = pos;
    });
    return found;
  };
  expect(
    setNotebookResourceView(instance, position("notebookResource"), "rich"),
  ).toBe(true);
  expect(position("iiifImage")).toBeGreaterThan(0);
  expect(noteResources(instance.getJSON())).toEqual([resource]);
  const imagePosition = position("iiifImage");
  instance.view.dispatch(
    instance.state.tr.setNodeMarkup(imagePosition, undefined, {
      ...instance.state.doc.nodeAt(imagePosition)!.attrs,
      width: 320,
    }),
  );
  const roundTrip = editor(instance.getHTML());
  expect(noteResources(roundTrip.getJSON())).toEqual([resource]);
  expect(
    setNotebookTaskChecked(instance, position("notebookResourceBlock"), false),
  ).toBe(true);
  expect(instance.state.doc.nodeAt(position("taskItem"))?.attrs.checked).toBe(
    false,
  );
  expect(
    setNotebookResourceView(
      instance,
      position("notebookResourceBlock"),
      "text",
    ),
  ).toBe(true);
  expect(position("iiifImage")).toBe(-1);
  expect(noteResources(instance.getJSON())).toEqual([resource]);
  expect(instance.state.doc.nodeAt(position("taskItem"))?.childCount).toBe(1);
  const textRoundTrip = editor(instance.getHTML());
  let sourcePosition = -1;
  textRoundTrip.state.doc.descendants((node, pos) => {
    if (node.type.name === "notebookResource") sourcePosition = pos;
  });
  expect(setNotebookResourceView(textRoundTrip, sourcePosition, "rich")).toBe(
    true,
  );
  expect(noteResources(textRoundTrip.getJSON())).toEqual([resource]);
  let restoredWidth = 0;
  textRoundTrip.state.doc.descendants((node) => {
    if (node.type.name === "iiifImage") restoredWidth = node.attrs.width;
  });
  expect(restoredWidth).toBe(320);
  instance.commands.undo();
  expect(position("iiifImage")).toBeGreaterThan(0);
  instance.setEditable(false);
  expect(
    setNotebookResourceView(
      instance,
      position("notebookResourceBlock"),
      "text",
    ),
  ).toBe(false);
});
it("persists paragraph and heading alignment through HTML", () => {
  const instance = editor(
    '<h1 style="text-align:center">Title</h1><p style="text-align:right">Caption</p>',
  );
  expect(
    instance.getJSON().content?.map((node) => node.attrs?.textAlign),
  ).toEqual(["center", "right"]);
  expect(editor(instance.getHTML()).getJSON()).toEqual(instance.getJSON());
});

it("persists workspace and note views with independent local-storage restore/save options", () => {
  const options = {
    localStorageKey: "notebook-views",
    restoreFromLocalStorage: true,
    saveToLocalStorage: true,
  };
  const first = createNotebook(options);
  const note = first.getState().createNote("project", "Keep my place");
  first.getState().setWorkspaceView("project", {
    query: "Keep",
    sidebarWidth: 320,
    sidebarCollapsed: true,
  });
  first.getState().setNoteView(note.id, { scrollTop: 240, anchor: 1, head: 1 });
  const restored = createNotebook(options).getState();
  expect(currentNote(restored, "project")?.id).toBe(note.id);
  expect(restored.views[JSON.stringify("project")]).toMatchObject({
    query: "Keep",
    sidebarWidth: 320,
    sidebarCollapsed: true,
  });
  expect(restored.noteViews[note.id].scrollTop).toBe(240);
  const unsaved = createNotebook({ ...options, saveToLocalStorage: false });
  unsaved.getState().updateNote(note.id, { title: "Temporary" });
  expect(createNotebook(options).getState().notes[0].title).toBe(
    "Keep my place",
  );
  expect(
    createNotebook({ ...options, restoreFromLocalStorage: false }).getState()
      .notes,
  ).toHaveLength(0);
});
it("inserts labelled IIIF links in a plain Tiptap editor and notebook resource nodes in the notebook", async () => {
  const { IIIFLink } = await import("../src/tiptap/link");
  const resource = {
    id: manifest,
    source: manifest,
    type: "Manifest" as const,
    label: "A labelled manuscript",
  };
  const plain = new Editor({
    extensions: [StarterKit, IIIFLink],
    content: "<p></p>",
  });
  editors.push(plain);
  expect(plain.commands.insertIIIFLink(resource)).toBe(true);
  expect(plain.getHTML()).toContain('href="https://example.org/manifest"');
  expect(plain.getText()).toBe(resource.label);
  const notebook = editor();
  expect(notebook.commands.insertIIIFLink(resource)).toBe(true);
  expect(noteResources(notebook.getJSON())).toEqual([resource]);
  notebook.setEditable(false);
  expect(notebook.commands.insertIIIFLink(resource)).toBe(false);
  expect(
    plain.commands.insertIIIFLink({
      ...resource,
      source: "javascript:alert(1)",
    }),
  ).toBe(false);
});
it("renders Content State crops using Canvas-to-image coordinates and preserves the original state", async () => {
  const { notebookSelection } = await import("../src/notebook/selection");
  const { enrichNotebookCrops } = await import("../src/notebook/crops");
  const canvasId = `${manifest}/canvas`;
  const data = {
    id: manifest,
    type: "Manifest",
    label: { en: ["Manuscript"] },
    items: [
      {
        id: canvasId,
        type: "Canvas",
        width: 1000,
        height: 500,
        items: [
          {
            id: `${manifest}/page`,
            type: "AnnotationPage",
            items: [
              {
                id: `${manifest}/painting`,
                type: "Annotation",
                motivation: "painting",
                target: canvasId,
                body: {
                  id: "https://example.org/image.jpg",
                  type: "Image",
                  width: 2000,
                  height: 1000,
                  service: [
                    {
                      id: "https://example.org/image",
                      type: "ImageService3",
                      profile: "level2",
                      width: 2000,
                      height: 1000,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
  const vault = new Vault();
  vault.loadSync(manifest, structuredClone(data));
  const selected = {
    id: canvasId,
    type: "Canvas",
    parent: { id: manifest, type: "Manifest" },
    selector: {
      type: "BoxSelector" as const,
      spatial: { x: 100, y: 50, width: 200, height: 100 },
    },
  };
  const link = await notebookSelection(selected, vault, "crop");
  expect(link.label).toBe("Manuscript");
  expect(link.image).toContain("/200,100,400,200/");
  expect((link.contentState as any).target.id).toBe(
    `${canvasId}#xywh=100,50,200,100`,
  );
  const serviceSelection = {
    ...selected,
    id: "https://example.org/image",
    type: "ImageService",
  };
  expect(outputTypesForItem(serviceSelection)).toContain("ImageServiceRegion");
  const imageCrop = await notebookSelection(serviceSelection, vault, "crop");
  expect(imageCrop.source).toContain("/100,50,200,100/200,/0/default.jpg");
  const raw = await resolveNotebookResource(link.source);
  const enriched = await enrichNotebookCrops(raw!, {}, vault);
  expect(enriched.contentState).toEqual(link.contentState);
  expect(enriched.image).toBe(link.image);
  const instance = editor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "notebookResource",
            attrs: { href: enriched.source, resource: enriched },
          },
        ],
      },
    ],
  });
  expect(setNotebookResourceView(instance, 1, "rich")).toBe(true);
  expect(instance.getJSON().content?.[0].content?.[0].type).toBe(
    "notebookCrop",
  );
  const network = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(data)));
  const signal = new AbortController().signal;
  expect(
    (await enrichNotebookCrops(raw!, { requestInitOptions: { signal } })).image,
  ).toBe(link.image);
  expect(network).toHaveBeenCalledWith(manifest, { signal });
});

it("loads saved links on first focus, caches previews, and labels pasted links immediately", async () => {
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { IIIFNotebook } = await import("../src/notebook/Notebook");
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const store = createNotebook({ storageKey: false });
  const note = store.getState().createNote();
  store.getState().updateNote(note.id, {
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "notebookResource",
              attrs: { href: manifest, label: "My catalogue reference" },
            },
          ],
        },
      ],
    },
  });
  const resolveResource = vi.fn(async (source: string) => ({
    id: source,
    source,
    type: "Manifest" as const,
    label: "Resolved manuscript",
  }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        createElement(IIIFNotebook, { notebook: store, resolveResource }),
      ),
    );
    expect(resolveResource).not.toHaveBeenCalled();
    await act(async () =>
      (container.querySelector(`a[href="${manifest}"]`) as HTMLElement).focus(),
    );
    expect(resolveResource).toHaveBeenCalledTimes(1);
    expect(container.querySelector(`a[href="${manifest}"]`)?.textContent).toBe(
      "My catalogue reference",
    );
    await act(async () => root.render(null));
    await act(async () =>
      root.render(
        createElement(IIIFNotebook, { notebook: store, resolveResource }),
      ),
    );
    await act(async () =>
      (container.querySelector(`a[href="${manifest}"]`) as HTMLElement).focus(),
    );
    expect(resolveResource).toHaveBeenCalledTimes(1);
    const instance = (container.querySelector(".tiptap") as any)
      .editor as Editor;
    await act(async () => {
      instance.commands.setTextSelection(instance.state.doc.content.size - 1);
      instance.view.someProp("handlePaste", (handler) =>
        handler(
          instance.view,
          {
            clipboardData: {
              getData: (type: string) =>
                type === "text/plain" ? `${manifest}/pasted` : "",
            },
          } as unknown as ClipboardEvent,
          null as never,
        ),
      );
    });
    expect(resolveResource).toHaveBeenCalledTimes(2);
    expect(
      container.querySelector(`a[href="${manifest}/pasted"]`)?.textContent,
    ).toBe("Resolved manuscript");
    let finish!: (value: Awaited<ReturnType<typeof resolveResource>>) => void;
    resolveResource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => {
      instance.commands.insertContent(
        notebookPaste(`${manifest}/slow`)![0].content!,
      );
    });
    await act(async () => {
      instance.state.doc.descendants((node, pos) => {
        if (node.attrs.href === `${manifest}/slow`)
          instance.view.dispatch(
            instance.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              label: "Edited while loading",
            }),
          );
      });
      finish({
        id: `${manifest}/slow`,
        source: `${manifest}/slow`,
        type: "Manifest",
        label: "Late resource title",
      });
    });
    expect(
      container.querySelector(`a[href="${manifest}/slow"]`)?.textContent,
    ).toBe("Edited while loading");
    expect(instance.getHTML()).toContain(
      'data-link-label="Edited while loading"',
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it("restores the notebook's selection and scroll after unmounting and recreating its store", async () => {
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { IIIFNotebook } = await import("../src/notebook/Notebook");
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const store = createNotebook({ localStorageKey: "remount-notebook" });
  const note = store.getState().createNote(undefined, "Long note");
  store.getState().updateNote(note.id, {
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Remember this selection and scroll position",
            },
          ],
        },
      ],
    },
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(createElement(IIIFNotebook, { notebook: store })),
    );
    const editor = (container.querySelector(".tiptap") as any).editor as Editor;
    await act(async () => {
      editor.view.dom.focus();
      editor.commands.setTextSelection(10);
      const viewport = container.querySelector(".iiif-notebook__content")!;
      viewport.scrollTop = 180;
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await act(async () => root.render(null));
    const restored = createNotebook({ localStorageKey: "remount-notebook" });
    expect(restored.getState().noteViews[note.id]).toMatchObject({
      anchor: 10,
      head: 10,
      scrollTop: 180,
    });
    await act(async () =>
      root.render(createElement(IIIFNotebook, { notebook: restored })),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(
      (container.querySelector(".tiptap") as any).editor.state.selection.anchor,
    ).toBe(10);
    expect(container.querySelector(".iiif-notebook__content")?.scrollTop).toBe(
      180,
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
