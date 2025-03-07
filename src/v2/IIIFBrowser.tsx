import "./index.css";
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
import { Homepage } from "./routes/Homepage";
import { LoadingPage } from "./routes/LoadingPage";
import { ManifestPage } from "./routes/ManifestPage";
import type { BrowserStoreConfig } from "./stores/browser-store";
import type { OutputTarget } from "./stores/output-store";

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
}

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
} & {};

interface IIIFBrowserProps {
  ui?: DeepPartial<IIIFBrowserConfig>;
  history?: Partial<BrowserStoreConfig>;
  navigation?: DeepPartial<BrowserLinkConfig>;
  output?: OutputTarget[]; // format is specified in each target now.
}

export function IIIFBrowser() {
  return (
    <BrowserProvider>
      <BrowserContainer>
        <BrowserHeader />

        <BrowserWindow>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/loading" element={<LoadingPage />} />

            <Route path="/about" element={<AboutPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/manifest" element={<ManifestPage />} />
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
      "https://uv-v4.netlify.app/#?iiifManifestId={MANIFEST}&cv={CANVAS_INDEX}&xywh={XYWH}",
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
