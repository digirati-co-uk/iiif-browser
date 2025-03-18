import type { ViewerMode } from "@atlas-viewer/atlas";
import { type Vault, getValue } from "@iiif/helpers";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  VaultProvider,
  useCollection,
  useExistingVault,
  useVault,
} from "react-iiif-vault";
import { Router, useSearchParams } from "react-router-dom";
import { type StoreApi, useStore } from "zustand";
import { create } from "zustand";
import type { DeepPartial, IIIFBrowserConfig } from "./IIIFBrowser";
import { type BrowserLinkConfig, isDomainAllowed } from "./browser/BrowserLink";
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
  canNavigateItem,
  canSelectItem,
  createOutputStore,
} from "./stores/output-store";

const UIConfigContext = createContext<IIIFBrowserConfig | null>(null);
const LinkConfigContext = createContext<BrowserLinkConfig | null>(null);
const StoreContext = createContext<StoreApi<BrowserStore> | null>(null);
const OmnisearchContext = createContext<StoreApi<OmnisearchStore> | null>(null);
export const OutputContext = createContext<StoreApi<OutputStore> | null>(null);
const BrowserConfigContext = createContext<BrowserStoreConfig | null>(null);
const BrowserEventsContext = createContext<BrowserEmitter | null>(null);

export const useMode = create<{
  mode: ViewerMode;
  setMode: (mode: ViewerMode) => void;
  setEditMode: (editing: boolean) => void;
}>((set) => ({
  mode: "explore",
  setMode: (mode) => set({ mode }),
  setEditMode: (editing) => set({ mode: editing ? "sketch" : "explore" }),
}));

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

export function useLinearHistory() {
  const store = useBrowserStoreContext();
  return useStore(store, (state) => {
    return state.linearHistory;
  });
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
  const vault = useVault();
  const config = useLinkConfig();

  return useCallback(
    (_input: string | { id: string; type: string }) => {
      return canNavigateItem(_input, config, vault);
    },
    [config, vault],
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

export function useLoadingPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const viewSource = searchParams.get("view-source") === "true";
  const loadResource = useLoadResource();

  useEffect(() => {
    const abortController = new AbortController();
    if (id) {
      loadResource(id, { viewSource, abortController, searchParams });
    }
    return () => {
      abortController.abort();
    };
  }, [id, loadResource, viewSource, searchParams]);

  return {
    id,
    viewSource,
    searchParams,
  };
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

export function useSearchIndex() {
  const store = useOmnisearchStore();
  return useStore(store, (state) => ({
    isIndexing: state.isIndexing,
  }));
}

export function useSearchBoxState() {
  const store = useOmnisearchStore();
  return useStore(store, (state) => ({
    isOpen: state.isOpen,
    open: state.open,
    close: state.close,
    openWithFilter: state.openWithFilter,
  }));
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

export function useRefineSelectedItem() {
  const store = useOutputStore();
  return useStore(store, (state) => state.refineSelectedItem);
}

export function useCanvasOutputSelector(canvas?: { id?: string } | null) {
  const store = useOutputStore();
  return useStore(
    store,
    (s) => s.selectedItems.find((item) => item.id === canvas?.id)?.selector,
  );
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
  vault: customVault,
  uiConfig,
  browserConfig,
  linkConfig,
  outputConfig,
  debug,
  children,
}: {
  vault?: Vault;
  uiConfig?: DeepPartial<IIIFBrowserConfig>;
  browserConfig?: Partial<BrowserStoreConfig>;
  linkConfig?: Partial<BrowserLinkConfig>;
  outputConfig?: Partial<OutputConfig>;
  debug?: boolean;
  children: React.ReactNode;
}) {
  const readyRef = useRef(false);
  const vault = useExistingVault(customVault);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const emitter = useMemo(
    () =>
      createEmitter({
        debug: debug ?? false,
      }),
    [browserConfig, debug],
  );

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
      homeButton: true,
      forwardButton: true,
      bookmarkButton: false,
      collectionPaginationSize: 25,
      manifestPaginationSize: 25,
      paginationNavigationType: "replace",
      homeLink: "iiif://home",
      portalIcons: true,
      ...rest,
    } as IIIFBrowserConfig;
  }, [uiConfig]);

  const browserStoreConfig: BrowserStoreConfig = useMemo(() => {
    return {
      saveToLocalStorage: true,
      restoreFromLocalStorage: true,
      requestInitOptions: {},
      localStorageKey: "@v1/iiif-browser-history",
      initialHistoryCursor: 0,
      initialHistory: [
        {
          resource: null,
          route: "/",
          url: "iiif://home",
        },
      ],
      historyLimit: 100,
      collectionUrlMappingParams: {},
      collectionUrlMapping: {},
      preprocessManifest: undefined,
      preprocessCollection: undefined,

      seedCollections: [],

      // collectionUrlMapping: {
      //   "presentation-api.dlcs.digirati.io/:customer/:type/:id":
      //     "portal.iiifcs.digirati.io/api/iiif/c/:type/:id",
      // },
      // seedCollections: [
      //   {
      //     "@context": "http://iiif.io/api/presentation/3/context.json",
      //     id: "https://example.org/my-seed",
      //     type: "Collection",
      //     items: [
      //       {
      //         id: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
      //         type: "Manifest",
      //         label: { en: ["An example manifest"] },
      //       },
      //     ],
      //   },
      // ],

      ...(browserConfig || {}),
    };
  }, [browserConfig]);

  const outputConfigValue: OutputConfig = useMemo(() => {
    if (!outputConfig || !outputConfig?.length) {
      if (true as boolean) {
        // Good defaults?.
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
          {
            label: "Open Canvas in Theseus",
            type: "open-new-window",
            urlPattern:
              "https://theseusviewer.org/?iiif-content={MANIFEST}&canvas={CANVAS}",
            format: {
              type: "url",
              resolvable: true,
            },
            supportedTypes: ["Canvas"],
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
          canSelectOnlyAllowedDomains: false,
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
          canCropImage: false,
          alwaysShowNavigationArrow: true,

          customCanSelect: null,
          customCanNavigate: null,
          // Testing
          // multiSelect: true,
          // clickToSelect: true,
          // clickToNavigate: false,
          // doubleClickToNavigate: true,
          // canSelectCollection: false,
          // onlyAllowedDomains: true,
          // canSelectOnlyAllowedDomains: true,
          // allowedDomains: ["https://presentation-api.dlcs.digirati.io"],
          // customCanSelect: (m, v) => getValue(v.get(m).label).startsWith("A"),
        } as BrowserLinkConfig,
        linkConfig,
      ),
    [linkConfig],
  );

  const store = useMemo(
    () => createBrowserStore({ vault, emitter, debug, ...browserStoreConfig }),
    [emitter, vault, browserStoreConfig, debug],
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
        initialHistory: store.getState().linearHistory,
        staticItems: [
          uiConfigValue.defaultPages.homepage
            ? {
                id: "iiif://home",
                type: "page",
                label: "Homepage",
                url: "iiif://home",
                route: "/",
                showWhenEmpty: true,
                source: "static",
              }
            : null,
          uiConfigValue.defaultPages.about
            ? {
                id: "iiif://about",
                type: "page",
                label: "About IIIF Browser",
                url: "iiif://about",
                route: "/about",
                showWhenEmpty: true,
                source: "static",
              }
            : null,
          uiConfigValue.defaultPages.history
            ? {
                id: "iiif://history",
                type: "page",
                label: "History",
                url: "iiif://history",
                route: "/history",
                showWhenEmpty: true,
                source: "static",
              }
            : null,
        ].filter(Boolean) as any[],
      }),
    [emitter, vault, store, uiConfigValue],
  );

  if (!readyRef.current) {
    emitter.emit("ready");
    readyRef.current = true;
  }

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
}: {
  basename: string;
  children: React.ReactNode;
}) {
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
