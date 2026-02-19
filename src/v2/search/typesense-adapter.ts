/**
 * Typesense adapter for v2 external search.
 *
 * Translates a V2TypesenseConfig into a V2ExternalSearchAdapter that calls
 * the Typesense search API and maps hits into V2SearchResult objects.
 */

import type {
  V2ExternalSearchAdapter,
  V2ExternalSearchAdapterSearchOptions,
  V2FilterState,
  V2SearchResult,
  V2TypesenseConfig,
  V2TypesenseHit,
} from "./types";

// ---------------------------------------------------------------------------
// Typesense API response shapes (minimal, covering what we need)
// ---------------------------------------------------------------------------

// V2TypesenseHit is the public type from types.ts; alias it here for clarity.
type TypesenseSearchHit = V2TypesenseHit;

interface TypesenseSearchResponse {
  hits?: TypesenseSearchHit[];
  found?: number;
  out_of?: number;
  page?: number;
  search_time_ms?: number;
}

// ---------------------------------------------------------------------------
// Default hit → V2SearchResult mapper
// ---------------------------------------------------------------------------

/**
 * Attempt to read a string value from a document using several candidate
 * field names.  Returns undefined if none are found.
 */
function pickString(doc: Record<string, unknown>, candidates: string[]): string | undefined {
  for (const key of candidates) {
    const val = doc[key];
    if (typeof val === "string" && val.length > 0) return val;
    // Handle IIIF-style language maps: { en: ['value'] }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const langMap = val as Record<string, unknown>;
      for (const lang of Object.keys(langMap)) {
        const entries = langMap[lang];
        if (Array.isArray(entries) && typeof entries[0] === "string") {
          return entries[0];
        }
      }
    }
  }
  return undefined;
}

/**
 * Derive a human-readable summary from Typesense highlight snippets.
 * Joins all non-empty snippets with " · " as a separator, preserving the
 * `<mark>` tags so callers can render matched tokens as highlighted text.
 * Falls back to null if there are no highlights.
 */
function summaryFromHighlights(highlights: TypesenseSearchHit["highlights"]): string | null {
  if (!highlights || highlights.length === 0) return null;
  const parts = highlights
    .map((h) => (h.snippet ? h.snippet.trim() : null))
    .filter((s): s is string => !!s && s.length > 0);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function defaultMapHitToResult(hit: TypesenseSearchHit): V2SearchResult {
  const doc = hit.document;

  const id = pickString(doc, ["id", "@id", "iiif_id", "iiifId"]) ?? String(Math.random());

  const label = pickString(doc, ["label", "title", "name", "heading"]) ?? "Untitled resource";

  const thumbnail = pickString(doc, ["thumbnail", "thumbnailUrl", "thumbnail_url"]) ?? null;

  // Prefer server-side highlight snippets; fall back to stored summary fields.
  const summary =
    summaryFromHighlights(hit.highlights) ??
    pickString(doc, ["summary", "description", "snippet", "metadata.summary"]) ??
    null;

  const resourceId = pickString(doc, ["iiif_id", "iiifId", "manifest_id", "manifestId", "id", "@id"]) ?? id;

  const rawType = pickString(doc, ["type", "resource_type", "resourceType", "@type"]) ?? "";
  const resourceType = rawType.toLowerCase().includes("collection")
    ? "collection"
    : rawType.toLowerCase().includes("canvas")
      ? "canvas"
      : "manifest";

  return {
    id,
    label,
    thumbnail,
    summary,
    kind: "external",
    resourceId,
    resourceType,
    metadata: doc,
  };
}

// ---------------------------------------------------------------------------
// Default filter → Typesense filter_by mapper
// ---------------------------------------------------------------------------

function defaultMapFiltersToFilterBy(filters: V2FilterState): string | undefined {
  const parts: string[] = [];

  if (filters.resourceType) {
    // Attempt a simple equality filter on a `type` field.
    // Projects should override this via typesense.mapFiltersToFilterBy if the
    // field name or values differ.
    const typeValue = filters.resourceType.toLowerCase();
    parts.push(`type:=${typeValue}`);
  }

  return parts.length > 0 ? parts.join(" && ") : undefined;
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function buildTypesenseUrl(config: V2TypesenseConfig): string {
  const protocol = config.protocol ?? "https";
  const port = config.port;
  const host = port ? `${config.host}:${port}` : config.host;
  const path = config.path ?? "";
  return `${protocol}://${host}${path}/collections/${encodeURIComponent(config.collection)}/documents/search`;
}

// ---------------------------------------------------------------------------
// Query parameter builder
// ---------------------------------------------------------------------------

function buildSearchParams(
  query: string,
  options: V2ExternalSearchAdapterSearchOptions,
  config: V2TypesenseConfig,
): URLSearchParams {
  const params = new URLSearchParams();

  // Core parameters
  params.set("q", query || "*");
  params.set("per_page", String(options.limit));

  // Merge any static searchParams from config
  if (config.searchParams) {
    for (const [key, value] of Object.entries(config.searchParams)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
  }

  // Ensure query_by is set (required by Typesense)
  if (!params.has("query_by")) {
    params.set("query_by", "label,title,summary,description");
  }

  // Apply filters if passActiveFilters is not explicitly disabled
  if (options.filters) {
    const filterBy = config.mapFiltersToFilterBy
      ? config.mapFiltersToFilterBy(options.filters, query)
      : defaultMapFiltersToFilterBy(options.filters);

    if (filterBy) {
      const existingFilterBy = params.get("filter_by");
      params.set("filter_by", existingFilterBy ? `${existingFilterBy} && ${filterBy}` : filterBy);
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

/**
 * Build a `V2ExternalSearchAdapter` from a `V2TypesenseConfig`.
 *
 * @example
 * ```ts
 * const adapter = createTypesenseAdapter({
 *   host: 'search.example.org',
 *   apiKey: 'my-key',
 *   collection: 'iiif_resources',
 * });
 * ```
 */
export function createTypesenseAdapter(config: V2TypesenseConfig): V2ExternalSearchAdapter {
  const baseUrl = buildTypesenseUrl(config);
  const mapHit = config.mapHitToResult ?? defaultMapHitToResult;

  return {
    id: "typesense",

    async search(query: string, options: V2ExternalSearchAdapterSearchOptions): Promise<V2SearchResult[]> {
      try {
        const searchParams = buildSearchParams(query, options, config);
        const url = `${baseUrl}?${searchParams.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-TYPESENSE-API-KEY": config.apiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`[iiif-browser] Typesense search failed: ${response.status} ${response.statusText}`);
          return [];
        }

        const data: TypesenseSearchResponse = await response.json();

        if (!data.hits || data.hits.length === 0) {
          return [];
        }

        return data.hits
          .map((hit) => {
            try {
              return mapHit(hit);
            } catch (mappingError) {
              console.warn("[iiif-browser] Typesense hit mapping error:", mappingError, hit);
              return null;
            }
          })
          .filter((r): r is V2SearchResult => r !== null);
      } catch (error) {
        console.warn("[iiif-browser] Typesense search error:", error);
        return [];
      }
    },
  };
}
