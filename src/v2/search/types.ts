/**
 * Core types for external search / autocomplete integration in v2.
 *
 * These types are used by both the built-in Typesense adapter and any
 * custom adapters supplied via config.
 */

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

/**
 * Represents the active filter state that can be passed to external adapters.
 * Mirrors the filter concepts already in the browser (e.g. type filters,
 * source filters, etc.).
 */
export interface V2FilterState {
  /** e.g. 'manifest' | 'collection' | null for "any" */
  resourceType?: "manifest" | "collection" | "canvas" | string | null;
  /** Source filter from the omnibox (e.g. 'collection', 'history') */
  sourceFilter?: string | null;
  /** The ID of the currently loaded collection, if any */
  currentCollectionId?: string | null;
  /** Any additional project-specific filter values */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Search result model
// ---------------------------------------------------------------------------

export type V2SearchResultKind = "within" | "external";

/**
 * Unified internal result shape used by both within-collection search and
 * external adapters.  External adapters must return results in this shape;
 * within-collection results are adapted into it before combining.
 */
export interface V2SearchResult {
  /** Unique identifier within the combined result set */
  id: string;
  /** Main display label */
  label: string;
  /** Optional thumbnail URL */
  thumbnail?: string | null;
  /** Optional text snippet / description */
  summary?: string | null;
  /** Distinguishes within-collection vs external results */
  kind: V2SearchResultKind;
  /**
   * The IIIF resource identifier (manifest URL, collection URL, etc.) that
   * the browser should navigate to when this result is selected.
   */
  resourceId: string;
  /** IIIF resource type */
  resourceType: "manifest" | "collection" | "canvas" | "annotation" | string;
  /** Any extra data the adapter wishes to attach (for custom rendering, etc.) */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// External adapter interface
// ---------------------------------------------------------------------------

export interface V2ExternalSearchAdapterSearchOptions {
  /** Current filter state from the browser */
  filters: V2FilterState;
  /** Maximum number of results to return */
  limit: number;
  /** Additional context (e.g. language, current collection, etc.) */
  context?: Record<string, unknown>;
}

/**
 * Interface that every external search adapter must implement.
 * You can supply a custom adapter via `V2SearchConfig.adapter`, or use the
 * built-in Typesense adapter via `V2SearchConfig.typesense`.
 */
export interface V2ExternalSearchAdapter {
  /** Optional identifier, useful for debugging */
  id?: string;
  /**
   * Execute a search query and return a list of results.
   * This function should handle its own error handling and return an empty
   * array (not throw) on failure so the omnibox degrades gracefully.
   */
  search(query: string, options: V2ExternalSearchAdapterSearchOptions): Promise<V2SearchResult[]>;
}

// ---------------------------------------------------------------------------
// Typesense config
// ---------------------------------------------------------------------------

/**
 * A single hit returned by the Typesense search API, including the document
 * fields and any highlight snippets produced by the server.
 */
export interface V2TypesenseHit {
  /** The raw document stored in the collection. */
  document: Record<string, unknown>;
  /**
   * Per-field highlight information.  Each entry contains the matched field
   * name and an HTML-snippet string with `<mark>` tags around matched tokens.
   */
  highlights?: Array<{
    field: string;
    /** HTML snippet with matched tokens wrapped in `<mark>` tags. */
    snippet?: string;
    matched_tokens?: string[];
  }>;
  text_match?: number;
}

export interface V2TypesenseConfig {
  host: string;
  port?: number;
  protocol?: "http" | "https";
  apiKey: string;
  collection: string;
  /**
   * Extra Typesense query parameters to merge in (e.g. query_by, filter_by,
   * sort_by, per_page, …).
   */
  searchParams?: Record<string, unknown>;
  /**
   * Optional custom mapper: convert a raw Typesense hit into a V2SearchResult.
   * When omitted a sensible default mapping is applied.
   *
   * The `hit` argument contains both the full `document` and any server-side
   * `highlights` (snippets with `<mark>` tags around matched tokens).  Use
   * `hit.highlights` to surface contextual match previews as the `summary`.
   */
  mapHitToResult?(hit: V2TypesenseHit): V2SearchResult;
  /**
   * Optional custom mapper: convert the current UI filter state into a
   * Typesense `filter_by` expression string.
   * When omitted a simple default (type field mapping) is attempted.
   */
  mapFiltersToFilterBy?(filters: V2FilterState, query: string): string | undefined;
}

// ---------------------------------------------------------------------------
// Combination strategies
// ---------------------------------------------------------------------------

export type V2SearchCombinationMode =
  | "grouped" // default – section headers for each source
  | "interleaved" // round-robin merge
  | "externalFirst"
  | "withinFirst";

export interface V2SearchCombinationConfig {
  mode?: V2SearchCombinationMode;
  maxExternalResults?: number;
  maxWithinResults?: number;
}

// ---------------------------------------------------------------------------
// Top-level search config
// ---------------------------------------------------------------------------

/**
 * The `search` section of the v2 browser config.
 *
 * @example
 * ```ts
 * search: {
 *   enableWithinCollection: true,
 *   enableExternal: true,
 *   typesense: {
 *     host: 'search.example.org',
 *     apiKey: '…',
 *     collection: 'iiif_resources',
 *   },
 * }
 * ```
 */
export interface V2SearchConfig {
  /**
   * Enable the existing within-collection / history search.
   * @default true
   */
  enableWithinCollection?: boolean;

  /**
   * Enable external search via the configured adapter.
   * @default false
   */
  enableExternal?: boolean;

  /**
   * Controls how within and external results are combined in the dropdown.
   */
  combination?: V2SearchCombinationConfig;

  /**
   * Filter passthrough strategy.
   * When `passActiveFilters` is true (the default) the current UI filter state
   * is forwarded to the external adapter's `search` call.
   */
  filterStrategy?: {
    passActiveFilters?: boolean;
    mapFiltersToExternalQuery?(filters: V2FilterState, context: { searchText: string }): Record<string, unknown>;
  };

  /**
   * Built-in Typesense integration.  Only used when `adapter` is NOT also
   * supplied (custom adapter takes precedence).
   */
  typesense?: V2TypesenseConfig;

  /**
   * Custom adapter.  When provided this takes precedence over `typesense`.
   */
  adapter?: V2ExternalSearchAdapter;

  /**
   * Section label displayed above within-collection results when mode is 'grouped'.
   * @default "In this collection"
   */
  withinSectionLabel?: string;

  /**
   * Section label displayed above external results when mode is 'grouped'.
   * @default "Global results"
   */
  externalSectionLabel?: string;
}

// ---------------------------------------------------------------------------
// Normalised config (resolved at runtime)
// ---------------------------------------------------------------------------

export interface NormalizedV2SearchConfig {
  enableWithinCollection: boolean;
  enableExternal: boolean;
  combination: Required<V2SearchCombinationConfig>;
  filterStrategy: {
    passActiveFilters: boolean;
    mapFiltersToExternalQuery?: V2SearchConfig["filterStrategy"] extends undefined
      ? never
      : NonNullable<V2SearchConfig["filterStrategy"]>["mapFiltersToExternalQuery"];
  };
  withinSectionLabel: string;
  externalSectionLabel: string;
  typesense?: V2TypesenseConfig;
  adapter?: V2ExternalSearchAdapter;
}

/**
 * Resolve raw `V2SearchConfig` (or undefined) into a fully-filled
 * `NormalizedV2SearchConfig` with all defaults applied.
 */
export function normalizeV2SearchConfig(raw: V2SearchConfig | undefined): NormalizedV2SearchConfig {
  return {
    enableWithinCollection: raw?.enableWithinCollection ?? true,
    enableExternal: raw?.enableExternal ?? false,
    combination: {
      mode: raw?.combination?.mode ?? "grouped",
      maxExternalResults: raw?.combination?.maxExternalResults ?? 10,
      maxWithinResults: raw?.combination?.maxWithinResults ?? 30,
    },
    filterStrategy: {
      passActiveFilters: raw?.filterStrategy?.passActiveFilters ?? true,
      mapFiltersToExternalQuery: raw?.filterStrategy?.mapFiltersToExternalQuery,
    },
    withinSectionLabel: raw?.withinSectionLabel ?? "In this collection",
    externalSectionLabel: raw?.externalSectionLabel ?? "Global results",
    typesense: raw?.typesense,
    adapter: raw?.adapter,
  };
}
