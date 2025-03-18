import "./index.css";
import { type ReactNode, useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import { BrowserContainer } from "./browser/BrowserContainer";
import { BrowserFooter } from "./browser/BrowserFooter";
import { BrowserHeader } from "./browser/BrowserHeader";
import type { BrowserLinkConfig } from "./browser/BrowserLink";
import { BrowserWindow } from "./browser/BrowserWindow";
import { Debug } from "./components/Debug";
import { BrowserProvider } from "./context";
import { NotFoundPage } from "./routes/404";
import AboutPage from "./routes/AboutPage";
import { CollectionPage } from "./routes/CollectionPage";
import { HistoryPage } from "./routes/HistoryPage";
import { Homepage } from "./routes/Homepage";
import { LoadingPage } from "./routes/LoadingPage";
import { ManifestPage } from "./routes/ManifestPage";
import type { BrowserStoreConfig } from "./stores/browser-store";
import type { OutputTarget } from "./stores/output-store";
import type { Vault } from "@iiif/helpers";

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

  // Other
  collectionPaginationSize: number;
  manifestPaginationSize: number;
  paginationNavigationType: "replace" | "push";
  portalIcons: boolean;
  homeLink: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
} & {};

export interface IIIFBrowserProps {
  ui?: DeepPartial<IIIFBrowserConfig>;
  history?: Partial<BrowserStoreConfig>;
  navigation?: Partial<BrowserLinkConfig>;
  output?: OutputTarget[]; // format is specified in each target now.
  className?: string;
  customPages?: {
    [key: string]: ReactNode;
  };
  debug?: boolean;
  vault?: Vault;
}

export function useDefaultPages(customPages: IIIFBrowserProps["customPages"]) {
  return useMemo(() => {
    return Object.entries({
      "/": <Homepage />,
      "/about": <AboutPage />,
      "/collection": <CollectionPage />,
      "/manifest": <ManifestPage />,
      "/history": <HistoryPage />,
      "/not-found": <NotFoundPage />,
      "/loading": <LoadingPage />,
      ...(customPages || {}),
    });
  }, [customPages]);
}

export function IIIFBrowser({
  ui,
  history,
  navigation,
  output,
  customPages,
  debug,
  className,
  vault,
}: IIIFBrowserProps) {
  const allCustomPages = useDefaultPages(customPages);

  return (
    <BrowserProvider
      vault={vault}
      outputConfig={output}
      uiConfig={ui}
      browserConfig={history}
      linkConfig={navigation}
      debug={debug}
    >
      <BrowserContainer className={className}>
        <BrowserHeader />

        <BrowserWindow>
          <Routes>
            {allCustomPages.map(([path, element]) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Routes>
        </BrowserWindow>
        <BrowserFooter
          // onSelect={onSelect}
          targets={targets}
          types={types as any}
          format={format}
        />
        <Debug />
      </BrowserContainer>
    </BrowserProvider>
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
