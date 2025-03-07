import { createContext, useCallback, useContext, useMemo } from "react";
import {
  VaultProvider,
  useCollection,
  useExistingVault,
} from "react-iiif-vault";
import { Router, useSearchParams } from "react-router-dom";
import { type StoreApi, useStore } from "zustand";
import type { DeepPartial, IIIFBrowserConfig } from "./IIIFBrowser";
import type { BrowserLinkConfig } from "./browser/BrowserLink";
import { type BrowserEmitter, createEmitter } from "./events";
import {
  type BrowserStore,
  type BrowserStoreConfig,
  createBrowserStore,
} from "./stores/browser-store";
import {
  type OmnisearchStore,
  SearchIndexItem,
  createOmnisearchStore,
} from "./stores/omnisearch-store";
import {
  type OutputConfig,
  type OutputStore,
  type OutputTarget,
  OutputType,
  createOutputStore,
} from "./stores/output-store";

const UIConfigContext = createContext<IIIFBrowserConfig | null>(null);
const LinkConfigContext = createContext<BrowserLinkConfig | null>(null);
const StoreContext = createContext<StoreApi<BrowserStore> | null>(null);
const OmnisearchContext = createContext<StoreApi<OmnisearchStore> | null>(null);
const OutputContext = createContext<StoreApi<OutputStore> | null>(null);
const BrowserConfigContext = createContext<BrowserStoreConfig | null>(null);
const BrowserEventsContext = createContext<BrowserEmitter | null>(null);

export function useBrowserConfig() {
  const context = useContext(BrowserConfigContext);
  if (!context) {
    throw new Error(
      "useBrowserConfigContext must be used within a BrowserConfigProvider",
    );
  }
  return context;
}

export function useBrowserStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStoreContext must be used within a StoreProvider");
  }
  return context;
}

export function useUIConfig() {
  const context = useContext(UIConfigContext);
  if (!context) {
    throw new Error(
      "useUIConfigContext must be used within a UIConfigProvider",
    );
  }
  return context;
}

export function useLinkConfig() {
  const context = useContext(LinkConfigContext);
  if (!context) {
    throw new Error(
      "useLinkConfigContext must be used within a LinkConfigProvider",
    );
  }
  return context;
}

export function useHistoryList() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => {
    return state.historyList;
  });
}

export function useClearHistory() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => {
    return state.clearHistory;
  });
}

export function useHistoryIndex() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => {
    return state.historyIndex;
  });
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

export function useCanResolve() {
  const config = useLinkConfig();

  return useCallback(
    (_input: string | { id: string; type: string }) => {
      let input = _input;
      if (typeof input === "string") {
        input = { id: input, type: "unknown" };
      }

      if (
        !config.allowNavigationToBuiltInPages &&
        !input.id.startsWith("http")
      ) {
        return false;
      }

      if (config.disallowedResources.includes(input.id)) {
        return false;
      }

      if (!config.canNavigateToCanvas && input.type === "Canvas") {
        return false;
      }
      if (!config.canNavigateToCollection && input.type === "Collection") {
        return false;
      }
      if (!config.canNavigateToManifest && input.type === "Manifest") {
        return false;
      }

      let allowed = true;
      if (config.onlyAllowedDomains) {
        allowed = false;
        for (const domain of config.allowedDomains || []) {
          const normalisedDomain = domain
            .replace("https://", "")
            .replace("http://", "");
          const normalisedId = input.id
            .replace("https://", "")
            .replace("http://", "");
          if (normalisedId.startsWith(normalisedDomain)) {
            allowed = true;
          }
        }
      }

      return allowed;
    },
    [config],
  );
}

export function useResolve() {
  const canResolve = useCanResolve();
  const store = useBrowserStoreContext();
  const _resolve = useStore(store, (state) => state.resolve);

  return useCallback(
    (...input: Parameters<typeof _resolve>) => {
      if (canResolve(input[0])) {
        _resolve(...input);
      }
    },
    [_resolve, canResolve],
  );
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

export function useBrowserEmitter() {
  const ctx = useContext(BrowserEventsContext);
  if (!ctx) {
    throw new Error(
      "useBrowserEmitter must be used within a BrowserEventsProvider",
    );
  }
  return ctx;
}

export function useOutputStore() {
  const context = useContext(OutputContext);
  if (!context) {
    throw new Error("useOutputStore must be used within a StoreProvider");
  }
  return context;
}

export function useAvailableOutputs() {
  const store = useOutputStore();
  return useStore(store, (state) => state.availableOutputs);
}

export function useAllOutputs() {
  const store = useOutputStore();
  return useStore(store, (state) => state.allOutputs);
}

export function useSelectedItems() {
  const store = useOutputStore();
  return useStore(store, (state) => state.selectedItems);
}

export function useSelectedActions() {
  const store = useOutputStore();
  return useStore(store, (state) => {
    return {
      selectItem: state.selectItem,
      toggleItemSelection: state.toggleItemSelection,
      replaceSelectedItems: state.replaceSelectedItems,
      deselectItem: state.deselectItem,
      resetSelection: state.resetSelection,
      runTargetAction: state.runTargetAction,
    };
  });
}

export function BrowserProvider({
  uiConfig,
  browserConfig,
  linkConfig,
  outputConfig,
  children,
}: {
  uiConfig?: DeepPartial<IIIFBrowserConfig>;
  browserConfig?: Partial<BrowserStoreConfig>;
  linkConfig?: Partial<BrowserLinkConfig>;
  outputConfig?: Partial<OutputConfig>;
  children: React.ReactNode;
}) {
  const vault = useExistingVault();
  const emitter = useMemo(() => createEmitter(), []);

  const uiConfigValue: IIIFBrowserConfig = useMemo(() => {
    const { defaultPages, ...rest } = uiConfig || {};
    return {
      defaultPages: {
        about: true,
        bookmarks: true,
        history: true,
        homepage: true,
        viewSource: true,
        ...defaultPages,
      },
      reloadButton: false,
      menuButton: true,
      backButton: true,
      homeButton: false,
      forwardButton: true,
      bookmarkButton: true,
      collectionPaginationSize: 25,
      manifestPaginationSize: 25,
      paginationNavigationType: "replace",
      portalIcons: true,
      ...rest,
    } as IIIFBrowserConfig;
  }, [uiConfig]);

  const browserStoreConfig: BrowserStoreConfig = useMemo(() => {
    return {
      saveToLocalStorage: true,
      restoreFromLocalStorage: true,
      requestInitOptions: {},
      localStorageKey: "iiif-browser",
      initialHistoryCursor: 0,
      initialHistory: [
        {
          resource: null,
          route: "/",
          url: "iiif://home",
        },
      ],
      historyLimit: 100,
      ...(browserConfig || {}),
    };
  }, [browserConfig]);

  const outputConfigValue: OutputConfig = useMemo(() => {
    if (!outputConfig || !outputConfig?.length) {
      if (true as boolean) {
        // testing more optinos.
        return [
          {
            label: "Open Manifest in Theseus",
            type: "open-new-window",
            urlPattern: "https://theseusviewer.org/?iiif-content={MANIFEST}",
            format: { type: "url", resolvable: true },
            supportedTypes: ["Manifest"],
          },
          {
            label: "Open Collection in Theseus",
            type: "open-new-window",
            urlPattern: "https://theseusviewer.org/?iiif-content={COLLECTION}",
            format: { type: "url", resolvable: false },
            supportedTypes: ["Collection"],
          },
        ] as OutputTarget[];
      }

      return [
        {
          label: "Open",
          type: "open-new-window",
          urlPattern: "{RESULT}",
          format: { type: "url", resolvable: true },
          supportedTypes: ["Manifest", "Collection"],
        },
      ];
    }
    return outputConfig as OutputConfig;
  }, [outputConfig]);

  const linkConfigValue = useMemo(
    () =>
      Object.assign(
        {
          allowNavigationToBuiltInPages: true,
          onlyAllowedDomains: false,
          allowedDomains: [],
          markedResources: [],
          disallowedResources: [],
          doubleClickToNavigate: false,
          clickToSelect: false,
          clickToNavigate: true,
          canNavigateToCollection: true,
          canNavigateToManifest: true,
          canNavigateToCanvas: true,
          canSelectCollection: true,
          canSelectManifest: true,
          canSelectCanvas: true,
          multiSelect: false,

          // Testing
          // multiSelect: true,
          // clickToSelect: true,
          // clickToNavigate: false,
          // doubleClickToNavigate: true,
          // canSelectCollection: false,
        } as BrowserLinkConfig,
        linkConfig,
      ),
    [linkConfig],
  );

  const store = useMemo(
    () => createBrowserStore({ vault, emitter, ...browserStoreConfig }),
    [emitter, vault, browserStoreConfig],
  );

  const outputStore = useMemo(
    () =>
      createOutputStore({
        vault,
        emitter: emitter as any,
        linkConfig: linkConfigValue,
        output: outputConfigValue,
      }),
    [emitter, vault, linkConfigValue, outputConfigValue],
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
    <UIConfigContext.Provider value={uiConfigValue}>
      <BrowserEventsContext.Provider value={emitter}>
        <BrowserConfigContext.Provider value={browserStoreConfig}>
          <LinkConfigContext.Provider value={linkConfigValue}>
            <OutputContext.Provider value={outputStore}>
              <VaultProvider vault={vault}>
                <StoreContext.Provider value={store}>
                  <OmnisearchContext.Provider value={omnisearchStore}>
                    <CustomRouter basename="/">{children}</CustomRouter>
                  </OmnisearchContext.Provider>
                </StoreContext.Provider>
              </VaultProvider>
            </OutputContext.Provider>
          </LinkConfigContext.Provider>
        </BrowserConfigContext.Provider>
      </BrowserEventsContext.Provider>
    </UIConfigContext.Provider>
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
