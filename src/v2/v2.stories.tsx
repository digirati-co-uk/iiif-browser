import { Button } from "react-aria-components";
import { IIIFBrowser } from "./IIIFBrowser";
import { IIIFBrowserOmnisearch } from "./OmnisearchBox";
import { BrowserLink } from "./browser/BrowserLink";
import "./styles/lib.css";
import "./styles/tw.css";
import { Vault } from "@iiif/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import "./web-component";

export default {
  title: "IIIF Browser v2",
  component: IIIFBrowser,
};

export const Default = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser debug />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const DefaultCustomButton = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        ui={{ buttonClassName: "bg-[red] hover:bg-[green]" }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const DefaultHideAndShow = () => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <>
      <Button
        className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mb-4"
        onPress={() => setIsHidden(!isHidden)}
      >
        {isHidden ? "Show" : "Hide"}
      </Button>
      <div className="w-full h-[80vh] flex">
        {isHidden ? null : <IIIFBrowser debug />}
      </div>
      <div className="flex">
        <div id="iiif-browser__debug-history" />
        <div id="iiif-browser__debug-selected" />
      </div>
    </>
  );
};

export const DefaultHideAndShowWithRegion = () => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <>
      <Button
        className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mb-4"
        onPress={() => setIsHidden(!isHidden)}
      >
        {isHidden ? "Show" : "Hide"}
      </Button>
      <div className="w-full h-[80vh] flex">
        {isHidden ? null : (
          <IIIFBrowser
            vault={new Vault()}
            navigation={{
              canCropImage: true,
            }}
            debug
          />
        )}
      </div>
      <div className="flex">
        <div id="iiif-browser__debug-history" />
        <div id="iiif-browser__debug-selected" />
      </div>
    </>
  );
};

export const DefaultInResizableContainer = () => (
  <>
    <div className="resize bg-[red] h-[600px] p-4 flex ov80vhw-auto">
      <IIIFBrowser debug />
    </div>
  </>
);

export const SelectOnlyCanvases = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          canSelectCollection: false,
          canSelectManifest: false,
          canSelectCanvas: true,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const SelectOnlyManifests = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          canSelectCollection: false,
          canSelectManifest: false,
          canSelectCanvas: false,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const SelectOnlyCollections = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          canSelectCollection: true,
          canSelectManifest: false,
          canSelectCanvas: false,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const NavigateAndSelectOnlyCollections = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          canNavigateToCollection: true,
          canNavigateToManifest: false,
          canNavigateToCanvas: false,
          canSelectCollection: true,
          canSelectManifest: false,
          canSelectCanvas: false,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const MultiSelection = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          multiSelect: true,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const MultiSelectionClickToSelect = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          clickToSelect: true,
          doubleClickToNavigate: true,
          multiSelect: true,
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const DefaultWithUniversalViewer = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        output={[
          {
            type: "open-new-window",
            urlPattern:
              "https://uv-v4.netlify.app/#?iiifManifestId={MANIFEST}&cv={CANVAS_INDEX}&xywh={XYWH}",
            label: "Open in UV",
            supportedTypes: ["Manifest", "Canvas", "CanvasRegion"],
            format: { type: "url", resolvable: true },
          },
        ]}
        navigation={{ canSelectCanvas: true, canCropImage: true }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const CustomHomage = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        history={{ localStorageKey: "custom-homepage" }}
        customPages={{
          "/": (
            <div className="p-8">
              <h1 className="text-3xl mb-8">Custom Homepage</h1>
              <BrowserLink
                className="text-blue-500 hover:underline"
                resource={{
                  id: "https://view.nls.uk/collections/top.json",
                  type: "Collection",
                }}
              >
                Open a Collection
              </BrowserLink>
            </div>
          ),
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const CustomHomeButton = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        history={{
          localStorageKey: "custom-home-button",
          restoreFromLocalStorage: false,
          saveToLocalStorage: false,
          initialHistory: [
            {
              url: "https://view.nls.uk/collections/7446/74466699.json",
              resource: "https://view.nls.uk/collections/7446/74466699.json",
              route:
                "/loading?id=https://view.nls.uk/collections/7446/74466699.json",
            },
          ],
        }}
        ui={{
          homeLink: "https://view.nls.uk/collections/7446/74466699.json",
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const DisallowedResources = () => (
  <>
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          disallowedResources: [
            "https://view.nls.uk/manifest/7446/74464117/manifest.json",
          ],
        }}
        history={{
          localStorageKey: "custom-home-button",
          restoreFromLocalStorage: false,
          saveToLocalStorage: false,
          initialHistory: [
            {
              url: "https://view.nls.uk/collections/7446/74466699.json",
              resource: "https://view.nls.uk/collections/7446/74466699.json",
              route:
                "/loading?id=https://view.nls.uk/collections/7446/74466699.json",
            },
          ],
        }}
        ui={{
          homeLink: "https://view.nls.uk/collections/7446/74466699.json",
        }}
      />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const SeedCollection = () => (
  <div className="max-w-2xl h-[80vh] flex">
    <IIIFBrowser
      debug
      navigation={{
        customCanSelect: (item) => item.id !== "https://example.org/my-seed",
      }}
      history={{
        localStorageKey: "seed-collection",
        restoreFromLocalStorage: false,
        saveToLocalStorage: false,
        initialHistory: [
          {
            url: "https://example.org/my-seed",
            resource: "https://example.org/my-seed",
            route: "/loading?id=https://example.org/my-seed",
            metadata: {
              type: "Collection",
              label: { en: ["Seed collection"] },
            },
          },
        ],
        seedCollections: [
          {
            "@context": "http://iiif.io/api/presentation/3/context.json",
            id: "https://example.org/my-seed",
            label: {
              en: ["Seed collection"],
            },
            type: "Collection",
            items: [
              {
                id: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
                type: "Manifest",
                label: { en: ["Cookbook recipe"] },
              },
              {
                id: "https://view.nls.uk/manifest/7445/74457611/manifest.json",
                type: "Manifest",
                label: { en: ["Photographs of the south side of Edinburgh"] },
              },
            ],
          } as any,
        ],
      }}
      ui={{
        defaultPages: {
          homepage: false,
        },
        homeButton: true,
        homeLink: "https://example.org/my-seed",
      }}
    />
  </div>
);

// https://editor.allmaps.org/images?url=%7BMANIFEST%7D
export const AllmapsEditor = () => {
  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        navigation={{
          canSelectCanvas: false,
          canSelectCollection: false,
        }}
        output={[
          {
            type: "open-new-window",
            label: "View pyramid",
            urlPattern: "https://editor.allmaps.org/images?url={MANIFEST}",
            supportedTypes: ["Manifest"],
            format: {
              type: "image-service",
            },
          },
        ]}
        history={{
          localStorageKey: "custom-home-button-allmaps",
          restoreFromLocalStorage: false,
          saveToLocalStorage: false,
          initialHistory: [
            {
              url: "https://heritage.tudelft.nl/iiif/collection.json",
              resource: "https://heritage.tudelft.nl/iiif/collection.json",
              route:
                "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
            },
          ],
        }}
        ui={{
          homeLink: "https://heritage.tudelft.nl/iiif/collection.json",
        }}
      />
    </div>
  );
};

// https://observablehq.com/embed/@allmaps/tile-pyramid?cells=viz&url=
export const TilePyramid = () => {
  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        output={[
          {
            type: "open-new-window",
            label: "View pyramid",
            urlPattern:
              "https://observablehq.com/embed/@allmaps/tile-pyramid?cells=viz&url={RESULT}",
            supportedTypes: ["Canvas"],
            format: {
              type: "image-service",
            },
          },
        ]}
        history={{
          localStorageKey: "custom-home-button",
          restoreFromLocalStorage: false,
          saveToLocalStorage: false,
          initialHistory: [
            {
              url: "https://heritage.tudelft.nl/iiif/collection.json",
              resource: "https://heritage.tudelft.nl/iiif/collection.json",
              route:
                "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
            },
          ],
        }}
        ui={{
          homeLink: "https://heritage.tudelft.nl/iiif/collection.json",
        }}
      />
    </div>
  );
};

export const AllOfDelft = () => (
  <IIIFBrowser
    debug
    history={{
      localStorageKey: "custom-home-button",
      restoreFromLocalStorage: false,
      saveToLocalStorage: false,
      initialHistory: [
        {
          url: "https://heritage.tudelft.nl/iiif/collection.json",
          resource: "https://heritage.tudelft.nl/iiif/collection.json",
          route: "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
        },
      ],
    }}
    ui={{
      homeLink: "https://heritage.tudelft.nl/iiif/collection.json",
    }}
  />
);

export const InitialHistoryExample = () => (
  <IIIFBrowser
    debug
    history={{
      localStorageKey: "custom-home-button",
      restoreFromLocalStorage: false,
      saveToLocalStorage: false,
      initialHistoryCursor: 2,
      initialHistory: [
        {
          url: "https://heritage.tudelft.nl/iiif/collection.json",
          resource: "https://heritage.tudelft.nl/iiif/collection.json",
          route: "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
        },
        {
          url: "https://heritage.tudelft.nl/iiif/collections/collection.json",
          resource:
            "https://heritage.tudelft.nl/iiif/collections/collection.json",
          route:
            "/loading?id=https://heritage.tudelft.nl/iiif/collections/collection.json",
        },
        {
          url: "https://heritage.tudelft.nl/iiif/topics/collection.json",
          resource: "https://heritage.tudelft.nl/iiif/topics/collection.json",
          route:
            "/loading?id=https://heritage.tudelft.nl/iiif/topics/collection.json",
        },
      ],
    }}
    ui={{
      homeLink: "https://heritage.tudelft.nl/iiif/collection.json",
    }}
  />
);

export const TestingCanvasCallback = () => (
  <div className="max-w-2xl h-[80vh] flex">
    <IIIFBrowser
      debug
      history={{
        localStorageKey: "testing-canvas-callback",
        restoreFromLocalStorage: false,
        saveToLocalStorage: false,
        initialHistory: [
          {
            url: "https://heritage.tudelft.nl/iiif/collection.json",
            resource: "https://heritage.tudelft.nl/iiif/collection.json",
            route:
              "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
          },
        ],
      }}
      output={[
        {
          type: "callback",
          label: "Select",
          supportedTypes: [
            "Canvas",
            "CanvasList",
            "CanvasRegion",
            "ImageService",
            "ImageServiceRegion",
          ],
          cb: (resource) => {
            console.log("output", resource);
          },
          format: {
            type: "custom",
            format: (resource, parent) => ({ resource, parent }),
          },
        },
      ]}
      navigation={{
        canSelectCanvas: true,
        canSelectManifest: false,
        canSelectCollection: false,
      }}
    />
  </div>
);

export const TestingCanvasCallbackContentState = () => {
  const [value, setValue] = useState("");
  return (
    <div className="h-[80vh] flex flex-col">
      <pre className="border rounded text-lg whitespace-pre mb-8">{value}</pre>
      {useMemo(
        () => (
          <IIIFBrowser
            debug
            history={{
              localStorageKey: "testing-canvas-callback",
              restoreFromLocalStorage: false,
              saveToLocalStorage: false,
              initialHistory: [
                {
                  url: "https://heritage.tudelft.nl/iiif/collection.json",
                  resource: "https://heritage.tudelft.nl/iiif/collection.json",
                  route:
                    "/loading?id=https://heritage.tudelft.nl/iiif/collection.json",
                },
              ],
            }}
            output={[
              {
                type: "callback",
                label: "Select",
                supportedTypes: [
                  "Manifest",
                  "Collection",
                  "Canvas",
                  "CanvasList",
                  "CanvasRegion",
                  "ImageService",
                  "ImageServiceRegion",
                ],
                cb: (resource) => {
                  setValue(resource);
                },
                format: {
                  type: "content-state",
                  encoded: false,
                  pretty: true,
                },
              },
            ]}
            navigation={{
              canSelectCanvas: true,
              canSelectManifest: true,
              canSelectCollection: true,
              canCropImage: true,
            }}
          />
        ),
        [],
      )}
    </div>
  );
};

export const WebComponentExample = () => {
  const browser = useRef<any>(null);
  const [resource, setResource] = useState<string | null>(null);

  useEffect(() => {
    browser.current.addEventListener("select", (e: any) => {
      setResource(e.detail.resource.id);
    });
  }, []);

  return (
    <div className="flex flex-row gap-2 h-[90vh]">
      <iiif-browser
        ref={browser}
        can-select-canvas={false}
        enable-history={false}
        container-class="flex flex-1 h-full"
        class="w-[500px] h-full flex-col min-w-0 flex self-stretch"
        collection="https://view.nls.uk/collections/7446/74466728.json"
      />
      <div className="w-full flex-1">
        {resource ? (
          <iframe
            title="IIIF Viewer"
            className="w-full h-full"
            src={`https://theseusviewer.org/?iiif-content=${resource}`}
          />
        ) : (
          <div className="p-8 flex items-center justify-center">
            <span className="bg-blue-50 w-full text-center text-gray-400 p-8 rounded-lg">
              Select a resource
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
