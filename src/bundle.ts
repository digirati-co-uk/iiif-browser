import "./styles/lib.css";
import "./index.css";
export * from "./IIIFBrowser";
export * from "./context";
export type {
  V2SearchConfig,
  V2SearchResult,
  V2SearchResultKind,
  V2ExternalSearchAdapter,
  V2ExternalSearchAdapterSearchOptions,
  V2FilterState,
  V2TypesenseConfig,
  V2TypesenseHit,
  V2SearchCombinationMode,
  V2SearchCombinationConfig,
  NormalizedV2SearchConfig,
} from "./search/types";
export { normalizeV2SearchConfig } from "./search/types";
export { createExternalSearchAdapter, resolveAdapterFromNormalized } from "./search/adapter-factory";
export { createTypesenseAdapter } from "./search/typesense-adapter";
export {
  combineSearchResults,
  buildCombined,
  searchResultToIndexItem,
  searchResultsToIndexItems,
  isExternalItem,
} from "./search/combine";
export type { CombinedSearchResults } from "./search/combine";
export { useExternalSearch } from "./hooks/use-external-search";
export type { UseExternalSearchOptions, UseExternalSearchResult } from "./hooks/use-external-search";

export {
  ThemeProvider,
  useBrowserTheme,
  useThemeAttributes,
  type BrowserThemeValue,
  type ThemeProviderProps,
} from "./theme/context";
export {
  createThemeAttributes,
  createThemeVariables,
  resolveAccent,
  DEFAULT_ACCENT,
  type ThemeMode,
  type ThemePreference,
} from "./theme/theme";

export { BrowserI18nProvider, type BrowserI18n } from "./i18n";
