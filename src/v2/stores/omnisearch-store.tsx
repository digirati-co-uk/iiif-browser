import { type Vault, getValue } from "@iiif/helpers";
import type {
  CollectionNormalized,
  ManifestNormalized,
} from "@iiif/presentation-3-normalized";
import type { History } from "history";
import MiniSearch, { type SearchResult, type Options } from "minisearch";
import type { ReactNode } from "react";
import { createStore } from "zustand/vanilla";
import type { BrowserEmitter } from "../events";
import type { HistoryItem } from "../stores/browser-store";

export interface OmnisearchStore {
  isEnabled: boolean;
  isIndexing: boolean;
  isOpen: boolean;

  sourceFilter: string | null;

  currentCollectionId: string | null;
  query: string;
  results: SearchIndexItem[] | null;
  rawResults: SearchResult[] | null;
  route: HistoryItem;

  enable(): void;
  disable(): void;
  updateQuery: (query: string) => void;
  setRoute: (item: HistoryItem) => void;

  setDynamicItems: (items: SearchIndexItem[]) => void;

  getResult(id: string): SearchIndexItem | undefined;

  openWithFilter(query: string, filter: BaseAction["source"]): void;
  open(query: string): void;
  close(): void;
}

interface OmnisearchStoreOptions {
  vault: Vault;
  emitter: BrowserEmitter;
  initialRoute: HistoryItem;
  history: History;
  staticItems: SearchIndexItem[];
  numberOfResults?: number;
  initialHistory: HistoryItem[];
}

type BaseAction = {
  id: string;
  label: string;
  subLabel?: string;
  icon?: ReactNode;
  actionLabel?: string;
  keywords?: string[];
  showWhenEmpty?: boolean;
  source: "dynamic" | "history" | "static" | "custom" | "collection" | "external";
};

type SearchAction = BaseAction & {
  type: "action";
  action: () => void;
};

type ResourceAction = BaseAction & {
  type: "resource";
  resource: { id: string; type: string };
};

type PageAction = BaseAction & {
  type: "page";
  /* e.g. https://example.org/manifest.json */
  url: string;
  /* e.g. /manifest?id=https://example.org/manifest.json */
  route: string;
};

export type SearchIndexItem = SearchAction | ResourceAction | PageAction;

const miniSearchOptions: Options = {
  fields: [
    "label",
    "type",
    "subLabel",
    "actionLabel",
    "keywords",
    "url",
    "route",
  ],
  storeFields: ["id"],
  autoSuggestOptions: {
    prefix: true,
    fields: [
      "label",
      "type",
      "subLabel",
      "actionLabel",
      "keywords",
      "url",
      "route",
    ],
    boost: { label: 2, url: 1.5 },
    fuzzy: 0.2,
  },
};

export function createOmnisearchStore(options: OmnisearchStoreOptions) {
  const emitter = options.emitter;
  const numberOfResults = options.numberOfResults || 30;
  const store = createStore<OmnisearchStore>((set, get) => {
    const $search = new MiniSearch<SearchIndexItem>(miniSearchOptions);
    const documentsById = new Map<string, SearchIndexItem>();
    let dynamicItems: SearchIndexItem[] = [];
    let historyItems: HistoryItem[] = options.initialHistory;
    const emptyItems = options.staticItems.filter((t) => t.showWhenEmpty);
    const collectionCache = new Map<string, SearchIndexItem[]>();

    const indexStaticRoutes = () => {
      for (const item of options.staticItems) {
        $search.add(item);
        documentsById.set(item.id, item);
      }
    };

    const indexHistoryItem = (item: HistoryItem) => {
      if (item.resource) {
        const resource = options.vault.get<
          CollectionNormalized | ManifestNormalized
        >(item.resource);

        const label = item.metadata?.label || resource?.label;
        if (label) {
          const searchIndexItem: SearchIndexItem = {
            type: "resource",
            id: item.url,
            label: getValue(label),
            resource: {
              id: item.resource,
              type: item.metadata?.type || resource?.type,
            },
            source: "history",
            keywords: [],
          };

          if (!$search.has(searchIndexItem.id)) {
            $search.add(searchIndexItem);
          }
          if (!documentsById.has(searchIndexItem.id)) {
            documentsById.set(searchIndexItem.id, searchIndexItem);
          }
        }
      }
    };

    const reindex = () => {
      documentsById.clear();
      $search.removeAll();
      indexStaticRoutes();
      set({ isIndexing: true });
      emitter.emit("search.index-start");
      for (const item of dynamicItems) {
        documentsById.set(item.id, item);
      }
      for (const item of documentsById.values()) {
        try {
          if (!$search.has(item.id)) {
            $search.add(item);
          }
        } catch (e) {
          // ignore.
        }
      }
      for (const item of historyItems) {
        try {
          indexHistoryItem(item);
        } catch (e) {
          // ignore.
        }
      }
      emitter.emit("search.index-complete");
    };

    const makeSearch = (query: string) => {
      const sourceFilter = get().sourceFilter;

      if ((!query && !sourceFilter) || query === get().currentCollectionId) {
        const results: SearchIndexItem[] = [];
        const ids: string[] = [];

        if (query) {
          for (const dynamicItem of dynamicItems.slice(
            0,
            numberOfResults - emptyItems.length,
          )) {
            if (!ids.includes(dynamicItem.id)) {
              ids.push(dynamicItem.id);
              results.push(dynamicItem);
            }
          }
        }

        for (const historyItem of historyItems) {
          const history = documentsById.get(historyItem.url)!;
          if (history && !ids.includes(history.id)) {
            ids.push(history.id);
            results.push(history);
          }
        }

        for (const emptyItem of emptyItems) {
          if (!ids.includes(emptyItem.id)) {
            ids.push(emptyItem.id);
            results.push(emptyItem);
          }
        }

        set({
          query,
          rawResults: [],
          results: sourceFilter
            ? results.filter((result) => {
                return result.source === sourceFilter;
              })
            : results,
        });
        return;
      }

      if (query.startsWith("https://") || query.startsWith("http://")) {
        // Handle external links
        set({
          query,
          rawResults: [],
          results: [
            {
              id: query,
              resource: { id: query, type: "unknown" },
              label: `Open ${query}`,
              type: "resource",
              source: "dynamic",
            },
          ],
        });
        return;
      }

      if (!query.trim() && sourceFilter) {
        const allResults = dynamicItems.filter(
          (item) => item.source === sourceFilter,
        );

        set({
          query,
          rawResults: [],
          results: allResults.slice(0, numberOfResults),
        });
        return;
      }

      const results = $search.search(
        query,
        miniSearchOptions.autoSuggestOptions,
      );

      set({
        query,
        rawResults: results,
        results: results
          .slice(0, numberOfResults)
          .map((result) => documentsById.get(result.id)!)
          .filter((result) => {
            if (sourceFilter) {
              return result.source === sourceFilter;
            }
            return true;
          }),
      });
    };

    // Initialize the store with static routes
    indexStaticRoutes();

    emitter.on("search.index-complete", () => {
      makeSearch(get().query);
    });

    emitter.on("history.page", (route) => {
      set({ currentCollectionId: null });
      dynamicItems = [];
      reindex();
    });

    emitter.on("history.clear", () => {
      historyItems = [];
      reindex();
    });

    emitter.on("history.change", ({ item: route }) => {
      if (!historyItems.find((t) => t.url === route.url)) {
        historyItems.push(route);
      }
      indexHistoryItem(route);
      set({ route, query: route.url });
    });

    emitter.on("collection.change", (collectionRef) => {
      if (!collectionRef) {
        dynamicItems = [];
        reindex();
        return;
      }
      // Update the search index with the new collection
      const fullCollection = options.vault.get(collectionRef);
      if (fullCollection) {
        const items = options.vault.get(fullCollection.items || []);
        const collectionToResults: SearchIndexItem[] =
          collectionCache.get(fullCollection.id) || [];
        if (collectionToResults.length === 0) {
          for (const item of items) {
            collectionToResults.push({
              id: item.id,
              label: getValue(item.label),
              resource: { id: item.id, type: item.type },
              type: "resource",
              keywords: [],
              source: "collection",
            });
          }
        }
        dynamicItems = collectionToResults;
        reindex();
        set({ currentCollectionId: fullCollection.id });
      }
    });

    for (const item of historyItems) {
      indexHistoryItem(item);
    }

    return {
      isEnabled: false,
      isOpen: false,
      isIndexing: false,
      query: "",
      results: null,
      rawResults: null,
      currentCollectionId: null,
      sourceFilter: null,
      route: options.initialRoute,

      enable(): void {
        set({ isEnabled: true });
      },
      disable(): void {
        set({ isEnabled: false });
      },
      updateQuery: (query: string) => {
        makeSearch(query);
      },
      setRoute: (item: HistoryItem) => {
        set({ route: item });
      },
      setDynamicItems: (items: SearchIndexItem[]) => {
        dynamicItems = items;
        reindex();
      },
      getResult(id: string): SearchIndexItem | undefined {
        return documentsById.get(id);
      },
      open(query) {
        set({ query, isOpen: true });
        makeSearch(query);
      },
      openWithFilter(query, filter) {
        set({ query, sourceFilter: filter, isOpen: true });
        makeSearch(query);
      },
      close() {
        set({ isOpen: false, sourceFilter: null });
      },
    };
  });

  return store;
}
