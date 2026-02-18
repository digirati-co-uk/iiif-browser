import { useCallback, useMemo, useRef } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogTrigger,
  Input,
  Menu,
  MenuItem,
  Popover,
  TextField,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { useBrowserContainer } from "../browser/BrowserContainer";
import {
  useGetSearchResult,
  useIsPageLoading,
  useLastUrl,
  useResolve,
  useSearchBoxState,
  useSearchConfig,
  useSearchIndex,
  useSearchResults,
  useSearchSourceFilter,
  useSearchState,
  useUIConfig,
} from "../context";
import { useExternalSearch } from "../hooks/use-external-search";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { combineSearchResults, isExternalItem } from "../search/combine";
import { createExternalSearchAdapter } from "../search/adapter-factory";
import type { SearchIndexItem } from "../stores/omnisearch-store";
import { SearchResultIcon } from "./SearchResultIcon";

// ---------------------------------------------------------------------------
// Row types used to build the ordered list for grouped rendering
// ---------------------------------------------------------------------------

type RowHeader = { kind: "header"; label: string };
type RowResult = { kind: "result"; item: SearchIndexItem };
type Row = RowHeader | RowResult;

// ---------------------------------------------------------------------------
// OmnisearchModal
// ---------------------------------------------------------------------------

export function OmnisearchModal({
  children,
  className,
  onSelect,
  wasLastOpenRef: wasLastOpen,
  onClose,
}: {
  className?: string;
  wasLastOpenRef: React.MutableRefObject<boolean>;
  children: React.ReactNode;
  onSelect: (result: SearchIndexItem) => void;
  onClose?: () => void;
}) {
  const container = useBrowserContainer();
  const [search, setSearch] = useSearchState();
  const { collectionSearchTagEnabled } = useUIConfig();
  const { isIndexing } = useSearchIndex();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialFocus = useRef(false);
  const withinResults = useSearchResults();
  const getSearchResult = useGetSearchResult();
  const sourceFilter = useSearchSourceFilter();
  const { isOpen: isModalOpen, close: closeModal } = useSearchBoxState();

  // -------------------------------------------------------------------------
  // External search
  // -------------------------------------------------------------------------

  const searchConfig = useSearchConfig();

  // Resolve adapter once (treated as static config).
  // biome-ignore lint/correctness/useExhaustiveDependencies: adapter config is static
  const adapter = useMemo(() => createExternalSearchAdapter(searchConfig), []);

  const {
    results: externalResults,
    isLoading: isExternalLoading,
    error: externalError,
  } = useExternalSearch({
    adapter: searchConfig.enableExternal ? adapter : null,
    query: search,
    limit: searchConfig.combination.maxExternalResults,
    debounceMs: 250,
    filters: {},
  });

  // -------------------------------------------------------------------------
  // Combine within + external results
  // -------------------------------------------------------------------------

  const { combined, sections } = useMemo(() => {
    const effectiveWithin = searchConfig.enableWithinCollection
      ? (withinResults ?? [])
      : [];
    const effectiveExternal = searchConfig.enableExternal ? externalResults : [];
    return combineSearchResults(effectiveWithin, effectiveExternal, searchConfig);
  }, [withinResults, externalResults, searchConfig]);

  const isGrouped =
    searchConfig.combination.mode === "grouped" &&
    !!sections &&
    (sections.within !== undefined || sections.external !== undefined);

  const showCollectionTag = collectionSearchTagEnabled && !sourceFilter;

  // -------------------------------------------------------------------------
  // Build ordered Row list for grouped rendering
  // -------------------------------------------------------------------------

  const rows = useMemo((): Row[] => {
    if (!isGrouped || !sections) {
      return combined.map((item): RowResult => ({ kind: "result", item }));
    }

    const out: Row[] = [];

    if (sections.within && sections.within.length > 0) {
      out.push({ kind: "header", label: searchConfig.withinSectionLabel });
      for (const item of sections.within) {
        out.push({ kind: "result", item });
      }
    }

    if (sections.external && sections.external.length > 0) {
      out.push({
        kind: "header",
        label: isExternalLoading
          ? `${searchConfig.externalSectionLabel} …`
          : searchConfig.externalSectionLabel,
      });
      for (const item of sections.external) {
        out.push({ kind: "result", item });
      }
    }

    return out;
  }, [
    isGrouped,
    sections,
    combined,
    searchConfig.withinSectionLabel,
    searchConfig.externalSectionLabel,
    isExternalLoading,
  ]);

  // The flat list of only the result items, used as react-aria <Menu items>.
  const menuItems = useMemo(
    (): SearchIndexItem[] =>
      rows
        .filter((r): r is RowResult => r.kind === "result")
        .map((r) => r.item),
    [rows],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const closeModalAction = useCallback(
    (open?: boolean) => {
      if (open === true) return;
      closeModal();
      wasLastOpen.current = true;
      initialFocus.current = false;
      onClose?.();
    },
    [closeModal, onClose, wasLastOpen],
  );

  const selectionAction = useCallback(
    (result: SearchIndexItem) => {
      if (result) {
        onSelect(result);
        closeModalAction();
        setSearch(result.id as string);
      }
    },
    [closeModalAction, setSearch, onSelect],
  );

  const doSearch = (id: string) => {
    const item: SearchIndexItem = getSearchResult(id) ?? {
      id,
      resource: { id, type: "unknown" },
      label: `Open ${id}`,
      type: "resource",
      source: "dynamic",
      keywords: [],
    };
    selectionAction(item);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DialogTrigger isOpen={isModalOpen} onOpenChange={closeModalAction}>
      {children}

      {/* What is visible when the modal is open */}
      <Popover
        className={twMerge("inset-0 flex flex-col overflow-hidden", className)}
        UNSTABLE_portalContainer={container || undefined}
        style={{ position: "absolute" }}
        crossOffset={0}
        containerPadding={0}
        shouldUpdatePosition={false}
      >
        <Dialog
          aria-label="Omnisearch Modal"
          className="focus:outline-none flex-1 flex overflow-hidden"
        >
          <Autocomplete
            defaultInputValue={search}
            inputValue={search}
            onInputChange={setSearch}
          >
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* ── Header / search input ── */}
              <div className="flex h-14 border-b shadow bg-gray-50">
                <div className="w-11 ml-0.5 text-xl flex items-center justify-center text-slate-500 ib-search-icon-offset">
                  <SearchIcon className="not-sr-only bg-gray-50 rounded" />
                </div>

                <TextField
                  aria-label="Search commands or enter a URL to a IIIF Manifest or Collection"
                  className="relative flex-1 min-w-0 translate-y-[-1px] translate-x-[-1px] text-sm"
                >
                  <Input
                    ref={inputRef}
                    className="p-1 relative flex-1 w-full h-full bg-transparent z-20 text-slate-600 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        doSearch((e.target as HTMLInputElement).value);
                      }
                      if (e.key === "Escape") {
                        closeModalAction();
                        wasLastOpen.current = true;
                      }
                    }}
                    onFocus={(e) => {
                      if (!initialFocus.current) {
                        initialFocus.current = true;
                        e.target.select();
                      }
                    }}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </TextField>

                {/* External search loading indicator */}
                {isExternalLoading && (
                  <div
                    className="flex items-center pr-2 text-xs text-blue-500 flex-shrink-0 gap-1"
                    aria-live="polite"
                    aria-label="Searching external sources"
                  >
                    <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="sr-only">Searching…</span>
                  </div>
                )}

                {/* Subtle error indicator */}
                {!!externalError && !isExternalLoading && (
                  <div
                    className="flex items-center pr-2 text-xs text-amber-500 flex-shrink-0"
                    title="External search unavailable"
                    aria-label="External search unavailable"
                  >
                    <span aria-hidden="true">⚠</span>
                  </div>
                )}

                <Button
                  aria-label="Close Omnisearch"
                  onPress={() => closeModalAction()}
                  className="text-2xl rounded bg-gray-50 focus:outline-none focus:bg-gray-200 flex-shrink-0 px-3 text-slate-500 hover:text-slate-700 m-1"
                >
                  <CloseIcon />
                </Button>
              </div>

              {/* ── Results ── */}
              <div className="flex-1 overflow-auto min-h-0 bg-white">
                {isGrouped ? (
                  <GroupedMenu
                    rows={rows}
                    menuItems={menuItems}
                    onAction={(id) => {
                      const item =
                        combined.find((i) => i.id === id) ??
                        getSearchResult(id);
                      if (item) selectionAction(item);
                    }}
                    getSearchResult={getSearchResult}
                    selectionAction={selectionAction}
                    showCollectionTag={showCollectionTag}
                    search={search}
                    isIndexing={isIndexing}
                  />
                ) : (
                  <Menu
                    selectionMode="single"
                    items={menuItems}
                    onAction={(id) => {
                      if (typeof id === "string") {
                        const item =
                          combined.find((i) => i.id === id) ??
                          getSearchResult(id);
                        if (item) selectionAction(item);
                      }
                    }}
                    className="p-2 gap-2"
                    dependencies={[search, combined, isIndexing, externalResults]}
                  >
                    {(maybeItem) => {
                      const item =
                        combined.find((i) => i.id === maybeItem.id) ??
                        getSearchResult(maybeItem.id) ??
                        maybeItem;

                      const isExternal = isExternalItem(item);

                      return (
                        <MenuItem
                          id={item.id}
                          aria-label={item.label}
                          onAction={() => selectionAction(item)}
                          className={({ isFocused }) =>
                            [
                              isFocused ? "bg-blue-500 text-white" : "",
                              "flex items-center gap-4 py-2 px-4 rounded overflow-hidden",
                            ].join(" ")
                          }
                        >
                          {({ isFocused }) => (
                            <>
                              <div className="flex items-center">
                                <SearchResultIcon
                                  item={item}
                                  className={isFocused ? "opacity-100" : "opacity-50"}
                                />
                              </div>
                              <div className="flex-1 min-w-0 truncate select-none">
                                <div className="flex items-center gap-2">
                                  <strong className="truncate">{item.label}</strong>
                                  {item.source === "collection" && showCollectionTag ? (
                                    <span className="flex-shrink-0 text-xs bg-gray-50 text-gray-500 rounded-sm px-2">
                                      current collection
                                    </span>
                                  ) : null}
                                  {item.source === "history" ? (
                                    <span className="flex-shrink-0 text-xs bg-gray-50 text-gray-500 rounded-sm px-2">
                                      history
                                    </span>
                                  ) : null}
                                  {isExternal ? (
                                    <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 rounded-sm px-2">
                                      external
                                    </span>
                                  ) : null}
                                </div>
                                <div
                                  className={`text-sm ${isFocused ? "opacity-100 underline" : "opacity-50"}`}
                                >
                                  {item.subLabel ?? item.id}
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-4">
                                <div
                                  className={`text-sm ${isFocused ? "opacity-100" : "opacity-50"}`}
                                >
                                  {item.actionLabel ?? "Open"}
                                </div>
                                <div className="flex items-center text-2xl rounded justify-center p-2 bg-gray-100 text-black/50">
                                  <ArrowForwardIcon
                                    className={`h-4 w-4 ${isFocused ? "text-blue-500" : "text-gray-500"}`}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </MenuItem>
                      );
                    }}
                  </Menu>
                )}

                {/* Empty state */}
                {!isExternalLoading &&
                  combined.length === 0 &&
                  search.trim().length > 0 && (
                    <div className="p-4 text-sm text-gray-400 text-center select-none">
                      No results found
                    </div>
                  )}
              </div>
            </div>
          </Autocomplete>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

// ---------------------------------------------------------------------------
// GroupedMenu
// ---------------------------------------------------------------------------

/**
 * Renders grouped search results with section header dividers.
 *
 * Section headers are plain <div>s (non-interactive) rendered between
 * react-aria <Menu> components (one per section).  This preserves full
 * keyboard navigation within each section while allowing visual grouping.
 */
function GroupedMenu({
  rows,
  onAction,
  getSearchResult,
  selectionAction,
  showCollectionTag,
  search,
  isIndexing,
}: {
  rows: Row[];
  menuItems: SearchIndexItem[];
  onAction: (id: string) => void;
  getSearchResult: (id: string) => SearchIndexItem | undefined;
  selectionAction: (item: SearchIndexItem) => void;
  showCollectionTag: boolean;
  search: string;
  isIndexing: boolean;
}) {
  // Split the flat rows array into segments, each with an optional header and
  // a list of result items.
  type Segment = { header: string | null; items: SearchIndexItem[] };
  const segments: Segment[] = [];
  let current: Segment = { header: null, items: [] };

  for (const row of rows) {
    if (row.kind === "header") {
      if (current.items.length > 0 || current.header !== null) {
        segments.push(current);
      }
      current = { header: row.label, items: [] };
    } else {
      current.items.push(row.item);
    }
  }
  if (current.items.length > 0 || current.header !== null) {
    segments.push(current);
  }

  return (
    <div className="p-2">
      {segments.map((segment, segIdx) => (
        <div key={segment.header ?? `seg-${segIdx}`}>
          {segment.header !== null && (
            <div
              className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 select-none"
              aria-hidden="true"
            >
              {segment.header}
            </div>
          )}
          {segment.items.length > 0 && (
            <Menu
              selectionMode="single"
              items={segment.items}
              onAction={(id) => {
                if (typeof id === "string") onAction(id);
              }}
              className="gap-1"
              dependencies={[search, segment.items, isIndexing]}
            >
              {(maybeItem) => {
                const item = getSearchResult(maybeItem.id) ?? maybeItem;
                const isExternal = isExternalItem(item);

                return (
                  <MenuItem
                    id={item.id}
                    aria-label={item.label}
                    onAction={() => selectionAction(item)}
                    className={({ isFocused }) =>
                      [
                        isFocused ? "bg-blue-500 text-white" : "",
                        "flex items-center gap-4 py-2 px-4 rounded overflow-hidden",
                      ].join(" ")
                    }
                  >
                    {({ isFocused }) => (
                      <>
                        <div className="flex items-center">
                          <SearchResultIcon
                            item={item}
                            className={isFocused ? "opacity-100" : "opacity-50"}
                          />
                        </div>
                        <div className="flex-1 min-w-0 truncate select-none">
                          <div className="flex items-center gap-2">
                            <strong className="truncate">{item.label}</strong>
                            {item.source === "collection" && showCollectionTag ? (
                              <span className="flex-shrink-0 text-xs bg-gray-50 text-gray-500 rounded-sm px-2">
                                current collection
                              </span>
                            ) : null}
                            {item.source === "history" ? (
                              <span className="flex-shrink-0 text-xs bg-gray-50 text-gray-500 rounded-sm px-2">
                                history
                              </span>
                            ) : null}
                            {isExternal ? (
                              <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 rounded-sm px-2">
                                external
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={`text-sm ${isFocused ? "opacity-100 underline" : "opacity-50"}`}
                          >
                            {item.subLabel ?? item.id}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-4">
                          <div
                            className={`text-sm ${isFocused ? "opacity-100" : "opacity-50"}`}
                          >
                            {item.actionLabel ?? "Open"}
                          </div>
                          <div className="flex items-center text-2xl rounded justify-center p-2 bg-gray-100 text-black/50">
                            <ArrowForwardIcon
                              className={`h-4 w-4 ${isFocused ? "text-blue-500" : "text-gray-500"}`}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </MenuItem>
                );
              }}
            </Menu>
          )}
        </div>
      ))}
    </div>
  );
}
