import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export type PaginatedActions = ReturnType<typeof usePaginateArray>[1];

export function usePaginateArray<T>(array: T[], pageSize: number) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.ceil(array.length / pageSize);

  const setCurrentPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setSearchParams((prev) => {
          prev.set("page", page.toString());
          return prev;
        });
        topRef.current?.scrollIntoView({ behavior: "instant" });
      }
    },
    [setSearchParams, totalPages],
  );

  const paginatedArray = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return array.slice(startIndex, endIndex);
  }, [array, currentPage, pageSize]);

  const actions = useMemo(() => {
    // Actions.
    function nextPage() {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    }

    function prevPage() {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }

    function goToPage(page: number) {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    }

    function goToFirstPage() {
      setCurrentPage(1);
    }

    function goToLastPage() {
      setCurrentPage(totalPages);
    }

    return {
      currentPage,
      totalPages,
      nextPage,
      prevPage,
      pageSize,
      goToPage,
      goToFirstPage,
      goToLastPage,
      topRef,
    };
  }, [currentPage, pageSize, totalPages, setCurrentPage]);

  return [paginatedArray, actions] as const;
}
