import { Button } from "react-aria-components";
import { IIIFBrowser } from "./IIIFBrowser";
import { IIIFBrowserOmnisearch } from "./OmnisearchBox";
import { BrowserLink } from "./browser/BrowserLink";
import "./styles/tw.css";
import { useMemo, useState } from "react";

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
