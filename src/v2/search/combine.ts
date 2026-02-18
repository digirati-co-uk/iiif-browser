/**
 * Utilities for combining within-collection and external search results.
 *
 * The omnibox stores results as `SearchIndexItem` objects.  External results
 * are mapped into the same shape (with `source: 'external'`) so they can be
 * rendered by the existing dropdown without modification.
 *
 * The combiner works purely on `SearchIndexItem[]` arrays so the omnibox
 * component doesn't need to know about `V2SearchResult` at combination time.
 */

import type { SearchIndexItem } from '../stores/omnisearch-store';
import type {
  NormalizedV2SearchConfig,
  V2SearchCombinationMode,
  V2SearchResult,
} from './types';

// ---------------------------------------------------------------------------
// V2SearchResult → SearchIndexItem adapter
// ---------------------------------------------------------------------------

/**
 * Convert a `V2SearchResult` (returned by an external adapter) into a
 * `SearchIndexItem` so it can be rendered by the existing omnibox dropdown.
 *
 * The result is typed as a `ResourceAction` with `source: 'external'`.
 */
export function searchResultToIndexItem(result: V2SearchResult): SearchIndexItem {
  return {
    id: `external:${result.id}`,
    type: 'resource',
    label: result.label,
    subLabel: result.summary ?? result.resourceId,
    source: 'external',
    resource: {
      id: result.resourceId,
      type: result.resourceType,
    },
    keywords: [],
    // Carry the thumbnail and extra metadata through via a custom field so
    // the render layer can optionally use it.
    ...(result.thumbnail ? { thumbnail: result.thumbnail } : {}),
  } as SearchIndexItem & { thumbnail?: string };
}

/**
 * Convert an array of `V2SearchResult` objects into `SearchIndexItem` objects,
 * silently dropping any items that fail conversion.
 */
export function searchResultsToIndexItems(
  results: V2SearchResult[],
): SearchIndexItem[] {
  return results
    .map((r) => {
      try {
        return searchResultToIndexItem(r);
      } catch {
        return null;
      }
    })
    .filter((r): r is SearchIndexItem => r !== null);
}

// ---------------------------------------------------------------------------
// Combined result container
// ---------------------------------------------------------------------------

export interface CombinedSearchResults {
  /** The (capped) within-collection results */
  within: SearchIndexItem[];
  /** The (capped) external results, converted to SearchIndexItem */
  external: SearchIndexItem[];
  /**
   * The flat combined list ready for rendering.
   * In 'grouped' mode this is within + external (section headers are rendered
   * separately using the `sections` field below).
   */
  combined: SearchIndexItem[];
  /**
   * Only populated in 'grouped' mode.  Used by the UI to render labelled
   * sections rather than a flat list.
   */
  sections?: {
    within?: SearchIndexItem[];
    external?: SearchIndexItem[];
  };
}

// ---------------------------------------------------------------------------
// Combiner
// ---------------------------------------------------------------------------

/**
 * Combine within-collection `SearchIndexItem[]` and external `V2SearchResult[]`
 * into a single `CombinedSearchResults` according to the combination mode in
 * the normalised config.
 *
 * @param withinItems  - Results from the existing MiniSearch / within-collection index.
 * @param externalResults - Raw results returned by the external adapter.
 * @param config - Normalised search config (includes combination settings).
 */
export function combineSearchResults(
  withinItems: SearchIndexItem[],
  externalResults: V2SearchResult[],
  config: NormalizedV2SearchConfig,
): CombinedSearchResults {
  const { mode, maxWithinResults, maxExternalResults } = config.combination;

  // Apply caps
  const cappedWithin = withinItems.slice(0, maxWithinResults);
  const cappedExternal = searchResultsToIndexItems(
    externalResults.slice(0, maxExternalResults),
  );

  return buildCombined(cappedWithin, cappedExternal, mode);
}

/**
 * Low-level combiner that works on two already-capped `SearchIndexItem[]`
 * arrays.  Exported for testing.
 */
export function buildCombined(
  within: SearchIndexItem[],
  external: SearchIndexItem[],
  mode: V2SearchCombinationMode,
): CombinedSearchResults {
  switch (mode) {
    case 'externalFirst':
      return {
        within,
        external,
        combined: [...external, ...within],
      };

    case 'withinFirst':
      return {
        within,
        external,
        combined: [...within, ...external],
      };

    case 'interleaved': {
      const combined: SearchIndexItem[] = [];
      const maxLen = Math.max(within.length, external.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < within.length) combined.push(within[i]);
        if (i < external.length) combined.push(external[i]);
      }
      return { within, external, combined };
    }

    case 'grouped':
    default:
      return {
        within,
        external,
        // In grouped mode the flat list is within then external – the UI
        // renders section headers using `sections` instead of the flat list.
        combined: [...within, ...external],
        sections: {
          within: within.length > 0 ? within : undefined,
          external: external.length > 0 ? external : undefined,
        },
      };
  }
}

// ---------------------------------------------------------------------------
// Helper: check whether a SearchIndexItem came from external search
// ---------------------------------------------------------------------------

export function isExternalItem(item: SearchIndexItem): boolean {
  return item.source === 'external';
}
