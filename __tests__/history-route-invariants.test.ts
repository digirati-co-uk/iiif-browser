import { describe, expect, it } from "vitest";
import { Vault } from "@iiif/helpers";
import { getForwardHistoryList } from "../src/browser/BrowserForwardButton";
import { getActiveHistoryEntry } from "../src/context";
import { createEmitter } from "../src/events";
import {
  type BrowserStoreConfig,
  createBrowserStore,
  type HistoryItem,
} from "../src/stores/browser-store";

const baseConfig: Omit<
  BrowserStoreConfig,
  "initialHistory" | "initialHistoryCursor"
> = {
  historyLimit: 100,
  restoreFromLocalStorage: false,
  saveToLocalStorage: false,
  localStorageKey: "@test/history-invariants",
  collectionUrlMapping: {},
  collectionUrlMappingParams: {},
  seedCollections: [],
};

function createHistoryItem(route: string, url: string): HistoryItem {
  return {
    route,
    url,
    resource: null,
    timestamp: new Date().toISOString(),
  };
}

describe("history route invariants", () => {
  it("routes an unfetchable Canvas identifier through its Manifest in the shared vault", async () => {
    const vault = new Vault();
    const manifest = "https://example.org/manifest";
    const canvas = `${manifest}/canvas`;
    vault.loadSync(manifest, {
      id: manifest,
      type: "Manifest",
      items: [
        { id: canvas, type: "Canvas", width: 100, height: 100, items: [] },
      ],
    });
    const store = createBrowserStore({
      ...baseConfig,
      emitter: createEmitter({}),
      vault,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 0,
    });
    await store.getState().resolve(canvas);
    const { pathname, search } = store.getState().history.location;
    expect(pathname).toBe("/loading");
    expect(new URLSearchParams(search).get("id")).toBe(manifest);
    expect(new URLSearchParams(search).get("canvas")).toBe(canvas);
  });
  it("navigates custom pages through internal URLs and restores them with Back and Forward", async () => {
    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 0,
      customRoutes: { "iiif://notes": "/notes" },
    });
    await store.getState().resolve("iiif://notes");
    expect(store.getState().router.location.pathname).toBe("/notes");
    expect(store.getState().lastUrl).toBe("iiif://notes");
    expect(store.getState().mapToRoute("/notes", "")).toEqual([
      "iiif://notes",
      null,
    ]);
    await store.getState().resolve("iiif://home");
    store.getState().history.back();
    expect(store.getState().lastUrl).toBe("iiif://notes");
    store.getState().history.forward();
    expect(store.getState().lastUrl).toBe("iiif://home");
    await store.getState().resolve("iiif://notes?note=first&view=collection");
    expect(store.getState().history.location.pathname).toBe("/notes");
    expect(store.getState().lastUrl).toBe(
      "iiif://notes?note=first&view=collection",
    );
    await store.getState().resolve("iiif://notes?note=second");
    store.getState().history.back();
    expect(store.getState().lastUrl).toBe(
      "iiif://notes?note=first&view=collection",
    );
    store.getState().history.forward();
    expect(store.getState().lastUrl).toBe("iiif://notes?note=second");
  });
  it("keeps duplicate route entries in forward/back traversal", () => {
    const historyItems = [
      createHistoryItem("/", "iiif://home"),
      createHistoryItem("/about", "iiif://about"),
      createHistoryItem("/", "iiif://home"),
    ];

    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: historyItems,
      initialHistoryCursor: 1,
    });

    store.getState().history.forward();
    expect(store.getState().historyIndex).toBe(2);

    store.getState().history.back();
    expect(store.getState().historyIndex).toBe(1);
  });

  it("falls back to first entry when index is invalid", () => {
    const historyItems = [
      createHistoryItem("/", "iiif://home"),
      createHistoryItem("/about", "iiif://about"),
      createHistoryItem("/history", "iiif://history"),
    ];

    expect(getActiveHistoryEntry(historyItems, 2).route).toBe("/history");
    expect(getActiveHistoryEntry(historyItems, 999).route).toBe("/");
  });

  it("clamps an out-of-range initial history cursor", () => {
    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 1,
    });

    expect(store.getState().historyIndex).toBe(0);
    expect(store.getState().lastUrl).toBe("iiif://home");
  });

  it("applies the configured initial page when ready", () => {
    const emitter = createEmitter({});
    const store = createBrowserStore({
      emitter,
      ...baseConfig,
      initialHistory: [
        createHistoryItem("/", "iiif://home"),
        createHistoryItem("/about", "iiif://about"),
      ],
      initialHistoryCursor: 1,
    });

    emitter.emit("ready");

    expect(store.getState().router.location.pathname).toBe("/about");
    expect(store.getState().historyIndex).toBe(1);
    expect(store.getState().lastUrl).toBe("iiif://about");
  });

  it("does not treat a seeded manifest reference as loaded while resolving it", async () => {
    const manifestId = "https://example.org/manifest";
    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 0,
      seedCollections: [
        {
          id: "https://example.org/collection",
          type: "Collection",
          label: { en: ["Example collection"] },
          items: [
            {
              id: manifestId,
              type: "Manifest",
              label: { en: ["Manifest reference"] },
            },
          ],
        } as any,
      ],
    });

    await store.getState().resolve(manifestId);
    await store.getState().resolve(manifestId);

    expect(store.getState().history.location.pathname).toBe("/loading");
    expect(store.getState().loaded[manifestId]).toBeUndefined();
  });

  it("returns forward entries in nearest order with a maximum size", () => {
    const historyItems = Array.from({ length: 12 }, (_, index) =>
      createHistoryItem(`/route-${index}`, `iiif://route-${index}`),
    );

    const forwardFromFirst = getForwardHistoryList(historyItems, 1);
    expect(forwardFromFirst).toHaveLength(10);
    expect(forwardFromFirst[0]?.route).toBe("/route-2");
    expect(forwardFromFirst[9]?.route).toBe("/route-11");

    const forwardNearEnd = getForwardHistoryList(historyItems, 8);
    expect(forwardNearEnd).toHaveLength(3);
  });
});
