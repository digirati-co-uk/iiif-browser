import { getValue } from "@iiif/helpers";
import { Command } from "cmdk";
import {
  type SVGProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Button,
  Input,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import {
  CanvasContext,
  LocaleString,
  ManifestContext,
  SimpleViewerProvider,
  useCollection,
  useManifest,
  useVault,
} from "react-iiif-vault";
import {
  Route,
  Routes,
  ScrollRestoration,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { useStore } from "zustand";
import { CurrentCollectionSearchResults } from "../cmd-k/CurrentCollectionSearchResults";
import { OpenInTheseus } from "../cmd-k/OpenInTheseus";
import { BrowserOutput } from "../components/BrowserOutput";
import { HistoryListItem } from "../components/HistoryListItem";
import { OmnisearchBox } from "../components/OmisearchBox";
import {
  useBrowserStoreContext,
  useCurrentCollection,
  useHistory,
  useHistoryList,
  useIsPageLoading,
  useLastUrl,
  useLoadResource,
  useOmnibarState,
  useResolve,
  useSearchState,
} from "../context";
import { CollectionItemList } from "../resources/CollectionItemList";
import { ManifestCanvasViewer } from "../resources/ManifestCanvasViewer";
import { ManifestItemList } from "../resources/ManifestItemList";
import { fixedRoutes } from "../routes";
import About from "./About";

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

export default function Homepage() {
  const containerElement = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => setContainer(node),
    [],
  );
  const inputElement = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolve = useResolve();
  const lastUrl = useLastUrl();
  const history = useHistory();
  const historyList = useHistoryList();
  const location = useLocation();
  const lastUrlWithoutHttps = useMemo(() => {
    return lastUrl.replace(/^https?:\/\//, "");
  }, [lastUrl]);
  const loading = useIsPageLoading();
  const [value, setValue] = useOmnibarState();
  const currentCollection = useCurrentCollection();
  const newOmnibox = true;

  const valueToShow = useMemo(() => {
    if (loading) {
      return value.replace(/^https?:\/\//, "");
    }
    return lastUrlWithoutHttps;
  }, [loading, value, lastUrlWithoutHttps]);

  const onOpenChange = (open: boolean) => {
    if (open === false) {
      setValue(lastUrl);
    }
    setIsOpen(open);
  };

  const openUrl = (url: string) => {
    resolve(url, true);
    setValue(url);
    setIsOpen(false);
  };

  return (
    <div className="m-16 max-w-xl flex">
      <div
        className="bg-white flex-1 relative border rounded-lg shadow-2xl mb-8 border-slate-200 overflow-hidden"
        ref={setRef}
      >
        <div className="flex w-full items-center justify-between border-b shadow-sm gap-1 px-1">
          <MenuTrigger trigger="longPress">
            <Button
              isDisabled={historyList.length <= 1}
              onPress={() => {
                history.back();
              }}
              className="flex-shrink-0 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white aria-expanded:bg-slate-200 outline-none focus:ring ring-blue-300 text-2xl rounded hover:bg-slate-100 p-1.5 m-1"
            >
              <ArrowBackIcon />
            </Button>
            <Popover
              placement="bottom start"
              className={twMerge(
                "bg-white drop-shadow-lg shadow-slate-600 p-1 rounded text-sm max-w-96 text-slate-600",
                historyList.length <= 1 ? "hidden" : "",
              )}
            >
              <Menu className="flex flex-col gap-1 outline-none">
                {historyList.slice(0, 10).map((item, index) => {
                  if (index === 0) return null;
                  return (
                    <MenuItem
                      key={index}
                      onAction={() => history.go(-index)}
                      className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                    >
                      <HistoryListItem historyItem={item} />
                    </MenuItem>
                  );
                })}
              </Menu>
            </Popover>
          </MenuTrigger>
          <div
            className={twMerge(
              "flex-1 w-full relative my-2 bg-white rounded border border-slate-300 shadow-sm flex gap-1.5 py-1 px-2 items-center",
              // Loading state
              "after:content-[''] after:bottom-0 after:absolute after:left-0 after:h-0.5 after:bg-gradient-to-r after:rounded-r-lg after:shadow-sm",
              "after:bg-transparent after:w-0 after:duration-1000 after:opacity-0 after:transition-none",
              loading &&
                "after:w-64 after:bg-blue-500 after:transition-all after:opacity-100",
            )}
          >
            <div className="text-md p-1 flex-shink-0">
              <LockIcon />
            </div>
            <div className="flex-1 overflow-hidden min-w-32">
              {newOmnibox ? (
                container ? (
                  <OmnisearchBox container={container} />
                ) : null
              ) : (
                <>
                  <Button
                    className="p-1 text-sm focus:outline-none text-slate-600 z-10 w-full text-left"
                    onFocus={() => setIsOpen(true)}
                    onPress={() => setIsOpen(true)}
                  >
                    <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis block truncate">
                      {valueToShow}
                    </span>
                  </Button>
                  <Command.Dialog
                    container={containerElement.current || undefined}
                    open={isOpen}
                    loop
                    onOpenChange={onOpenChange}
                    className="w-full"
                    contentClassName="w-full h-full flex-1"
                  >
                    <div className="flex h-14 border-b shadow-sm">
                      <div className="w-11 ml-0.5 text-xl flex items-center justify-center text-slate-500">
                        <SearchIcon />
                      </div>
                      <div className="relative flex-1 translate-y-[-1px] translate-x-[-1px] text-sm">
                        {/* This is the autocomplete suggestion
                    <div className="absolute p-1 inset-0 text-slate-300 z-10 flex items-center pr-3">
                      https://view.nls.uk/collections/7446/74466699.json
                    </div> */}
                        <Command.Input
                          ref={inputElement}
                          key={location.pathname + location.search}
                          className="p-1 relative flex-1 w-full h-full bg-transparent z-20 text-slate-600 focus:outline-none"
                          onValueChange={(value) => setValue(value)}
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          onSubmit={(e) => {
                            console.log(e);
                          }}
                          value={value}
                        />
                      </div>
                    </div>

                    <Command.List className="w-full bg-white">
                      <Command.Empty>No results found.</Command.Empty>

                      <Command.Group className="p-2">
                        {value.startsWith("https://") ? (
                          <Command.Item
                            key={value}
                            className="flex data-[selected=true]:bg-blue-500"
                            keywords={[value]}
                            onSelect={() => openUrl(value)}
                            value="Always this one"
                          >
                            <div className="flex-1">{value}</div>
                            <div>Open collection</div>
                          </Command.Item>
                        ) : null}

                        {fixedRoutes.map((route) =>
                          route.fallback ? null : (
                            <Command.Item
                              key={route.url}
                              className="flex data-[selected=true]:bg-blue-500"
                              keywords={[
                                route.router,
                                route.title || "",
                                route.description || "",
                              ]}
                              onSelect={() => openUrl(route.router)}
                              value={route.url}
                            >
                              {route.title ? <div>{route.title}</div> : null}
                              <div className="flex-1">{route.router}</div>
                            </Command.Item>
                          ),
                        )}
                      </Command.Group>

                      <Command.Group heading="history">
                        <Command.Item
                          onSelect={() =>
                            openUrl("https://view.nls.uk/collections/top.json")
                          }
                        >
                          NLS Top level collection
                        </Command.Item>

                        <Command.Item
                          onSelect={() =>
                            openUrl("https://heritage.tudelft.nl/iiif")
                          }
                        >
                          TU Delft IIIF collection
                        </Command.Item>

                        <CurrentCollectionSearchResults />
                      </Command.Group>

                      <OpenInTheseus />
                    </Command.List>
                  </Command.Dialog>
                  {/* <div className="data-[open=true]:opacity-100 transition-opacity flex opacity-0 bg-white top-0 z-10 right-0 left-0 bottom-0 absolute w-full">
                <div className="w-11 ml-0.5 text-xl flex items-center justify-center text-slate-500">
                  <SearchIcon />
                </div>
                <Input
                  onFocus={(e) => {
                    setIsOpen(true);
                    // select all text.
                    e.target.select();
                  }}
                  onBlur={() => {
                    setIsOpen(false);
                  }}
                  className="p-1 flex-1 bg-white text-slate-600 text-sm focus:outline-none"
                  defaultValue="https://view.nls.uk/collections/7446/74466699.json"
                />
              </div> */}
                </>
              )}
            </div>
            <Button
              className={twMerge(
                "text-xl relative rounded text-slate-300 hover:text-slate-500 z-20 flex-shrink-0",
                isOpen && "hidden",
              )}
            >
              <BookmarkIcon />
            </Button>
          </div>
          <MenuTrigger>
            <Button
              aria-label="Menu"
              className="flex-shrink-0 aria-expanded:bg-slate-200 outline-none focus:ring ring-blue-300 text-2xl rounded hover:bg-slate-100 p-1.5 m-1"
            >
              <MenuIcon />
            </Button>
            <Popover
              placement="bottom end"
              className="bg-white drop-shadow-lg shadow-slate-600 p-1 rounded text-sm w-36 text-slate-600"
            >
              <Menu className="flex flex-col gap-1 outline-none">
                <MenuItem
                  onAction={() => history.forward()}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  History forward
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl(lastUrl, true)}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  Refresh
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl("iiif://bookmarks")}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  Bookmarks
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl("iiif://home")}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  View Homepage
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl("iiif://history")}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  View History
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl(`view-source:${lastUrl}`)}
                  isDisabled={
                    lastUrl.startsWith("iiif://") ||
                    lastUrl.startsWith("view-source:")
                  }
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 aria-disabled:opacity-30 px-3 py-1.5 rounded"
                >
                  View Source
                </MenuItem>
                <MenuItem
                  onAction={() => openUrl("iiif://about")}
                  className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
                >
                  About
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
        <div className="h-[600px] relative overflow-auto">
          <Routes>
            <Route path="/" element={<Homepage2 />} />
            <Route path="/not-found" element={<NotFound />} />
            <Route path="/loading" element={<LoadingPage />} />

            <Route path="/about" element={<About />} />
            <Route path="/collection" element={<CollectionStub />} />
            <Route path="/manifest" element={<ManifestStub />} />
          </Routes>
        </div>
        <div className="p-3 border-t bg-gray-100">
          <BrowserOutput
            // onSelect={onSelect}
            targets={targets}
            types={types as any}
            format={format}
          />
        </div>
        <div
          data-open={isOpen}
          className="data-[open=true]:opacity-100 data-[open=true]:pointer-events-auto pointer-events-none flex opacity-0 bg-white top-0 z-10 right-0 left-0 bottom-0 absolute w-full"
          ref={containerElement as any}
        />
      </div>
    </div>
  );
}

function ManifestStub() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const canvas = searchParams.get("canvas") as string;
  const vault = useVault();
  const history = useHistory();
  const viewSource = searchParams.get("view-source") === "true";
  const manifest = useManifest({ id });
  const source = useMemo(() => {
    if (!viewSource || !manifest) return null;
    return vault.toPresentation3(manifest as any);
  }, [vault, manifest, viewSource]);

  useEffect(() => {
    if (!manifest) {
      history.replace(`/loading?id=${encodeURIComponent(id)}`);
    }
  }, [manifest]);

  if (!manifest) return null;

  if (viewSource) {
    return (
      <pre className="p-4 m-4 border bg-gray-50 border-gray-100 overflow-scroll rounded-lg text-xs">
        {JSON.stringify(source, null, 2)}
      </pre>
    );
  }

  return (
    <ManifestContext manifest={manifest.id}>
      {canvas ? (
        <SimpleViewerProvider
          manifest={id}
          startCanvas={canvas}
          pagingEnabled={false}
        >
          <ManifestCanvasViewer />
        </SimpleViewerProvider>
      ) : (
        <ManifestItemList />
      )}
    </ManifestContext>
  );
}

function LoadingPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const viewSource = searchParams.get("view-source") === "true";
  const loadResource = useLoadResource();

  useEffect(() => {
    const abortController = new AbortController();
    if (id) {
      loadResource(id, { viewSource, abortController });
    }
    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">Loading...</h1>
      <p className="text-lg">Please wait while we load the data.</p>
    </div>
  );
}

function CollectionStub() {
  const vault = useVault();
  const [searchParams] = useSearchParams();
  const history = useHistory();
  const collectionId = searchParams.get("id") as string;
  const viewSource = searchParams.get("view-source") === "true";
  const collection = useCollection({ id: collectionId });

  useEffect(() => {
    if (!collection) {
      history.replace(
        `/loading?id=${encodeURIComponent(collectionId)}&view-source=${viewSource}`,
      );
    }
  }, [collection]);

  const source = useMemo(() => {
    if (!viewSource || !collection) return null;
    return vault.toPresentation3(collection as any);
  }, [vault, collection, viewSource]);

  if (viewSource) {
    return (
      <pre className="p-4 m-4 border bg-gray-50 border-gray-100 overflow-scroll rounded-lg text-xs">
        {JSON.stringify(source, null, 2)}
      </pre>
    );
  }

  return <CollectionItemList id={collectionId} />;
}

const NotFound = () => {
  const store = useBrowserStoreContext();
  const lastUrl = useLastUrl();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const id = searchParams.get("id");
  const resource = useStore(store, (s) => {
    return s.loaded[lastUrl];
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (resource?.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg">{resource.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
      {id && (
        <a
          href={`/collections/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline text-sm"
        >
          {id}
        </a>
      )}
    </div>
  );
};

const Homepage2 = () => {
  return (
    <>
      <p>test test test</p>
      <p>test test test</p>
      <p>test test test</p>
      <p>test test test</p>
      <p>test test test</p>
    </>
  );
};

const LockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 14 14"
    width="1em"
    height="1em"
    {...props}
  >
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h14v14H0z" />
      <path d="M0 0h14v14H0z" opacity={0.87} />
      <path
        fill="#67E291"
        fillRule="nonzero"
        d="M3 12h7V6H3v6Zm3.5-4.2c.642 0 1.167.54 1.167 1.2 0 .66-.525 1.2-1.167 1.2S5.333 9.66 5.333 9c0-.66.525-1.2 1.167-1.2Z"
        opacity={0.3}
      />
      <path
        fill="#2EA449"
        fillRule="nonzero"
        d="M9.875 5h-.563V3.857C9.313 2.28 8.053 1 6.5 1 4.947 1 3.687 2.28 3.687 3.857V5h-.562C2.506 5 2 5.514 2 6.143v5.714C2 12.486 2.506 13 3.125 13h6.75c.619 0 1.125-.514 1.125-1.143V6.143C11 5.514 10.494 5 9.875 5ZM4.812 3.857c0-.948.754-1.714 1.688-1.714.934 0 1.688.766 1.688 1.714V5H4.812V3.857Zm5.063 8h-6.75V6.143h6.75v5.714ZM6.5 10.143c.619 0 1.125-.514 1.125-1.143S7.119 7.857 6.5 7.857 5.375 8.371 5.375 9s.506 1.143 1.125 1.143Z"
      />
    </g>
  </svg>
);

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M5 21V5q0-.825.588-1.412T7 3h10q.825 0 1.413.588T19 5v16l-7-3zm2-3.05l5-2.15l5 2.15V5H7zM7 5h10z"
      ></path>
    </svg>
  );
}

export function ArrowForwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="m12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
      ></path>
    </svg>
  );
}

export function ArrowBackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="m7.825 13l5.6 5.6L12 20l-8-8l8-8l1.425 1.4l-5.6 5.6H20v2z"
      ></path>
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M4 18q-.425 0-.712-.288T3 17t.288-.712T4 16h16q.425 0 .713.288T21 17t-.288.713T20 18zm0-5q-.425 0-.712-.288T3 12t.288-.712T4 11h16q.425 0 .713.288T21 12t-.288.713T20 13zm0-5q-.425 0-.712-.288T3 7t.288-.712T4 6h16q.425 0 .713.288T21 7t-.288.713T20 8z"
      ></path>
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"
      ></path>
    </svg>
  );
}

export function CancelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"
      ></path>
    </svg>
  );
}
