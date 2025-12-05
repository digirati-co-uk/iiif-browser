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
  useSearchIndex,
  useSearchResults,
  useSearchSourceFilter,
  useSearchState,
  useUIConfig,
} from "../context";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { SearchIcon } from "../icons/SearchIcon";
import type { SearchIndexItem } from "../stores/omnisearch-store";
import { SearchResultIcon } from "./SearchResultIcon";

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
  const results = useSearchResults();
  const getSearchResult = useGetSearchResult();
  const sourceFilter = useSearchSourceFilter();
  const { isOpen: isModalOpen, close: closeModal } = useSearchBoxState();

  const showCollectionTag = collectionSearchTagEnabled && !sourceFilter;

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

  const doSearch = (id: string) => {
    const item = getSearchResult(id) || {
      id: id,
      resource: { id: id, type: "unknown" },
      label: `Open ${id}`,
      type: "resource",
      source: "dynamic",
    };
    if (item) {
      selectionAction(item);
    }
  };

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

  return (
    <DialogTrigger isOpen={isModalOpen} onOpenChange={closeModalAction}>
      {children}

      {/* What is visible when the modal is open */}
      <Popover
        className={twMerge(
          "inset-0 flex flex-col overflow-hidden",
          className,
        )}
        UNSTABLE_portalContainer={container}
        style={{position: "absolute"}}
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
              {/* The header / search box itself. */}
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
                    // key={location.pathname + location.search}
                    className="p-1 relative flex-1 w-full h-full bg-transparent z-20 text-slate-600 focus:outline-none"
                    // value={search}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        doSearch((e.target as any).value);
                      }
                      // Close on esc
                      if (e.key === "Escape") {
                        closeModalAction();
                        wasLastOpen.current = true;
                      }
                    }}
                    onFocus={(e) => {
                      if (!initialFocus.current) {
                        initialFocus.current = true;
                        e.target.select()
                      }
                    }}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </TextField>

                <Button
                  aria-label="Close Omnisearch"
                  onPress={() => closeModalAction()}
                  className="text-2xl rounded bg-gray-50 focus:outline-none focus:bg-gray-200 flex-shrink-0 px-3 text-slate-500 hover:text-slate-700 m-1"
                >
                  <CloseIcon />
                </Button>
              </div>

              {/* The search results. */}
              <Menu
                selectionMode="single"
                items={results || undefined}
                onAction={(id) => {
                  if (id && typeof id === "string") {
                    const item = getSearchResult(id);
                    if (item) {
                      selectionAction(item);
                    }
                  }
                }}
                className="flex-1 overflow-auto min-h-0 p-2 gap-2 bg-white"
                dependencies={[search, results, isIndexing]}
              >
                {(maybeItem) => {
                  const item = getSearchResult(maybeItem.id) || maybeItem;
                  if (!item) return <MenuItem />;
                  return (
                    <MenuItem
                      aria-label={item.label}
                      onAction={() => {
                        selectionAction(item);
                      }}
                      className={({ isFocused }) =>
                        [
                          isFocused ? "bg-blue-500 text-white" : "",
                          //
                          "flex items-center gap-4 py-2 px-4 rounded overflow-hidden",
                        ].join(" ")
                      }
                    >
                      {({ isFocused }) => (
                        <>
                          <div className="flex items-center">
                            <SearchResultIcon
                              item={item}
                              className={`${isFocused ? "opacity-100" : "opacity-50"}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0 truncate select-none">
                            <div className="flex items-center gap-2">
                              <strong className="truncate">{item.label}</strong>
                              {item.source === "collection" &&
                              showCollectionTag ? (
                                <div className="flex-shrink-0 text-xs min-w-0 bg-gray-50 text-gray-500 rounded-sm px-2">
                                  current collection
                                </div>
                              ) : null}
                              {item.source === "history" ? (
                                <div className="flex-shrink-0 text-xs min-w-0 bg-gray-50 text-gray-500 rounded-sm px-2">
                                  history
                                </div>
                              ) : null}
                            </div>
                            <div
                              className={`text-sm ${isFocused ? "opacity-100 underline" : "opacity-50"}`}
                            >
                              {item.subLabel ? item.subLabel : item.id}
                            </div>
                          </div>
                          <div
                            className={`flex items-center justify-end gap-4`}
                          >
                            <div
                              className={`text-sm ${isFocused ? "opacity-100" : "opacity-50"}`}
                            >
                              {item.actionLabel || "Open"}
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
            </div>
          </Autocomplete>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
