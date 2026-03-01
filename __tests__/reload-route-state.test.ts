import { createEmitter } from "../src/v2/events";
import { getReloadRequest } from "../src/v2/browser/BrowserReloadButton";
import {
  createBrowserStore,
  type BrowserStoreConfig,
  type HistoryItem,
} from "../src/v2/stores/browser-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createHistoryItem(route: string, url: string): HistoryItem {
  return {
    route,
    url,
    resource: null,
    timestamp: new Date().toISOString(),
  };
}

const baseConfig: Omit<
  BrowserStoreConfig,
  "initialHistory" | "initialHistoryCursor"
> = {
  historyLimit: 100,
  restoreFromLocalStorage: false,
  saveToLocalStorage: false,
  localStorageKey: "@test/reload-route-state",
  collectionUrlMapping: {},
  collectionUrlMappingParams: {},
  seedCollections: [],
};

{
  const request = getReloadRequest(new URLSearchParams("canvas=canvas-1"));
  assert(request === null, "Expected reload request to be null when id is missing");
}

{
  const request = getReloadRequest(
    new URLSearchParams(
      "id=https://example.org/manifest&canvas=canvas-1&xywh=10,20,30,40&view-source=true",
    ),
  );
  assert(request !== null, "Expected reload request to be created");
  assert(
    request.id === "https://example.org/manifest",
    "Expected request to preserve id",
  );
  assert(request.viewSource, "Expected request to preserve view-source flag");
  assert(
    request.searchParams.get("canvas") === "canvas-1",
    "Expected request to preserve canvas",
  );
  assert(
    request.searchParams.get("xywh") === "10,20,30,40",
    "Expected request to preserve xywh",
  );
}

{
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
  assert(request !== null, "Expected reload request to be created for seed route");

  await store.getState().loadResource(request.id, {
    viewSource: request.viewSource,
    searchParams: request.searchParams,
  });

  const location = store.getState().history.location;
  assert(
    location.pathname === "/collection",
    "Expected reload path to resolve to collection route",
  );

  const params = new URLSearchParams(location.search);
  assert(
    params.get("id") === "https://example.org/collection",
    "Expected reload path to retain id",
  );
  assert(
    params.get("canvas") === "https://example.org/canvas/1",
    "Expected reload path to retain canvas",
  );
  assert(
    params.get("xywh") === "10,20,30,40",
    "Expected reload path to retain xywh",
  );
  assert(
    params.get("view-source") === "true",
    "Expected reload path to retain view-source",
  );
}

console.log("reload-route-state tests passed");
