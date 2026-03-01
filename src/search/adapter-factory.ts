/**
 * Adapter factory for v2 external search.
 *
 * Resolves the correct V2ExternalSearchAdapter (or null) from the normalised
 * search config.  Resolution order:
 *
 * 1. If `enableExternal` is false  →  null (external search disabled).
 * 2. If `config.adapter` is set    →  use it directly (custom adapter wins).
 * 3. If `config.typesense` is set  →  build a Typesense adapter from config.
 * 4. Otherwise                     →  null (no adapter configured).
 */

import { createTypesenseAdapter } from './typesense-adapter';
import type {
  NormalizedV2SearchConfig,
  V2ExternalSearchAdapter,
  V2SearchConfig,
} from './types';
import { normalizeV2SearchConfig } from './types';

/**
 * Resolve a `V2ExternalSearchAdapter | null` from a raw `V2SearchConfig`.
 *
 * This is the main entry-point for wiring up external search.  Call it once
 * (e.g. inside a `useMemo`) and store the result for the lifetime of the
 * omnibox.
 *
 * @example
 * ```ts
 * const adapter = useMemo(
 *   () => createExternalSearchAdapter(searchConfig),
 *   [searchConfig],
 * );
 * ```
 */
export function createExternalSearchAdapter(
  config: V2SearchConfig | undefined,
): V2ExternalSearchAdapter | null {
  const normalized = normalizeV2SearchConfig(config);
  return resolveAdapterFromNormalized(normalized);
}

/**
 * Same as `createExternalSearchAdapter` but accepts an already-normalised
 * config.  Useful when you have already called `normalizeV2SearchConfig`.
 */
export function resolveAdapterFromNormalized(
  config: NormalizedV2SearchConfig,
): V2ExternalSearchAdapter | null {
  // 1. External search is disabled – return nothing.
  if (!config.enableExternal) {
    return null;
  }

  // 2. Custom adapter takes precedence over built-in Typesense.
  if (config.adapter) {
    return config.adapter;
  }

  // 3. Build a Typesense adapter from the Typesense config block.
  if (config.typesense) {
    return createTypesenseAdapter(config.typesense);
  }

  // 4. External search is enabled but no adapter is configured – warn and bail.
  console.warn(
    '[iiif-browser] search.enableExternal is true but neither ' +
      'search.adapter nor search.typesense is configured. ' +
      'No external search will be performed.',
  );
  return null;
}
