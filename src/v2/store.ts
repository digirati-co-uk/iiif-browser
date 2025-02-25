import { Vault } from "@iiif/helpers";
import { upgrade } from "@iiif/parser/upgrader";
import { Reference } from "@iiif/presentation-3";
import type {
  CollectionNormalized,
  ManifestNormalized,
} from "@iiif/presentation-3-normalized";
import { Action, type History, createMemoryHistory } from "history";
import { createStore } from "zustand/vanilla";
import type { BrowserEmitter } from "./events";
import { type BrowserRoutes, routes } from "./routes";
import About from "./routes/About";

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
  resolve(url: string, force?: boolean): Promise<void>;
  loadResource(
    url: string,
    options?: {
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
};

export type BrowserState = "IDLE" | "LOADING" | "LOADED" | "ERROR" | "RETRYING";

export type CreateBrowserStoreOptions = {
  emitter: BrowserEmitter;
  vault?: Vault;
  initialEntries?: string[];
  requestInitOptions?: RequestInit;
};

export function getLocalStorageLinearHistory(
  defaultHistory: HistoryItem[],
): HistoryItem[] {
  try {
    const history = localStorage.getItem("iiif-browser-linear-history") || "[]";
    const foundHistory = JSON.parse(history) as HistoryItem[];
    return foundHistory.length === 0 ? defaultHistory : foundHistory;
  } catch (error) {
    //
    return defaultHistory;
  }
}

function setLocalStorageLinearHistory(allHistory: HistoryItem[], limit = 100) {
  const history = allHistory.slice(0, limit);
  try {
    localStorage.setItem(
      "iiif-browser-linear-history",
      JSON.stringify(history),
    );
  } catch (error) {
    // ignore.
  }
}

function getLocalStorageHistory(defaultHistory: HistoryItem[]): HistoryItem[] {
  try {
    const history = localStorage.getItem("iiif-browser-history") || "[]";
    const foundHistory = JSON.parse(history) as HistoryItem[];
    return foundHistory.length === 0 ? defaultHistory : foundHistory;
  } catch (error) {
    //
    return defaultHistory;
  }
}

function setLocalStorageHistory(allHistory: HistoryItem[], limit = 100) {
  const history = allHistory.slice(0, limit);
  try {
    localStorage.setItem("iiif-browser-history", JSON.stringify(history));
  } catch (error) {
    // ignore.
  }
}

export function createBrowserStore({
  vault = new Vault(),
  requestInitOptions = {},
  emitter,
}: CreateBrowserStoreOptions) {
  const savedHistory = getLocalStorageHistory([
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
  const initialEntries = savedHistory.map((item) => item.route).toReversed();

  const history = createMemoryHistory({
    initialEntries,
  });

  let requestAbortController: AbortController | undefined;

  const fixedRoutes = routes.filter((route) => route.type === "fixed");
  const resourceRoutes = routes.filter((route) => route.type === "resource");
  const notFound404 = fixedRoutes.find((route) => route.fallback)!;

  const store = createStore<BrowserStore>((set, get) => {
    const browserError = (id?: string, replace?: boolean) => {
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
    const browserLoading = (url: string, viewSource?: boolean) => {
      set({
        lastUrl: url,
        browserState: "LOADING",
      });
      history.push(
        `/loading?id=${encodeURIComponent(url)}&view-source=${viewSource && "true"}`,
      );
    };

    const loadResource = async (
      url: string,
      options?: {
        viewSource?: boolean;
        abortController?: AbortController;
      },
    ) => {
      const { viewSource = false } = options || {};
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
      async resolve(inputUrl, force = false) {
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
            );
            browserSuccess(url, fullResource, viewSource);
            return;
          }

          // Here we have a URL but we don't know what it is.
          // First we can set up an abort controller and save it as the current.
          return browserLoading(url, viewSource);
        }

        // imagine iiif://about is passed here. We need to navigate to that mapped route, or go to
        // the not found page.
        for (const route of fixedRoutes) {
          if (route.router === url) {
            history.push(route.url);
            browserSuccess(url);
            return;
          }
        }

        history.push(notFound404.url);
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
        const currentPage = savedHistory[0];
        set({
          historyList: [
            currentPage,
            {
              resource: null,
              route: "/",
              url: "iiif://home",
            },
          ],
        });
        setLocalStorageHistory(get().historyList);
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
    let newHistoryList = [...currentHistoryList];

    if (r.action === Action.Pop) {
      if (currentHistoryList.length !== 1) {
        // We need to pop to this item in the history stack.
        const indexToShiftTo = currentHistoryList.findIndex(
          (item) => item.route === locationUrl,
        );

        if (indexToShiftTo !== -1) {
          newHistoryList = newHistoryList.slice(indexToShiftTo);
        }
        emitter.emit("history.change", newHistoryList[0]);
      }
    } else if (resolved) {
      const historyItem: HistoryItem = {
        resource: resolved?.startsWith("https://") ? resolved : null,
        route: locationUrl,
        url: resolved,
      };

      switch (r.action) {
        case Action.Push: {
          const latestItem = newHistoryList[0];
          if (latestItem && latestItem.route === locationUrl) {
            // If the latest item is the same as the current route, we don't need to push it again.
            break;
          }
          // We need to push this item to the history stack.
          newHistoryList.unshift(historyItem);
          linearHistory.unshift(historyItem);
          emitter.emit("history.change", historyItem);
          break;
        }
        case Action.Replace: {
          // We need to replace the last item in the list with this.
          if (newHistoryList.length > 0) {
            newHistoryList[0] = historyItem;
          } else {
            newHistoryList.unshift(historyItem);
            linearHistory.unshift(historyItem);
          }
          emitter.emit("history.change", historyItem);
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
    setLocalStorageHistory(newHistoryList);
    store.setState(newState);
  });

  emitter.on("history.change", (item) => {
    if (!item.resource) {
      emitter.emit("history.page", item);
    }
  });

  return store;
}
