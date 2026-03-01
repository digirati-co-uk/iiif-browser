import { describe, expect, it } from "vitest";
import { createEmitter } from "../src/events";
import { getReloadRequest } from "../src/browser/BrowserReloadButton";
import {
  createBrowserStore,
  type BrowserStoreConfig,
  type HistoryItem,
} from "../src/stores/browser-store";

function createHistoryItem(route: string, url: string): HistoryItem {
  return {
    route,
    url,
    resource: null,
    timestamp: new Date().toISOString(),
  };
}

const baseConfig: Omit<BrowserStoreConfig, "initialHistory" | "initialHistoryCursor"> =
  {
    historyLimit: 100,
    restoreFromLocalStorage: false,
    saveToLocalStorage: false,
    localStorageKey: "@test/reload-route-state",
    collectionUrlMapping: {},
    collectionUrlMappingParams: {},
    seedCollections: [],
  };

describe("reload route state", () => {
  it("returns null when required reload params are absent", () => {
    const request = getReloadRequest(new URLSearchParams("canvas=canvas-1"));
    expect(request).toBeNull();
  });

  it("builds a reload request from search params", () => {
    const request = getReloadRequest(
      new URLSearchParams(
        "id=https://example.org/manifest&canvas=canvas-1&xywh=10,20,30,40&view-source=true",
      ),
    );

    expect(request).not.toBeNull();
    expect(request?.id).toBe("https://example.org/manifest");
    expect(request?.viewSource).toBe(true);
    expect(request?.searchParams.get("canvas")).toBe("canvas-1");
    expect(request?.searchParams.get("xywh")).toBe("10,20,30,40");
  });

  it("restores reload navigation including collection and view parameters", async () => {
    const seededCollection = {
      id: "https://example.org/collection",
      type: "Collection",
      items: [],
      label: { en: ["Example collection"] },
    };

    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 0,
      seedCollections: [seededCollection as any],
    });

    const request = getReloadRequest(
      new URLSearchParams(
        "id=https://example.org/collection&canvas=https://example.org/canvas/1&xywh=10,20,30,40&view-source=true",
      ),
    );

    expect(request).not.toBeNull();

    await store.getState().loadResource(request?.id ?? "", {
      viewSource: request?.viewSource,
      searchParams: request?.searchParams ?? new URLSearchParams(),
    });

    const location = store.getState().history.location;
    expect(location.pathname).toBe("/collection");

    const params = new URLSearchParams(location.search);
    expect(params.get("id")).toBe("https://example.org/collection");
    expect(params.get("canvas")).toBe("https://example.org/canvas/1");
    expect(params.get("xywh")).toBe("10,20,30,40");
    expect(params.get("view-source")).toBe("true");
  });
});
