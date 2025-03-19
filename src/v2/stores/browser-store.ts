import {
  type BoxSelector,
  Vault,
  expandTarget,
  getValue,
  parseSelector,
} from "@iiif/helpers";
import { upgrade } from "@iiif/parser/upgrader";
import type {
  Collection,
  InternationalString,
  Manifest,
} from "@iiif/presentation-3";
import type {
  CollectionNormalized,
  ManifestNormalized,
} from "@iiif/presentation-3-normalized";
import { Action, type History, createMemoryHistory } from "history";
import { createStore } from "zustand/vanilla";
import type { BrowserEmitter } from "../events";
import { routes } from "../routes";
import { applyIdMapping } from "../utilities/apply-id-mapping";
import { selectorFromXYWH } from "../utilities/selector-from-xywh";

// Things the store needs to do:
// - Handle conversion of URLs to Routes
// - Keep track of which resources are loaded.
// - Handle errors and retries for failed requests.
export type BrowserStore = {
  vault: Vault;
  history: History;
  router: {
    action: History["action"];
    location: History["location"];
  };

  historyIndex: number;
  historyList: HistoryItem[];
  linearHistory: HistoryItem[];

  lastUrl: string;
  browserState: BrowserState;

  loaded: Record<string, LoadedResource>;

  // Actions.
  resolve(
    url: string,
    options?: {
      force?: boolean;
      parent?: { id: string; type: string };
      searchParams?: URLSearchParams;
    },
  ): Promise<void>;
  loadResource(
    url: string,
    options?: {
      parent?: { id: string; type: string };
      searchParams?: URLSearchParams;
      viewSource?: boolean;
      abortController?: AbortController;
    },
  ): Promise<void>;
  getLoadedResource(url: string): LoadedResource | undefined;
  mapToRoute(
    path: string,
    search: string,
  ): [
    string | null,
    null | { id: string; type: string; label?: InternationalString },
  ];

  // Omnibar state.
  omnibarValue: string;
  setOmnibarValue(value: string): void;
  clearHistory(): void;
  updateHistoryMetadata(
    id: string,
    metadata: { type?: string; label?: InternationalString },
  ): void;
  persistHistory(): void;
};

export type LoadedResource = {
  resource: null | {
    id: string;
    type: string;
    label: InternationalString;
  };
  url: string;
  error: string | null;
  retries: number;
};

export type HistoryItem = {
  /* e.g. https://example.org/manifest.json */
  url: string;
  /* e.g. /manifest?id=https://example.org/manifest.json */
  route: string;
  resource: null | string;
  parent?: { id: string; type: string };
  // For presentation purposes.
  metadata?: {
    type?: string;
    label?: InternationalString;
  };
  timestamp?: string | null;
};

export type BrowserState = "IDLE" | "LOADING" | "LOADED" | "ERROR" | "RETRYING";

export type CreateBrowserStoreOptions = {
  emitter: BrowserEmitter;
  vault?: Vault;
  debug?: boolean;
} & BrowserStoreConfig;

export type BrowserStoreConfig = {
  requestInitOptions?: RequestInit;
  initialHistory: Array<HistoryItem>;
  initialHistoryCursor: number;
  historyLimit: number;
  restoreFromLocalStorage: boolean;
  saveToLocalStorage: boolean;
  localStorageKey: string;

  preprocessManifest?: (manifest: Manifest) => Promise<Manifest>;
  preprocessCollection?: (collection: Collection) => Promise<Collection>;
  beforeFetchUrl?: (url: string) => Promise<string>;
  collectionUrlMapping: Record<string, string>;
  collectionUrlMappingParams: Record<string, string>;
  seedCollections: Array<Collection>;
};

export function getLocalStorageLinearHistory(
  defaultHistory: HistoryItem[],
  {
    key = "@v1/iiif-browser-linear-history",
  }: {
    key?: string;
  },
) {
  try {
    const history = localStorage.getItem(key) || "[]";
    const foundHistory = JSON.parse(history) as HistoryItem[];
    return foundHistory.length === 0 ? defaultHistory : foundHistory;
  } catch (error) {
    return defaultHistory;
  }
}

function setLocalStorageLinearHistory(
  allHistory: HistoryItem[],
  {
    key = "@v1/iiif-browser-linear-history",
    limit = 100,
  }: { key?: string; limit?: number } = {},
) {
  const historyItems = allHistory.slice(0, limit);
  try {
    localStorage.setItem(key, JSON.stringify(historyItems));
  } catch (error) {
    // ignore.
  }
}

function getLocalStorageHistory(
  defaultHistory: HistoryItem[],
  options: { key?: string } = {},
): {
  history: HistoryItem[];
  cursor: number;
} {
  const { key = "@v1/iiif-browser-history" } = options;

  try {
    const history = localStorage.getItem(key) || "[]";
    const foundHistory = JSON.parse(history) as {
      history: HistoryItem[];
      cursor: number;
    };

    return foundHistory.history.length === 0
      ? {
          history: defaultHistory,
          cursor: 0,
        }
      : foundHistory;
  } catch (error) {
    //
    return {
      history: defaultHistory,
      cursor: 0,
    };
  }
}

function setLocalStorageHistory(
  allHistory: {
    history: HistoryItem[];
    cursor: number;
  },
  options: { key?: string; limit?: number } = {},
) {
  const { key = "@v1/iiif-browser-history", limit = 100 } = options;

  const historyItems = allHistory.history.slice(0, limit);
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        history: historyItems,
        cursor: allHistory.cursor,
      }),
    );
  } catch (error) {
    // ignore.
  }
}

function getInitialHistory(options: CreateBrowserStoreOptions): readonly [
  History,
  {
    savedHistory: HistoryItem[];
    initialIndex: number;
    initialPage: HistoryItem;
    linearHistory: HistoryItem[];
  },
] {
  const {
    historyLimit,
    initialHistory,
    initialHistoryCursor,
    localStorageKey,
    restoreFromLocalStorage,
    saveToLocalStorage,
  } = options;

  const nonEmptyInitialHistory =
    initialHistory.length === 0
      ? [
          {
            resource: null,
            route: "/",
            url: "iiif://home",
            timestamp: new Date().toISOString(),
          },
        ]
      : initialHistory;

  if (!restoreFromLocalStorage) {
    const history = createMemoryHistory({
      initialEntries: nonEmptyInitialHistory.map((item) => item.route),
      initialIndex: initialHistoryCursor,
    });
    return [
      history,
      {
        savedHistory: [],
        initialIndex: initialHistoryCursor,
        initialPage: nonEmptyInitialHistory[initialHistoryCursor]!,
        linearHistory: [],
      },
    ];
  }

  const {
    //
    history: savedHistory,
    cursor: initialIndex,
  } = getLocalStorageHistory(nonEmptyInitialHistory, {
    key: `${localStorageKey}_history`,
  });
  const linearHistory = getLocalStorageLinearHistory(nonEmptyInitialHistory, {
    key: `${localStorageKey}_linear`,
  });
  const initialPage = savedHistory[initialIndex]!;
  const initialEntries = savedHistory.map((item) => item.route);

  const history = createMemoryHistory({
    initialEntries,
    initialIndex,
  });

  return [
    history,
    {
      savedHistory,
      initialIndex,
      initialPage,
      linearHistory,
    },
  ];
}

export function createBrowserStore(options: CreateBrowserStoreOptions) {
  const {
    vault = new Vault(),
    requestInitOptions = {},
    emitter,
    preprocessManifest,
    preprocessCollection,
    collectionUrlMapping,
    collectionUrlMappingParams,
    seedCollections = [],
    saveToLocalStorage,
    localStorageKey,
    beforeFetchUrl,
    debug = false,
  } = options;

  const [
    history,
    {
      //
      initialIndex,
      initialPage,
      linearHistory,
      savedHistory,
    },
  ] = getInitialHistory(options);

  const hasMappingRules =
    Object.keys(options.collectionUrlMapping || {}).length > 0;

  let requestAbortController: AbortController | undefined;

  const fixedRoutes = routes.filter((route) => route.type === "fixed");
  const resourceRoutes = routes.filter((route) => route.type === "resource");
  const notFound404 = fixedRoutes.find((route) => route.fallback)!;

  const store = createStore<BrowserStore>((set, get) => {
    const initialLoaded: Record<string, LoadedResource> = {};

    // Load seed collections.
    for (const seedCollection of seedCollections) {
      vault.loadSync(seedCollection.id, seedCollection);

      initialLoaded[seedCollection.id] = {
        url: seedCollection.id,
        error: null,
        resource: {
          id: seedCollection.id,
          type: seedCollection.type,
          label: seedCollection.label,
        },
        retries: 0,
      };
    }

    const browserError = (_id?: string, replace?: boolean) => {
      set({ browserState: "ERROR" });
      if (replace) {
        history.replace(notFound404.url);
      } else {
        history.push(notFound404.url);
      }
    };
    const browserResourceError = (
      url: string,
      error: string,
      replace = false,
    ) => {
      console.log(error);
      set((state) => ({
        browserState: "ERROR",
        loaded: {
          ...state.loaded,
          [url]: {
            url,
            error,
            resource: null,
            retries: 0,
            retrying: false,
          },
        },
      }));
      if (replace) {
        history.replace(`${notFound404.url}?id=${encodeURIComponent(url)}`);
      } else {
        history.push(`${notFound404.url}?id=${encodeURIComponent(url)}`);
      }
    };
    const browserSuccess = (
      lastUrl?: string,
      resource?: {
        id: string;
        type: string;
        label?: InternationalString | null;
        selector?: BoxSelector | null;
      },
      viewSource?: boolean,
      parent?: {
        id: string;
        type: string;
        label?: InternationalString | null;
      },
    ) => {
      const state: Partial<BrowserStore> = {
        browserState: "LOADED",
      };
      if (lastUrl) {
        state.lastUrl = viewSource ? `view-source:${lastUrl}` : lastUrl;
        state.omnibarValue = lastUrl;
      }
      if (resource) {
        state.loaded = {
          ...get().loaded,
          [resource.id]: {
            url: resource.id,
            error: null,
            resource: {
              id: resource.id,
              type: resource.type,
              label: resource.label || { en: ["Untitled"] },
            },
            retries: 0,
          },
        };
      }
      set(state);

      if (resource?.type === "Collection") {
        emitter.emit("collection.change", {
          id: resource.id,
          type: resource.type,
          label: resource.label || { en: ["Untitled"] },
        });
      }
      if (resource?.type === "Manifest") {
        emitter.emit("manifest.change", {
          id: resource.id,
          type: resource.type,
          label: resource.label || { en: ["Untitled"] },
        });
      }
      if (resource?.type === "Canvas") {
        emitter.emit("canvas.change", {
          id: resource.id,
          type: resource.type,
          label: resource.label || { en: ["Untitled"] },
          parent: {
            id: parent?.id || "",
            type: parent?.type || "",
            label: parent?.label || { en: ["Untitled"] },
          },
          selector: resource.selector || undefined,
        });
      }
    };
    const browserRetry = () => set({ browserState: "RETRYING" });
    const browserLoading = (
      url: string,
      parent?: { id: string; type: string },
      searchParams?: URLSearchParams,
    ) => {
      set({
        lastUrl: url,
        browserState: "LOADING",
      });

      const newSearchParams = searchParams || new URLSearchParams();
      newSearchParams.set("id", url);
      const searchParamsString = newSearchParams.toString();

      history.push(`/loading?${searchParamsString}`, { parent });
    };

    const loadResource = async (
      url: string,
      options?: {
        parent?: { id: string; type: string };
        viewSource?: boolean;
        abortController?: AbortController;
        searchParams?: URLSearchParams;
      },
    ) => {
      const { viewSource = false, parent } = options || {};
      try {
        if (requestAbortController) {
          requestAbortController.abort();
        }
        requestAbortController =
          options?.abortController || new AbortController();
        const abortController = requestAbortController;

        const seedCollection = seedCollections.find(
          (collection) => collection.id === url,
        );

        if (seedCollection) {
          const route = resourceRoutes.find(
            (route) => route.resource === seedCollection.type,
          );
          if (!route) {
            return browserResourceError(
              url,
              `No route found for ${seedCollection.type}`,
              true,
            );
          }

          const newSearchParams =
            options?.searchParams || new URLSearchParams();
          newSearchParams.set("id", seedCollection.id);
          const searchParamsString = newSearchParams.toString();

          browserSuccess(url, seedCollection, viewSource);
          history.replace(`${route.url}?${searchParamsString}`, { parent });
          return;
        }

        const urlToFetch = beforeFetchUrl ? await beforeFetchUrl(url) : url;
        const response = await fetch(urlToFetch, {
          signal: abortController.signal,
          ...(requestInitOptions || {}),
        });
        // Ignore if aborted.
        if (abortController.signal.aborted) {
          return;
        }
        if (!response.ok) {
          return browserResourceError(
            url,
            `HTTP error ${response.status}`,
            true,
          );
        }

        // Now at this point do we know if it's JSON definitely?
        const contentType = response.headers.get("Content-Type");
        if (
          !contentType?.includes("text/plain") &&
          !contentType?.includes("/json") &&
          !contentType?.includes("/ld+json")
        ) {
          return browserResourceError(
            url,
            `Unexpected content type ${contentType}`,
            true,
          );
        }

        // We have JSON!
        const json = await response.json();
        if (abortController.signal.aborted) {
          return;
        }

        // Add json parsing hook.

        if (json.id !== url) {
          // Could be a fork, manually patch it.
          json.id = url;
        }

        // Now what is it. We will try to upgrade it using the @iiif/parser.
        let result = upgrade(json);
        if (!result.id || !result.type) {
          return browserResourceError(url, `Unsupported Resource type`, true);
        }

        if (result.type === "Manifest" && preprocessManifest) {
          result = await preprocessManifest(result);
        }
        if (result.type === "Collection" && preprocessCollection) {
          result = await preprocessCollection(result);
        }

        if (result.type === "Collection" && hasMappingRules) {
          result.items = result.items.map((item) => {
            item.id = applyIdMapping(
              item.id,
              collectionUrlMapping,
              collectionUrlMappingParams,
            );
            return item;
          });
        }

        const route = resourceRoutes.find(
          (route) => route.resource === result.type,
        );
        if (!route) {
          return browserResourceError(
            url,
            `Unsupported Resource type: ${result.type}`,
            true,
          );
        }

        // Load it into the vault, and redirect to the page.
        vault.loadSync(result.id, result);

        const newSearchParams = options?.searchParams || new URLSearchParams();
        newSearchParams.set("id", result.id);
        const searchParamsString = newSearchParams.toString();

        // Redirect to the route.
        if (abortController === requestAbortController) {
          requestAbortController = undefined;
        }
        browserSuccess(url, result, viewSource);
        history.replace(`${route.url}?${searchParamsString}`, { parent });
        return;
      } catch (error: any) {
        if (error?.name === "AbortError") {
          // Ignore aborted errors
          return;
        }
        return browserResourceError(url, error?.message || "Unknown error");
      }
    };

    return {
      vault,
      history,
      lastUrl: initialPage.url,
      browserState: "IDLE",
      omnibarValue: initialPage.url,
      historyList: savedHistory,
      linearHistory,
      historyIndex: initialIndex, // Initialize with index 0
      router: {
        action: history.action,
        location: history.location || {},
      },
      browser: {
        isLoading: false,
        isLoaded: false,
        didError: false,
        didRetry: false,
      },
      loaded: initialLoaded,
      loadResource,
      async resolve(
        inputUrl,
        { force = false, parent = undefined, searchParams } = {},
      ) {
        const viewSource = inputUrl.startsWith("view-source:");
        const url = viewSource ? inputUrl.slice(12) : inputUrl;

        // @todo check if anything was loading previously and cancel it.
        if (requestAbortController) {
          requestAbortController.abort();
        }

        // Handle canvas with parent passed in.
        if (parent?.type === "Manifest") {
          const manifestUrl = parent.id;
          const canvasId = url;

          const canvasSearchParams = new URLSearchParams(searchParams);

          canvasSearchParams.set("id", manifestUrl);
          canvasSearchParams.set("canvas", canvasId);

          // Assume if the parent is a Manifest, then the URL must be a Canvas.
          // /manifest?id={manifest_id}&canvas={canvas_id}
          const existing = get().loaded[manifestUrl];
          if (existing && !force) {
            const fullResource = vault.get<ManifestNormalized>(parent as any);
            if (!fullResource) {
              // This is an unknown state.
              return browserResourceError(url, "Unknown resource");
            }

            const route = resourceRoutes.find((r) => r.resource === "Manifest");
            if (!route) {
              return browserResourceError(
                url,
                `Unsupported resource type Manifest`,
              );
            }
            history.push(`${route.url}?${canvasSearchParams.toString()}`, {
              parent,
            });

            const region = canvasSearchParams.get("xywh");

            // Browser success with Canvas
            browserSuccess(url, fullResource, viewSource, parent);

            return;
          }

          return browserLoading(url, parent, searchParams);
        }

        if (url.startsWith("https://") || url.startsWith("http://")) {
          // We _might_ have been passed a canvas id
          const canvasRef = vault.get({ id: url, type: "Canvas" });
          if (canvasRef) {
            // @todo Handle this with iiif-parser:hasPart property.
            return;
          }

          // We are dealing with a resource at this point.
          // 1. Do we already know about this resource?
          const existing = get().loaded[url];
          if (existing && !force) {
            const resource = existing.resource;
            if (resource === null || existing.error) {
              return browserError();
            }

            // 2. Do we have it in the Vault?
            const fullResource = vault.get<
              ManifestNormalized | CollectionNormalized
            >(resource as any);
            if (!fullResource) {
              // This is an unknown state.
              return browserResourceError(url, "Unknown resource");
            }

            const type = resource.type;
            const route = resourceRoutes.find(
              (route) => route.resource === type,
            );
            if (!route) {
              return browserResourceError(
                url,
                `Unsupported resource type ${type}`,
              );
            }

            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("id", fullResource.id);
            if (viewSource) {
              newSearchParams.set("view-source", "true");
            }
            history.push(`${route.url}?${newSearchParams.toString()}`, {
              parent,
            });
            browserSuccess(url, fullResource, viewSource);
            return;
          }

          // Here we have a URL but we don't know what it is.
          // First we can set up an abort controller and save it as the current.
          return browserLoading(url, parent, searchParams);
        }

        // imagine iiif://about is passed here. We need to navigate to that mapped route, or go to
        // the not found page.
        for (const route of fixedRoutes) {
          if (route.router === url) {
            history.push(route.url, { parent });
            browserSuccess(url);
            return;
          }
        }

        history.push(notFound404.url, { parent });
      },
      mapToRoute(
        pathname,
        search,
      ): [string | null, null | { id: string; type: string }] {
        const lowerCaseUrl = (pathname || "").toLowerCase();
        for (const route of fixedRoutes) {
          if (route.url === lowerCaseUrl) {
            return [route.router, null];
          }
        }

        const searchParams = new URLSearchParams(search);
        const manifestUrl = searchParams.get("id");
        const viewSource = searchParams.get("view-source");
        if (manifestUrl) {
          const loaded = get().getLoadedResource(manifestUrl);

          if (loaded?.error) {
            return [notFound404.url, null];
          }
          if (loaded?.resource) {
            for (const route of resourceRoutes) {
              if (route.resource === loaded.resource.type) {
                if (viewSource === "true") {
                  return [`view-source:${loaded.resource.id}`, null];
                }
                return [loaded.resource.id, loaded.resource];
              }
            }
          } else if (get().browserState === "LOADING") {
            return [manifestUrl, null];
          }
        }

        // if (inputUrl.startsWith("https://")) {
        //   // special handling?
        // }

        return [null, null];
      },

      getLoadedResource(url: string): LoadedResource | undefined {
        const loaded = get().loaded[url];
        if (loaded) {
          return loaded;
        }

        const vaultRef = vault.get(url) as any;
        if (vaultRef) {
          const resource = {
            retries: 0,
            url,
            resource: {
              id: vaultRef.id,
              type: vaultRef.type,
              label: vaultRef.label,
            },
            error: null,
          };
          // Set it to the loaded
          set((state) => ({
            loaded: {
              [url]: resource,
              ...state.loaded,
            },
          }));

          return resource;
        }

        return undefined;
      },

      setOmnibarValue(value: string): void {
        set({ omnibarValue: value });
      },

      updateHistoryMetadata(id, metadata) {
        const currentHistoryList = get().historyList;
        const newHistoryList = currentHistoryList.map((item) => {
          if (item.resource === id) {
            return { ...item, metadata };
          }
          return item;
        });
        const currentLinear = get().linearHistory;
        const newLinearHistoryList = currentLinear.map((item) => {
          if (item.resource === id) {
            return { ...item, metadata };
          }
          return item;
        });

        set({
          historyList: newHistoryList,
          linearHistory: newLinearHistoryList,
        });
        get().persistHistory();
      },

      persistHistory() {
        const { historyList, linearHistory, historyIndex } = get();
        if (saveToLocalStorage) {
          setLocalStorageLinearHistory(linearHistory, {
            key: `${localStorageKey}_linear`,
          });
          setLocalStorageHistory(
            {
              history: historyList,
              cursor: historyIndex,
            },
            {
              key: `${localStorageKey}_history`,
            },
          );
        }
      },

      clearHistory(): void {
        const currentPage = get().historyList[get().historyIndex];
        const newHistory =
          currentPage.url === "iiif://home"
            ? [currentPage]
            : [
                currentPage,
                {
                  resource: null,
                  route: "/",
                  url: "iiif://home",
                  timestamp: new Date().toISOString(),
                },
              ];
        set({
          historyList: newHistory,
          linearHistory: newHistory,
          historyIndex: 0,
        });
        if (saveToLocalStorage) {
          get().persistHistory();
        }
        emitter.emit("history.clear");
      },
    };
  });

  // Look into this again in the future (atm dead code.)
  function dispatchHistoryItemEvents(historyItem: HistoryItem) {
    const resourceRef = historyItem.resource;
    const resource = vault.get(resourceRef as any);

    // Emit events
    emitter.emit("history.change", {
      item: historyItem,
      source: "history.listen.pop",
    });
    if (resource?.type === "Collection") {
      emitter.emit("collection.change", resource);
    }
    if (resource?.type === "Manifest") {
      emitter.emit("manifest.change", resource);
    }
  }

  history.listen((r) => {
    const [resolved, resource] = store
      .getState()
      .mapToRoute(r.location.pathname, r.location.search);

    if (debug) {
      console.log(
        `%c${r.action}`,
        "background: purple;color:white;padding:2px 8px;",
        { resolved, resource, location: r.location },
      );
    }

    const locationUrl = r.location.pathname + r.location.search;
    const currentHistoryList = store.getState().historyList;
    const currentIndex = store.getState().historyIndex;
    let newHistoryList = [...currentHistoryList];
    let newIndex = currentIndex;

    if (r.action === Action.Pop) {
      // Find the target item in the history list
      const historyIndex = newHistoryList.findIndex(
        (item) => item.route === locationUrl,
      );

      if (historyIndex !== -1) {
        newIndex = historyIndex;

        // Get the current resource
        const historyItem = newHistoryList[newIndex];
        const resourceRef = historyItem.resource;
        const resource = vault.get(resourceRef as any);

        // Emit events
        emitter.emit("history.change", {
          item: historyItem,
          source: "history.listen.pop",
        });
        if (resource?.type === "Collection") {
          emitter.emit("collection.change", resource);
        }
        if (resource?.type === "Manifest") {
          emitter.emit("manifest.change", resource);
        }
      }
    } else if (resolved) {
      // Extract parent from state if available
      const parent = (r.location.state as any)?.parent;

      const historyItem: HistoryItem = {
        resource:
          resolved?.startsWith("https://") || resolved?.startsWith("http://")
            ? resolved
            : null,
        route: locationUrl,
        url: resolved,
        parent: parent,
        metadata: {
          type: resource?.type,
          label: resource?.label,
        },
        timestamp: new Date().toISOString(),
      };

      switch (r.action) {
        case Action.Push: {
          // Check if the item already exists at the current index
          const currentItem =
            currentIndex < currentHistoryList.length
              ? currentHistoryList[currentIndex]
              : null;

          if (currentItem?.route === locationUrl) {
            // If it's the same route, don't add it again
            break;
          }

          // Add the new item after the current index
          newHistoryList = [
            ...newHistoryList.slice(0, currentIndex + 1),
            historyItem,
          ];

          // Update the index to point to the new item
          newIndex = currentIndex + 1;

          // Also update linear history for backward compatibility
          store.setState((s) => ({
            linearHistory: [historyItem, ...s.linearHistory],
          }));

          emitter.emit("history.change", {
            item: historyItem,
            source: "history.listen.push",
          });
          break;
        }
        case Action.Replace: {
          // Replace the current item
          if (currentIndex < newHistoryList.length) {
            newHistoryList[currentIndex] = historyItem;
          } else {
            // If for some reason the index is out of bounds, append
            newHistoryList.push(historyItem);
            newIndex = newHistoryList.length - 1;
          }

          // Also update linear history for backward compatibility

          if (linearHistory.length > 0) {
            store.setState((s) => ({
              linearHistory: [historyItem, ...s.linearHistory.slice(1)],
            }));
          } else {
            store.setState((s) => ({
              linearHistory: [historyItem, ...s.linearHistory],
            }));
          }

          emitter.emit("history.change", {
            item: historyItem,
            source: "history.listen.replace",
          });
          break;
        }
      }

      if (resource?.type === "Collection") {
        emitter.emit("collection.change", resource);
      }
      if (resource?.type === "Manifest") {
        emitter.emit("manifest.change", resource);

        // Search check for changed canvas.
        const searchParams = new URLSearchParams(r.location.search);
        const canvasId = searchParams.get("canvas");
        const xywh = searchParams.get("xywh");
        if (canvasId) {
          const selector = selectorFromXYWH(xywh);

          emitter.emit("canvas.change", {
            id: canvasId,
            type: "Canvas",
            parent: resource,
            selector,
          });
        }
      }
    }

    const newState: Partial<BrowserStore> = {
      historyList: newHistoryList,
      historyIndex: newIndex,
      router: { action: r.action, location: r.location },
    };

    if (resolved) {
      newState.lastUrl = resolved;
      newState.omnibarValue = resolved;
    }

    // Check quick loading.
    if (r.location.pathname === "/loading") {
      const params = new URLSearchParams(r.location.search);
      const id = params.get("id");
      if (id) {
        newState.lastUrl = id;
        newState.omnibarValue = id;
      }
    }

    store.setState(newState);
    if (saveToLocalStorage) {
      store.getState().persistHistory();
    }
  });

  emitter.on("history.change", ({ item }) => {
    if (!item.resource) {
      emitter.emit("history.page", item);
    }
  });

  emitter.on("collection.change", (resource) => {
    emitter.emit("resource.change", resource);
  });

  emitter.on("manifest.change", (resource) => {
    emitter.emit("resource.change", resource);
  });

  emitter.on("ready", () => {
    // Dispatch the initial page.
    history.replace(initialPage.route);
  });

  return store;
}
