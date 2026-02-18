/**
 * useExternalSearch – React hook for querying an external search adapter.
 *
 * Responsibilities:
 * - Accept a resolved V2ExternalSearchAdapter (or null) and the current query.
 * - Debounce the query before firing requests.
 * - Run the adapter's search() method and surface results, loading, and error states.
 * - Cancel in-flight requests when the query changes or the component unmounts.
 * - Degrade gracefully: on error, return an empty results array.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { V2ExternalSearchAdapter, V2FilterState, V2SearchResult } from '../search/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseExternalSearchOptions {
  /**
   * The resolved adapter, or null when external search is disabled.
   * When null the hook is a no-op and always returns an empty result set.
   */
  adapter: V2ExternalSearchAdapter | null;

  /** Current query string from the omnibox input. */
  query: string;

  /** Current filter state to forward to the adapter. */
  filters?: V2FilterState;

  /**
   * Maximum number of results to request from the adapter.
   * @default 10
   */
  limit?: number;

  /**
   * Debounce delay in milliseconds.  The adapter will not be called until the
   * query has been stable for this long.
   * @default 250
   */
  debounceMs?: number;

  /**
   * Additional context forwarded verbatim to the adapter's search() call.
   */
  context?: Record<string, unknown>;
}

export interface UseExternalSearchResult {
  /** Results from the most recently completed search, or [] when none. */
  results: V2SearchResult[];
  /** True while a request is in flight. */
  isLoading: boolean;
  /** The error from the most recent failed request, or null. */
  error: unknown;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExternalSearch({
  adapter,
  query,
  filters = {},
  limit = 10,
  debounceMs = 250,
  context,
}: UseExternalSearchOptions): UseExternalSearchResult {
  const [results, setResults] = useState<V2SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Track the abort controller for the in-flight request so we can cancel it.
  const abortRef = useRef<AbortController | null>(null);

  // Keep a stable reference to context so it doesn't invalidate the effect.
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  // Keep a stable reference to filters.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Stable search function – re-created only when adapter or limit changes.
  const runSearch = useCallback(
    async (searchQuery: string, signal: AbortSignal) => {
      if (!adapter) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await adapter.search(searchQuery, {
          filters: filtersRef.current,
          limit,
          context: contextRef.current,
        });

        // If the request was superseded while in flight, ignore the results.
        if (signal.aborted) return;

        setResults(data);
      } catch (err) {
        if (signal.aborted) return;
        console.warn('[iiif-browser] External search error:', err);
        setError(err);
        setResults([]);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [adapter, limit],
  );

  // Debounced effect: fires the adapter search whenever query or adapter changes.
  useEffect(() => {
    // No adapter → keep results empty, never load.
    if (!adapter) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel the previous in-flight request.
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timerId = setTimeout(() => {
      runSearch(query, controller.signal);
    }, debounceMs);

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [adapter, query, debounceMs, runSearch]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return useMemo(
    () => ({ results, isLoading, error }),
    [results, isLoading, error],
  );
}
