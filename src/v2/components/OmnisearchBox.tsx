import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ComboBox,
  Dialog,
  DialogTrigger,
  Input,
  type Key,
  Label,
  ListBox,
  Menu,
  MenuItem,
  Popover,
  TextField,
  UNSTABLE_Autocomplete,
} from "react-aria-components";
import { useBrowserContainer } from "../browser/BrowserContainer";
import {
  useGetSearchResult,
  useIsPageLoading,
  useLastUrl,
  useResolve,
  useSearchBoxState,
  useSearchIndex,
  useSearchResults,
  useSearchState,
} from "../context";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { HistoryIcon } from "../icons/HistoryIcon";
import { HomeIcon } from "../icons/HomeIcon";
import { InfoIcon } from "../icons/InfoIcon";
import { PageIcon } from "../icons/PageIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";
import { SearchIcon } from "../icons/SearchIcon";
import type { SearchIndexItem } from "../stores/omnisearch-store";

export interface OmnisearchBoxConfig {
  defaultSources: {
    history: boolean;
    bookmarks: boolean;
    currentCollection: boolean;
  };
  staticPages: Array<SearchIndexItem>;
}

export function OmnisearchBox() {
  const container = useBrowserContainer();
  const [search, setSearch] = useSearchState();
  const { isIndexing } = useSearchIndex();
  const lastUrl = useLastUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearchResults();
  const getSearchResult = useGetSearchResult();
  const resolve = useResolve();
  const wasLastOpen = useRef(false);
  const {
    isOpen: isModalOpen,
    open: openModal,
    close: closeModal,
  } = useSearchBoxState();
  const loading = useIsPageLoading();
  const lastUrlWithoutHttps = useMemo(() => {
    return lastUrl.replace(/^https?:\/\//, "");
  }, [lastUrl]);
  const valueToShow = useMemo(() => {
    if (loading) {
      return search.replace(/^https?:\/\//, "");
    }
    return lastUrlWithoutHttps;
  }, [loading, search, lastUrlWithoutHttps]);

  const setIsModalOpen = useCallback(
    (open: boolean) => {
      if (open) {
        openModal(lastUrl);
      } else {
        closeModal();
        wasLastOpen.current = true;
      }
    },
    [lastUrl, openModal, closeModal],
  );

  const selectionAction = useCallback(
    (result: SearchIndexItem) => {
      if (result) {
        if (result.type === "resource") {
          resolve(result.resource.id);
        }
        if (result.type === "action") {
          result.action();
        }
        if (result.type === "page") {
          resolve(result.url);
        }
        setIsModalOpen(false);
        setSearch(result.id as string);
      }
    },
    [setIsModalOpen, setSearch, resolve],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsModalOpen(!isModalOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isModalOpen, setIsModalOpen]);

  const onBlur = useCallback(() => {
    if (!isModalOpen) {
      wasLastOpen.current = false;
    }
  }, [isModalOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to be re-run when indexing status changes
  useEffect(() => {
    if (!isModalOpen) {
      setSearch(lastUrl);
    } else {
      wasLastOpen.current = true;
    }
  }, [isModalOpen, lastUrl, setSearch, isIndexing]);

  useEffect(() => {
    if (isModalOpen) {
      // I hate this hack, but it's the only way to focus the input after the modal opens
      // setTimeout(() => {
      //   inputRef.current?.focus();
      // }, 100);
    }
  }, [isModalOpen]);

  return (
    <DialogTrigger isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
      {/* What is visible when the modal is closed */}
      <div>
        <Label className="sr-only">Search</Label>
        <Button
          onBlur={onBlur}
          onFocus={() => {
            if (!wasLastOpen.current) {
              setIsModalOpen(true);
            }
          }}
          className="p-1 text-sm focus:outline-none text-slate-600 z-10 w-full text-left"
        >
          <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis block truncate">
            {valueToShow}
          </span>
        </Button>
      </div>

      {/* What is visible when the modal is open */}
      <Popover
        className="bg-white inset-0 flex flex-col overflow-hidden"
        UNSTABLE_portalContainer={container || undefined}
        shouldUpdatePosition={false}
      >
        <Dialog className="focus:outline-none flex-1 flex overflow-hidden">
          <UNSTABLE_Autocomplete
            defaultInputValue={search}
            inputValue={search}
            onInputChange={setSearch}
          >
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* The header / search box itself. */}
              <div className="flex h-14 border-b shadow bg-gray-50">
                <div className="w-11 ml-0.5 text-xl flex items-center justify-center text-slate-500">
                  <SearchIcon />
                </div>

                <TextField
                  aria-label="Search commands"
                  className="relative flex-1 min-w-0 translate-y-[-1px] translate-x-[-1px] text-sm"
                >
                  <Input
                    ref={inputRef}
                    autoFocus
                    key={location.pathname + location.search}
                    className="p-1 relative flex-1 w-full h-full bg-transparent z-20 text-slate-600 focus:outline-none"
                    // value={search}
                    onKeyDown={(e) => {
                      // Close on esc
                      if (e.key === "Escape") {
                        setIsModalOpen(false);
                        wasLastOpen.current = true;
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </TextField>
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
                className="flex-1 overflow-auto min-h-0 p-2 gap-2"
                dependencies={[search, results, isIndexing]}
              >
                {(maybeItem) => {
                  const item = getSearchResult(maybeItem.id) || maybeItem;
                  if (!item) return <MenuItem />;
                  return (
                    <MenuItem
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
                              {item.source === "collection" ? (
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
          </UNSTABLE_Autocomplete>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function SearchResultIcon({
  item,
  className,
}: { item: SearchIndexItem; className?: string }) {
  if (item.icon) {
    return item.icon;
  }

  if (item.source === "history") {
    return <HistoryIcon className={`text-2xl ${className}`} />;
  }

  if (item.type === "resource") {
    return (
      <PortalResourceIcon
        noFill
        className={`${className}`}
        type={item.resource.type}
      />
    );
  }

  if (item.id === "iiif://home") {
    return <HomeIcon className={`text-2xl ${className}`} />;
  }

  if (item.id === "iiif://about") {
    return <InfoIcon className={`text-2xl ${className}`} />;
  }

  if (item.id === "iiif://history") {
    return <HistoryIcon className={`text-2xl ${className}`} />;
  }

  return <PageIcon className={`text-2xl ${className}`} />;
}
