import { BrowserI18nProvider, type BrowserI18n } from "./i18n";
import {
  BrowserPluginsContext,
  type IIIFBrowserPlugin,
} from "./browser/plugins";
export type { IIIFBrowserPlugin } from "./browser/plugins";
import type { Vault } from "@iiif/helpers";
import { type ReactNode, useMemo } from "react";
import { BrowserContainer } from "./browser/BrowserContainer";
import { BrowserFooter } from "./browser/BrowserFooter";
import { BrowserHeader } from "./browser/BrowserHeader";
import type { BrowserLinkConfig } from "./browser/BrowserLink";
import { BrowserWindow } from "./browser/BrowserWindow";
import { Debug } from "./components/Debug";
import { RouterSwitch } from "./components/RouterSwitch";
import { WindowErrorBoundary } from "./components/WindowErrorBoundary";
import { BrowserProvider } from "./context";
import { NotFoundPage } from "./routes/404";
import AboutPage from "./routes/AboutPage";
import { CollectionPage } from "./routes/CollectionPage";
import { HistoryPage } from "./routes/HistoryPage";
import { Homepage } from "./routes/Homepage";
import { ImageServicePage } from "./routes/ImageServicePage";
import { LoadingPage } from "./routes/LoadingPage";
import { ManifestPage } from "./routes/ManifestPage";
import type { V2SearchConfig } from "./search/types";
import type { BrowserStoreConfig } from "./stores/browser-store";
import type { OutputTarget } from "./stores/output-store";
import { ThemeProvider } from "./theme/context";
import type { ThemePreference } from "./theme/theme";

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
  /** Show the light/dark mode toggle in the menu. Hidden when `theme` is set without `onThemeChange`. */
  themeToggle: boolean;

  // Other
  collectionPaginationSize: number;
  manifestPaginationSize: number;
  paginationNavigationType: "replace" | "push";
  portalIcons: boolean;
  homeLink: string;
  showFilterButton: boolean;
  manifestInfoButton?: boolean;
  /** @deprecated Use manifestInfoButton instead. */
  showManifestMetadata: boolean;
  collectionSearchTagEnabled: boolean;
  buttonClassName: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
} & {};

export interface IIIFBrowserProps {
  i18n?: BrowserI18n;
  /** Stable scope for saved preferences. Set distinct keys for identical browser configurations. */
  preferenceKey?: string;
  /**
   * Colour theme: `light`, `dark` or `system` (follow the OS). When set the host owns the theme and
   * the menu toggle is hidden unless `onThemeChange` is also given. When unset the browser starts
   * light and the menu toggle switches it, remembering the choice.
   */
  theme?: ThemePreference;
  onThemeChange?: (theme: ThemePreference) => void;
  /**
   * Accent colour for buttons, links and selection: hex (`#0d9488`), `rgb(13 148 136)` or `13 148 136`.
   * Text on filled accents is chosen automatically so it stays readable.
   */
  accentColor?: string;
  ui?: DeepPartial<IIIFBrowserConfig>;
  history?: Partial<BrowserStoreConfig>;
  navigation?: Partial<BrowserLinkConfig>;
  output?: OutputTarget[]; // format is specified in each target now.
  className?: string;
  innerClassName?: string;
  customPages?: {
    [key: string]: ReactNode;
  };
  debug?: boolean;
  vault?: Vault;
  search?: V2SearchConfig;
  plugins?: IIIFBrowserPlugin[];
}

export function useDefaultPages(customPages: IIIFBrowserProps["customPages"]) {
  return useMemo(() => {
    return Object.entries({
      "/": <Homepage />,
      "/about": <AboutPage />,
      "/collection": <CollectionPage />,
      "/manifest": <ManifestPage />,
      "/history": <HistoryPage />,
      "/image-service": <ImageServicePage />,
      "/not-found": <NotFoundPage />,
      "/loading": <LoadingPage />,
      ...(customPages || {}),
    });
  }, [customPages]);
}

function IIIFBrowserContent({
  preferenceKey,
  theme,
  onThemeChange,
  accentColor,
  ui,
  history,
  navigation,
  output,
  customPages,
  debug,
  className,
  vault,
  innerClassName,
  search,
  plugins = [],
}: IIIFBrowserProps) {
  const pluginPages = useMemo(
    () =>
      Object.assign({}, ...plugins.map((plugin) => plugin.pages), customPages),
    [plugins, customPages],
  );
  const allCustomPages = useDefaultPages(pluginPages);
  const browserHistory = useMemo(
    () => ({
      ...history,
      customRoutes: {
        ...Object.fromEntries(
          Object.keys(pluginPages)
            .filter((path) => path !== "/")
            .map((path) => [`iiif://${path.replace(/^\//, "")}`, path]),
        ),
        ...history?.customRoutes,
      },
    }),
    [history, pluginPages],
  );

  return (
    <ThemeProvider
      theme={theme}
      onThemeChange={onThemeChange}
      accentColor={accentColor}
      allowToggle={ui?.themeToggle ?? true}
      preferenceKey={preferenceKey}
    >
      <BrowserPluginsContext.Provider value={plugins}>
        <BrowserProvider
          preferenceKey={preferenceKey}
          vault={vault}
          outputConfig={output}
          uiConfig={ui}
          browserConfig={browserHistory}
          linkConfig={navigation}
          searchConfig={search}
          debug={debug}
        >
          <BrowserContainer
            className={className}
            innerClassName={innerClassName}
          >
            <WindowErrorBoundary>
              <BrowserHeader />

              <BrowserWindow>
                <RouterSwitch routes={allCustomPages} />
              </BrowserWindow>
              <BrowserFooter
                // onSelect={onSelect}
                targets={targets}
                types={types as any}
                format={format}
              />
              <Debug />
            </WindowErrorBoundary>
          </BrowserContainer>
        </BrowserProvider>
      </BrowserPluginsContext.Provider>
    </ThemeProvider>
  );
}

const types = ["Collection", "Manifest", "Canvas", "CanvasRegion"];

const targets = [
  {
    type: "open-new-window",
    urlPattern: "https://theseusviewer.org/?iiif-content={MANIFEST}",
    label: "Open in Theseus",
  },
  {
    type: "open-new-window",
    urlPattern:
      "https://universalviewer.dev/#?iiifManifestId={MANIFEST}&cv={CANVAS_INDEX}&xywh={XYWH}",
    label: "Open in UV",
  },
  {
    type: "open-new-window",
    label: "Open in Clover",
    urlPattern:
      "https://samvera-labs.github.io/clover-iiif/?iiif-content={MANIFEST}",
  },
  {
    type: "open-new-window",
    label: "Open in Mirador",
    urlPattern:
      "https://tomcrane.github.io/scratch/mirador3/index.html?iiif-content={MANIFEST}",
  },
  {
    type: "open-new-window",
    label: "Open JSON-LD",
    urlPattern: "{RESULT}",
  },
] as any;

const format = { type: "url", resolvable: false } as any;

export function IIIFBrowser({ i18n, ...props }: IIIFBrowserProps) {
 return <BrowserI18nProvider i18n={i18n}><IIIFBrowserContent {...props} /></BrowserI18nProvider>;
}
