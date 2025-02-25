import { createContext, useContext, useMemo } from "react";
import {
  VaultProvider,
  useCollection,
  useExistingVault,
} from "react-iiif-vault";
import { Router, useSearchParams } from "react-router-dom";
import { type StoreApi, useStore } from "zustand";
import { createEmitter } from "./events";
import { type BrowserStore, createBrowserStore } from "./store";
import {
  type OmnisearchStore,
  SearchIndexItem,
  createOmnisearchStore,
} from "./stores/omnisearch-store";

const StoreContext = createContext<StoreApi<BrowserStore> | null>(null);
const OmnisearchContext = createContext<StoreApi<OmnisearchStore> | null>(null);

export function useBrowserStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStoreContext must be used within a StoreProvider");
  }
  return context;
}

export function useHistoryList() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.historyList);
}

export function useOmnibarState() {
  const store = useBrowserStoreContext();
  const [omnibarValue, setOmnibarValue] = useStore(store, (state) => [
    state.omnibarValue,
    state.setOmnibarValue,
  ]);
  return [omnibarValue, setOmnibarValue] as const;
}

export function useCurrentCollection() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("id");

  return useCollection({ id: url! });
}

export function useHistory() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.history);
}

export function useResolve() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.resolve);
}

export function useLastUrl() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.lastUrl);
}

export function useHistoryRouter() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.router);
}

export function useIsPageLoading() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.browserState) === "LOADING";
}

export function useCurrentRoute() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.historyList[0]!);
}

export function useLoadResource() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => state.loadResource);
}

export function useOmnisearchStore() {
  const context = useContext(OmnisearchContext);
  if (!context) {
    throw new Error("useOmnisearchStore must be used within a StoreProvider");
  }
  return context;
}

export function useSearchState() {
  const store = useOmnisearchStore();
  return useStore(store, (state) => [state.query, state.updateQuery] as const);
}

export function useGetSearchResult() {
  const store = useOmnisearchStore();
  return useStore(store, (state) => state.getResult);
}

export function useSearchResults() {
  const store = useOmnisearchStore();
  return useStore(store, (state) => state.results);
}

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const vault = useExistingVault();
  const emitter = useMemo(() => createEmitter(), []);
  const store = useMemo(
    () => createBrowserStore({ vault, emitter }),
    [emitter, vault],
  );
  const omnisearchStore = useMemo(
    () =>
      createOmnisearchStore({
        vault,
        emitter,
        initialRoute: store.getState().historyList[0]!,
        history: store.getState().history,
        initialHistory: [],
        staticItems: [
          {
            id: "iiif://home",
            type: "page",
            label: "Homepage",
            url: "iiif://home",
            route: "/",
            showWhenEmpty: true,
          },
          {
            id: "iiif://about",
            type: "page",
            label: "About IIIF Browser",
            url: "iiif://about",
            route: "/about",
            showWhenEmpty: true,
          },
          {
            id: "https://view.nls.uk/collections/top.json",
            type: "resource",
            resource: {
              id: "https://view.nls.uk/collections/top.json",
              type: "Collection",
            },
            label: "National Library of Scotland",
            showWhenEmpty: true,
          },
        ],
      }),
    [emitter, vault, store],
  );

  return (
    <VaultProvider vault={vault}>
      <StoreContext.Provider value={store}>
        <OmnisearchContext.Provider value={omnisearchStore}>
          <CustomRouter basename="/">{children}</CustomRouter>
        </OmnisearchContext.Provider>
      </StoreContext.Provider>
    </VaultProvider>
  );
}

function CustomRouter({
  basename,
  children,
}: { basename: string; children: React.ReactNode }) {
  const history = useHistory();
  const { action, location } = useHistoryRouter();

  return (
    <Router
      navigationType={action}
      basename={basename}
      navigator={history}
      location={location}
    >
      {children}
    </Router>
  );
}
