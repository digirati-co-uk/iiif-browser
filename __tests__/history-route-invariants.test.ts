import { describe, expect, it } from "vitest";
import { getForwardHistoryList } from "../src/browser/BrowserForwardButton";
import { getActiveHistoryEntry } from "../src/context";
import { createEmitter } from "../src/events";
import {
  createBrowserStore,
  type BrowserStoreConfig,
  type HistoryItem,
} from "../src/stores/browser-store";

const baseConfig: Omit<BrowserStoreConfig, "initialHistory" | "initialHistoryCursor"> = {
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
