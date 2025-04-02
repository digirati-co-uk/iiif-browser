import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button, Label } from "react-aria-components";
import {
  useIsPageLoading,
  useLastUrl,
  useResolve,
  useSearchBoxState,
  useSearchIndex,
  useSearchState,
} from "../context";
import type { SearchIndexItem } from "../stores/omnisearch-store";
import { OmnisearchModal } from "./OmnisearchModal";

export interface OmnisearchBoxConfig {
  defaultSources: {
    history: boolean;
    bookmarks: boolean;
    currentCollection: boolean;
  };
  staticPages: Array<SearchIndexItem>;
}

export function Omnisearch() {
  const [search, setSearch] = useSearchState();
  const { isIndexing } = useSearchIndex();
  const lastUrl = useLastUrl();
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
      }
    },
    [resolve],
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

  const onClose = useCallback(() => {
    //
  }, []);

  return (
    <OmnisearchModal
      wasLastOpenRef={wasLastOpen}
      onSelect={selectionAction}
      onClose={onClose}
    >
      {/* What is visible when the modal is closed */}
      <div>
        <Label className="sr-only">Search</Label>
        <Button
          aria-label="Edit URL and show search"
          onBlur={onBlur}
          onFocus={() => {
            if (!wasLastOpen.current) {
              setIsModalOpen(true);
            }
          }}
          onPress={() => {
            if (wasLastOpen.current) {
              setIsModalOpen(true);
            }
          }}
          className="p-1 text-sm focus:outline-none text-slate-600 z-10 w-full text-left"
        >
          <span
            aria-label="Current URL"
            className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis block truncate"
          >
            {valueToShow}
          </span>
        </Button>
      </div>
    </OmnisearchModal>
  );
}
