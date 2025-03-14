# IIIF Browser

The IIIF Browser (v2) is a powerful and flexible web application for browsing
and interacting with IIIF content. This documentation will guide you through
the various configuration options available to customize the IIIF Browser to
suit your needs.

## Configuration Options

### IIIFBrowserConfig

The `IIIFBrowserConfig` interface defines the configuration options for the
IIIF Browser's user interface (UI).

```typescript
export interface IIIFBrowserConfig {
  defaultPages: {
    homepage: boolean;
    about: boolean;
    history: boolean;
    bookmarks: boolean;
    viewSource: boolean;
  };
  backButton: boolean;
  forwardButton: boolean;
  reloadButton: boolean;
  homeButton: boolean;
  bookmarkButton: boolean;
  menuButton: boolean;

  collectionPaginationSize: number;
  manifestPaginationSize: number;
  paginationNavigationType: "replace" | "push";
  portalIcons: boolean;
  homeLink: string;
}
```

#### Options

- **defaultPages**: Configuration for default pages.

  - `homepage`: Enable or disable the homepage.
  - `about`: Enable or disable the about page.
  - `history`: Enable or disable the history page.
  - `bookmarks`: Enable or disable the bookmarks page.
  - `viewSource`: Enable or disable the view source page.

- **backButton**: Show or hide the back button.
- **forwardButton**: Show or hide the forward button.
- **reloadButton**: Show or hide the reload button.
- **homeButton**: Show or hide the home button.
- **bookmarkButton**: Show or hide the bookmark button.
- **menuButton**: Show or hide the menu button.

- **collectionPaginationSize**: Number of items per page in collections.
- **manifestPaginationSize**: Number of items per page in manifests.
- **paginationNavigationType**: Type of navigation for pagination (`replace`
  or `push`).
- **portalIcons**: Enable or disable portal icons.
- **homeLink**: URL for the home button.

### BrowserLinkConfig

The `BrowserLinkConfig` interface defines the configuration options for link
behavior within the IIIF Browser.

```typescript
export type BrowserLinkConfig = {
  allowNavigationToBuiltInPages: boolean;
  onlyAllowedDomains: boolean;
  canSelectOnlyAllowedDomains: boolean;
  allowedDomains: string[];
  disallowedResources: string[];
  markedResources: string[];
  multiSelect: boolean;
  alwaysShowNavigationArrow: boolean;

  clickToSelect: boolean;
  doubleClickToNavigate: boolean;
  clickToNavigate: boolean;

  canNavigateToCollection: boolean;
  canNavigateToManifest: boolean;
  canNavigateToCanvas: boolean;

  canSelectCollection: boolean;
  canSelectManifest: boolean;
  canSelectCanvas: boolean;

  customCanNavigate: null | ((resource: any, vault: Vault) => boolean);
  customCanSelect: null | ((resource: any, vault: Vault) => boolean);
};
```

#### Options

- **allowNavigationToBuiltInPages**: Allow navigation to built-in pages.
- **onlyAllowedDomains**: Restrict navigation to allowed domains.
- **canSelectOnlyAllowedDomains**: Restrict selection to allowed domains.
- **allowedDomains**: List of allowed domains for navigation and selection.
- **disallowedResources**: List of disallowed resources.
- **markedResources**: List of marked resources (_not yet implemented_)
- **multiSelect**: Enable or disable multi-selection.
- **alwaysShowNavigationArrow**: Always show the navigation arrow.

- **clickToSelect**: Enable or disable click to select.
- **doubleClickToNavigate**: Enable or disable double-click to navigate.
- **clickToNavigate**: Enable or disable click to navigate.

- **canNavigateToCollection**: Allow navigation to collections.
- **canNavigateToManifest**: Allow navigation to manifests.
- **canNavigateToCanvas**: Allow navigation to canvases.

- **canSelectCollection**: Allow selection of collections.
- **canSelectManifest**: Allow selection of manifests.
- **canSelectCanvas**: Allow selection of canvases.

- **customCanNavigate**: Custom function to determine if navigation is
  allowed.
- **customCanSelect**: Custom function to determine if selection is allowed.

### BrowserStoreConfig

The `BrowserStoreConfig` interface defines the configuration options for the
browser store.

```typescript
export type BrowserStoreConfig = {
  requestInitOptions?: RequestInit;
  initialHistory: Array<HistoryItem>;
  initialHistoryCursor: number;
  historyLimit: number;
  restoreFromLocalStorage: boolean;
  saveToLocalStorage: boolean;
  localStorageKey: string;

  preprocessManifest?: (manifest: Manifest) => Promise<Manifest>;
  preprocessCollection?: (collection: Collection) => Promise<Collection>;
  collectionUrlMapping: Record<string, string>;
  collectionUrlMappingParams: Record<string, string>;
  seedCollections: Array<Collection>;
};
```

#### Options

- **requestInitOptions**: Options for fetch requests.
- **initialHistory**: Initial history items.
- **initialHistoryCursor**: Initial history cursor position.
- **historyLimit**: Maximum number of history items.
- **restoreFromLocalStorage**: Restore history from local storage.
- **saveToLocalStorage**: Save history to local storage.
- **localStorageKey**: Key for local storage.

- **preprocessManifest**: Function to preprocess manifests.
- **preprocessCollection**: Function to preprocess collections.
- **collectionUrlMapping**: Mapping of collection URLs.
- **collectionUrlMappingParams**: Parameters for collection URL mapping.
- **seedCollections**: Seed collections to load initially.

### OutputTarget

The `OutputTarget` interface defines the configuration options for output
targets.

```typescript
export type OutputTarget = {
  label: string;
  format: OutputFormat;
  supportedTypes: OutputType[];
  inlineAction?: boolean;
} & OutputTargetTypes;
```

#### Options

- **label**: Label for the output target.
- **format**: Format of the output (e.g., URL, JSON).
- **supportedTypes**: Supported types for the output (e.g., Manifest,
  Collection).
- **inlineAction**: Whether the action is inline.

### Example Usage

Here is an example of how to configure and use the IIIF Browser:

```tsx
import { IIIFBrowser } from "iiif-browser";

export default function App() {
  return (
    <IIIFBrowser
      ui={{
        defaultPages: {
          homepage: true,
          about: true,
          history: true,
          bookmarks: false,
          viewSource: true,
        },
        backButton: true,
        forwardButton: true,
        reloadButton: true,
        homeButton: true,
        bookmarkButton: false,
        menuButton: true,
        collectionPaginationSize: 25,
        manifestPaginationSize: 25,
        paginationNavigationType: "replace",
        portalIcons: true,
        homeLink: "iiif://home",
      }}
      history={{
        localStorageKey: "iiif-browser-history",
        restoreFromLocalStorage: true,
        saveToLocalStorage: true,
        initialHistory: [
          {
            url: "iiif://home",
            resource: null,
            route: "/",
          },
        ],
        initialHistoryCursor: 0,
        historyLimit: 100,
      }}
      navigation={{
        allowNavigationToBuiltInPages: true,
        onlyAllowedDomains: false,
        canSelectOnlyAllowedDomains: false,
        allowedDomains: [],
        disallowedResources: [],
        markedResources: [],
        multiSelect: true,
        alwaysShowNavigationArrow: true,
        clickToSelect: true,
        doubleClickToNavigate: false,
        clickToNavigate: true,
        canNavigateToCollection: true,
        canNavigateToManifest: true,
        canNavigateToCanvas: true,
        canSelectCollection: true,
        canSelectManifest: true,
        canSelectCanvas: true,
      }}
      output={[
        {
          label: "Open in Viewer",
          type: "open-new-window",
          urlPattern: "https://example.org/viewer?manifest={MANIFEST}",
          format: { type: "url", resolvable: true },
          supportedTypes: ["Manifest"],
        },
      ]}
    />
  );
}
```

This example demonstrates how to configure the IIIF Browser with custom UI
options, history settings, navigation behavior, and output targets. Adjust the
configuration options to suit your specific requirements.
