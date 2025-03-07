import { Vault } from "@iiif/helpers";
import { upgrade } from "@iiif/parser/upgrader";
import type {
  CollectionNormalized,
  ManifestNormalized,
} from "@iiif/presentation-3-normalized";
import { Action, type History, createMemoryHistory } from "history";
import { createStore } from "zustand/vanilla";
import type { BrowserEmitter } from "../events";
import { routes } from "../routes";

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

  lastUrl: string;
  browserState: BrowserState;

  loaded: Record<
    string,
    {
      resource: null | {
        id: string;
        type: string;
      };
      url: string;
      error: string | null;
      retries: number;
    }
  >;

  // Actions.
  resolve(
    url: string,
    options?: { force?: boolean; parent?: { id: string; type: string } },
  ): Promise<void>;
  loadResource(
    url: string,
    options?: {
      parent?: { id: string; type: string };
      viewSource?: boolean;
      abortController?: AbortController;
    },
  ): Promise<void>;
  mapToRoute(
    path: string,
    search: string,
  ): [string | null, null | { id: string; type: string }];

  // Omnibar state.
  omnibarValue: string;
  setOmnibarValue(value: string): void;

  clearHistory(): void;
};

export type HistoryItem = {
  /* e.g. https://example.org/manifest.json */
  url: string;
  /* e.g. /manifest?id=https://example.org/manifest.json */
  route: string;
  resource: null | string;
  parent?: { id: string; type: string };
};

export type BrowserState = "IDLE" | "LOADING" | "LOADED" | "ERROR" | "RETRYING";

export type CreateBrowserStoreOptions = {
  emitter: BrowserEmitter;
  vault?: Vault;
  initialEntries?: string[];
} & BrowserStoreConfig;

export type BrowserStoreConfig = {
  requestInitOptions?: RequestInit;
  initialHistory: Array<HistoryItem>;
  initialHistoryCursor: number;
  historyLimit: number;
  restoreFromLocalStorage: boolean;
  saveToLocalStorage: boolean;
  localStorageKey: string;
};

export function getLocalStorageLinearHistory(defaultHistory: HistoryItem[]) {
  try {
    const history =
      localStorage.getItem("@v1/iiif-browser-linear-history") || "[]";
    const foundHistory = JSON.parse(history) as HistoryItem[];
    return foundHistory.length === 0 ? defaultHistory : foundHistory;
  } catch (error) {
    return defaultHistory;
  }
}

function setLocalStorageLinearHistory(allHistory: HistoryItem[], limit = 100) {
  const historyItems = allHistory.slice(0, limit);
  try {
    localStorage.setItem(
      "@v1/iiif-browser-linear-history",
      JSON.stringify(historyItems),
    );
  } catch (error) {
    // ignore.
  }
}

function getLocalStorageHistory(defaultHistory: HistoryItem[]): {
  history: HistoryItem[];
  cursor: number;
} {
  try {
    const history = localStorage.getItem("@v1/iiif-browser-history") || "[]";
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
  limit = 100,
) {
  const historyItems = allHistory.history.slice(0, limit);
  try {
    localStorage.setItem(
      "@v1/iiif-browser-history",
      JSON.stringify({
        history: historyItems,
        cursor: allHistory.cursor,
      }),
    );
  } catch (error) {
    // ignore.
  }
}

export function createBrowserStore({
  vault = new Vault(),
  requestInitOptions = {},
  emitter,
}: CreateBrowserStoreOptions) {
  const { history: savedHistory, cursor: initialIndex } =
    getLocalStorageHistory([
      {
        resource: null,
        route: "/",
        url: "iiif://home",
      },
    ]);
  const linearHistory = getLocalStorageLinearHistory([
    {
      resource: null,
      route: "/",
      url: "iiif://home",
    },
  ]);
  const initialPage = savedHistory[0]!;
  const initialEntries = savedHistory.map((item) => item.route);

  // @todo replace this with custom implementation:
  // - get index()
  // - get action()
  // - get location()
  // - createHref(to) (uses createPath)
  // - createURL(to)
  // - encodeLocation(to)
  // - push(to, state)
  // - replace(to, state)
  // - go(delta)
  // - listen(fn: Listener) -> () => void
  const history = createMemoryHistory({
    initialEntries,
    initialIndex,
  });

  let requestAbortController: AbortController | undefined;

  const fixedRoutes = routes.filter((route) => route.type === "fixed");
  const resourceRoutes = routes.filter((route) => route.type === "resource");
  const notFound404 = fixedRoutes.find((route) => route.fallback)!;

  const store = createStore<BrowserStore>((set, get) => {
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
      resource?: { id: string; type: string },
      viewSource?: boolean,
    ) => {
      const state: Partial<BrowserStore> = {
        browserState: "LOADED",
      };
      if (lastUrl) {
        state.lastUrl = viewSource ? `view-source:${lastUrl}` : lastUrl;
        state.omnibarValue = lastUrl;
      }
      if (resource) {
        if (resource.type === "Collection") {
          emitter.emit("collection.change", {
            id: resource.id,
            type: resource.type,
          });
        }
        if (resource.type === "Manifest") {
          emitter.emit("manifest.change", {
            id: resource.id,
            type: resource.type,
          });
        }

        state.loaded = {
          ...get().loaded,
          [resource.id]: {
            url: resource.id,
            error: null,
            resource: {
              id: resource.id,
              type: resource.type,
            },
            retries: 0,
          },
        };
      }
      set(state);
    };
    const browserRetry = () => set({ browserState: "RETRYING" });
    const browserLoading = (
      url: string,
      viewSource?: boolean,
      parent?: { id: string; type: string },
    ) => {
      set({
        lastUrl: url,
        browserState: "LOADING",
      });
      history.push(
        `/loading?id=${encodeURIComponent(url)}&view-source=${viewSource && "true"}`,
        { parent },
      );
    };

    const loadResource = async (
      url: string,
      options?: {
        parent?: { id: string; type: string };
        viewSource?: boolean;
        abortController?: AbortController;
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

        const response = await fetch(url, {
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

        // Now what is it. We will try to upgrade it using the @iiif/parser.
        const result = upgrade(json);
        if (!result.id || !result.type) {
          return browserResourceError(url, `Unsupported Resource type`, true);
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

        // Redirect to the route.
        history.replace(
          `${route.url}?id=${encodeURIComponent(result.id)}&view-source=${viewSource && "true"}`,
          { parent },
        );
        if (abortController === requestAbortController) {
          requestAbortController = undefined;
        }
        browserSuccess(url, result, viewSource);
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
      loaded: {},
      loadResource,
      async resolve(inputUrl, { force = false, parent = undefined } = {}) {
        const viewSource = inputUrl.startsWith("view-source:");
        const url = viewSource ? inputUrl.slice(12) : inputUrl;

        // @todo check if anything was loading previously and cancel it.
        if (requestAbortController) {
          requestAbortController.abort();
        }

        if (url.startsWith("https://")) {
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

            history.push(
              `${route.url}?id=${encodeURIComponent(fullResource.id)}&view-source=${viewSource && "true"}`,
              { parent },
            );
            browserSuccess(url, fullResource, viewSource);
            return;
          }

          // Here we have a URL but we don't know what it is.
          // First we can set up an abort controller and save it as the current.
          return browserLoading(url, viewSource, parent);
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
          const loaded = get().loaded[manifestUrl];
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

      setOmnibarValue(value: string): void {
        set({ omnibarValue: value });
      },

      clearHistory(): void {
        const currentPage = get().historyList[get().historyIndex];
        set({
          historyList:
            currentPage.url === "iiif://home"
              ? [currentPage]
              : [
                  currentPage,
                  {
                    resource: null,
                    route: "/",
                    url: "iiif://home",
                  },
                ],
          historyIndex: 0,
        });
        setLocalStorageHistory({
          history: get().historyList,
          cursor: get().historyIndex,
        });
        setLocalStorageLinearHistory(get().historyList);
      },
    };
  });

  history.listen((r) => {
    const [resolved, resource] = store
      .getState()
      .mapToRoute(r.location.pathname, r.location.search);

    console.log(
      `%c${r.action}`,
      "background: purple;color:white;padding:2px 8px;",
      { resolved, resource, location: r.location },
    );

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
        resource: resolved?.startsWith("https://") ? resolved : null,
        route: locationUrl,
        url: resolved,
        parent: parent,
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
          linearHistory.unshift(historyItem);

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
            linearHistory[0] = historyItem;
          } else {
            linearHistory.push(historyItem);
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

    setLocalStorageLinearHistory(linearHistory);
    setLocalStorageHistory({
      history: newHistoryList,
      cursor: newIndex,
    });
    store.setState(newState);
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

  return store;
}
