import { getForwardHistoryList } from "../src/v2/browser/BrowserForwardButton";
import { getActiveHistoryEntry } from "../src/v2/context";
import { createEmitter } from "../src/v2/events";
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

{
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
  assert(
    store.getState().historyIndex === 2,
    "Expected forward POP to select second duplicate route entry",
  );

  store.getState().history.back();
  assert(
    store.getState().historyIndex === 1,
    "Expected back POP to return to the previous stack position",
  );
}

{
  const historyItems = [
    createHistoryItem("/", "iiif://home"),
    createHistoryItem("/about", "iiif://about"),
    createHistoryItem("/history", "iiif://history"),
  ];

  assert(
    getActiveHistoryEntry(historyItems, 2).route === "/history",
    "Expected active-route selector to return current history index entry",
  );
  assert(
    getActiveHistoryEntry(historyItems, 999).route === "/",
    "Expected active-route selector to fall back to first entry when index is invalid",
  );
}

{
  const historyItems = Array.from({ length: 12 }, (_, index) =>
    createHistoryItem(`/route-${index}`, `iiif://route-${index}`),
  );

  const forwardFromFirst = getForwardHistoryList(historyItems, 1);
  assert(
    forwardFromFirst.length === 10,
    "Expected forward list to include up to ten entries after the current index",
  );
  assert(
    forwardFromFirst[0]?.route === "/route-2" &&
      forwardFromFirst[9]?.route === "/route-11",
    "Expected forward list to preserve nearest-forward ordering",
  );

  const forwardNearEnd = getForwardHistoryList(historyItems, 8);
  assert(
    forwardNearEnd.length === 3,
    "Expected forward list to contain only remaining entries near history tail",
  );
}
