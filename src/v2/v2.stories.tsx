import { Button } from "react-aria-components";
import { IIIFBrowser } from "./IIIFBrowser";
import { IIIFBrowserOmnisearch } from "./OmnisearchBox";
import { BrowserLink } from "./browser/BrowserLink";
import "./styles/lib.css";
import "./styles/tw.css";
import { Vault } from "@iiif/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import "./web-component";
import type { V2ExternalSearchAdapter, V2SearchResult } from "./search/types";

export default {
  title: "IIIF Browser v2",
  component: IIIFBrowser,
};

export const Default = () => (
  <div className="">
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser debug className="w-full h-[80vh] flex" />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </div>
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

// ---------------------------------------------------------------------------
// Search stories
// ---------------------------------------------------------------------------

/**
 * Helper: a tiny in-memory dataset used by the "custom adapter" stories.
 * Filters case-insensitively by query and returns matching V2SearchResult objects.
 */
 const FAKE_RESOURCES: V2SearchResult[] = [
   {
     id: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
     label: "Simple Manifest - Image",
     summary:
       "IIIF Cookbook recipe: Simple Manifest - Image. Source: https://iiif.io/api/cookbook/recipe/0001-mvm-image/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0002-mvm-audio/manifest.json",
     label: "Simple Manifest - Audio",
     summary:
       "IIIF Cookbook recipe: Simple Manifest - Audio. Source: https://iiif.io/api/cookbook/recipe/0002-mvm-audio/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0002-mvm-audio/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0003-mvm-video/manifest.json",
     label: "Simple Manifest - Video",
     summary:
       "IIIF Cookbook recipe: Simple Manifest - Video. Source: https://iiif.io/api/cookbook/recipe/0003-mvm-video/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0003-mvm-video/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0004-canvas-size/manifest.json",
     label: "Image and Canvas with Differing Dimensions",
     summary:
       "IIIF Cookbook recipe: Image and Canvas with Differing Dimensions. Source: https://iiif.io/api/cookbook/recipe/0004-canvas-size/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0004-canvas-size/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0005-image-service/manifest.json",
     label: "Support Deep Viewing with Basic Use of a IIIF Image Service",
     summary:
       "IIIF Cookbook recipe: Support Deep Viewing with Basic Use of a IIIF Image Service. Source: https://iiif.io/api/cookbook/recipe/0005-image-service/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0005-image-service/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0006-text-language/manifest.json",
     label: "Internationalization and Multi-language Values",
     summary:
       "IIIF Cookbook recipe: Internationalization and Multi-language Values. Source: https://iiif.io/api/cookbook/recipe/0006-text-language/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0006-text-language/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0118-multivalue/manifest.json",
     label: "Displaying Multiple Values with Language Maps",
     summary:
       "IIIF Cookbook recipe: Displaying Multiple Values with Language Maps. Source: https://iiif.io/api/cookbook/recipe/0118-multivalue/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0118-multivalue/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0029-metadata-anywhere/manifest.json",
     label: "Metadata on any Resource",
     summary:
       "IIIF Cookbook recipe: Metadata on any Resource. Source: https://iiif.io/api/cookbook/recipe/0029-metadata-anywhere/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0029-metadata-anywhere/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0053-seeAlso/manifest.json",
     label: "Linking to Structured Metadata",
     summary:
       "IIIF Cookbook recipe: Linking to Structured Metadata. Source: https://iiif.io/api/cookbook/recipe/0053-seeAlso/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0053-seeAlso/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0046-rendering/manifest.json",
     label: "Providing Alternative Representations",
     summary:
       "IIIF Cookbook recipe: Providing Alternative Representations. Source: https://iiif.io/api/cookbook/recipe/0046-rendering/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0046-rendering/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0377-image-in-annotation/manifest.json",
     label: "Image in Annotations",
     summary:
       "IIIF Cookbook recipe: Image in Annotations. Source: https://iiif.io/api/cookbook/recipe/0377-image-in-annotation/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0377-image-in-annotation/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0015-start/manifest.json",
     label: "Begin playback at a specific point - Time-based media",
     summary:
       "IIIF Cookbook recipe: Begin playback at a specific point - Time-based media. Source: https://iiif.io/api/cookbook/recipe/0015-start/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0015-start/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json",
     label: "Audio Presentation with Accompanying Image",
     summary:
       "IIIF Cookbook recipe: Audio Presentation with Accompanying Image. Source: https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/manifest.json",
     label: "Simplest Annotation",
     summary:
       "IIIF Cookbook recipe: Simplest Annotation. Source: https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0074-multiple-language-captions/manifest.json",
     label: "Using Caption and Subtitle Files in Multiple Languages with Video Content",
     summary:
       "IIIF Cookbook recipe: Using Caption and Subtitle Files in Multiple Languages with Video Content (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0074-multiple-language-captions/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0074-multiple-language-captions/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0299-region/manifest.json",
     label: "Addressing a Spatial Region",
     summary:
       "IIIF Cookbook recipe: Addressing a Spatial Region. Source: https://iiif.io/api/cookbook/recipe/0299-region/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0299-region/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0031-bound-multivolume/manifest.json",
     label: "Multiple Volumes in a Single Bound Volume",
     summary:
       "IIIF Cookbook recipe: Multiple Volumes in a Single Bound Volume. Source: https://iiif.io/api/cookbook/recipe/0031-bound-multivolume/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0031-bound-multivolume/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0154-geo-extension/manifest.json",
     label: "Locate a Manifest on a Web Map",
     summary:
       "IIIF Cookbook recipe: Locate a Manifest on a Web Map (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0154-geo-extension/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0154-geo-extension/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/manifest.json",
     label: "Composition from Multiple Images",
     summary:
       "IIIF Cookbook recipe: Composition from Multiple Images. Source: https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0017-transcription-av/manifest.json",
     label: "Providing Access to Transcript Files of A/V Content",
     summary:
       "IIIF Cookbook recipe: Providing Access to Transcript Files of A/V Content. Source: https://iiif.io/api/cookbook/recipe/0017-transcription-av/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0017-transcription-av/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0065-opera-multiple-canvases/manifest.json",
     label: "Table of Contents for Multiple A/V Files on Multiple Canvases",
     summary:
       "IIIF Cookbook recipe: Table of Contents for Multiple A/V Files on Multiple Canvases. Source: https://iiif.io/api/cookbook/recipe/0065-opera-multiple-canvases/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0065-opera-multiple-canvases/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0026-toc-opera/manifest.json",
     label: "Table of Contents for A/V Content",
     summary:
       "IIIF Cookbook recipe: Table of Contents for A/V Content. Source: https://iiif.io/api/cookbook/recipe/0026-toc-opera/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0026-toc-opera/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0024-book-4-toc/manifest.json",
     label: "Table of Contents for Book Chapters",
     summary:
       "IIIF Cookbook recipe: Table of Contents for Book Chapters. Source: https://iiif.io/api/cookbook/recipe/0024-book-4-toc/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0024-book-4-toc/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0240-navPlace-on-canvases/manifest.json",
     label: "Locate Multiple Canvases on a Web Map",
     summary:
       "IIIF Cookbook recipe: Locate Multiple Canvases on a Web Map (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0240-navPlace-on-canvases/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0240-navPlace-on-canvases/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0021-tagging/manifest.json",
     label: "Simple Annotation — Tagging",
     summary:
       "IIIF Cookbook recipe: Simple Annotation — Tagging (compatibility: partial). Source: https://iiif.io/api/cookbook/recipe/0021-tagging/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0021-tagging/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0135-annotating-point-in-canvas/manifest.json",
     label: "Annotating a specific point of an image",
     summary:
       "IIIF Cookbook recipe: Annotating a specific point of an image. Source: https://iiif.io/api/cookbook/recipe/0135-annotating-point-in-canvas/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0135-annotating-point-in-canvas/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0269-embedded-or-referenced-annotations/manifest.json",
     label: "Embedded or referenced Annotations",
     summary:
       "IIIF Cookbook recipe: Embedded or referenced Annotations. Source: https://iiif.io/api/cookbook/recipe/0269-embedded-or-referenced-annotations/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0269-embedded-or-referenced-annotations/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0230-navdate/navdate-collection.json",
     label: "Navigation by Chronology",
     summary:
       "IIIF Cookbook recipe: Navigation by Chronology (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0230-navdate/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0230-navdate/navdate-collection.json",
     resourceType: "collection",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0283-missing-image/manifest.json",
     label: "Missing Images in a Sequence",
     summary:
       "IIIF Cookbook recipe: Missing Images in a Sequence. Source: https://iiif.io/api/cookbook/recipe/0283-missing-image/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0283-missing-image/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0013-placeholderCanvas/manifest.json",
     label: "Load a Preview Image Before the Main Content",
     summary:
       "IIIF Cookbook recipe: Load a Preview Image Before the Main Content. Source: https://iiif.io/api/cookbook/recipe/0013-placeholderCanvas/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0013-placeholderCanvas/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0009-book-1/manifest.json",
     label: "Simple Manifest - Book",
     summary:
       "IIIF Cookbook recipe: Simple Manifest - Book. Source: https://iiif.io/api/cookbook/recipe/0009-book-1/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0009-book-1/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0019-html-in-annotations/manifest.json",
     label: "HTML in Annotations",
     summary:
       "IIIF Cookbook recipe: HTML in Annotations. Source: https://iiif.io/api/cookbook/recipe/0019-html-in-annotations/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0019-html-in-annotations/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0047-homepage/manifest.json",
     label: "Linking to Web Page of an Object",
     summary:
       "IIIF Cookbook recipe: Linking to Web Page of an Object. Source: https://iiif.io/api/cookbook/recipe/0047-homepage/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0047-homepage/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0008-rights/manifest.json",
     label: "Rights statement",
     summary:
       "IIIF Cookbook recipe: Rights statement. Source: https://iiif.io/api/cookbook/recipe/0008-rights/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0008-rights/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0032-collection/collection.json",
     label: "Simple Collection",
     summary:
       "IIIF Cookbook recipe: Simple Collection. Source: https://iiif.io/api/cookbook/recipe/0032-collection/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0032-collection/collection.json",
     resourceType: "collection",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0234-provider/manifest.json",
     label: "Acknowledge Content Contributors",
     summary:
       "IIIF Cookbook recipe: Acknowledge Content Contributors. Source: https://iiif.io/api/cookbook/recipe/0234-provider/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0234-provider/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0022-linking-with-a-hotspot/manifest.json",
     label: "Redirecting from one Canvas to another resource (Hotspot linking)",
     summary:
       "IIIF Cookbook recipe: Redirecting from one Canvas to another resource (Hotspot linking) (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0022-linking-with-a-hotspot/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0022-linking-with-a-hotspot/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0064-opera-one-canvas/manifest.json",
     label: "Table of Contents for Multiple A/V Files on a Single Canvas",
     summary:
       "IIIF Cookbook recipe: Table of Contents for Multiple A/V Files on a Single Canvas (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0064-opera-one-canvas/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0064-opera-one-canvas/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0219-using-caption-file/manifest.json",
     label: "Using Caption and Subtitle Files with Video Content",
     summary:
       "IIIF Cookbook recipe: Using Caption and Subtitle Files with Video Content (compatibility: partial). Source: https://iiif.io/api/cookbook/recipe/0219-using-caption-file/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0219-using-caption-file/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0033-choice/manifest.json",
     label: "Multiple Choice of Images in a Single View (Canvas)",
     summary:
       "IIIF Cookbook recipe: Multiple Choice of Images in a Single View (Canvas). Source: https://iiif.io/api/cookbook/recipe/0033-choice/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0033-choice/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0035-foldouts/manifest.json",
     label: "Foldouts, Flaps, and Maps",
     summary:
       "IIIF Cookbook recipe: Foldouts, Flaps, and Maps. Source: https://iiif.io/api/cookbook/recipe/0035-foldouts/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0035-foldouts/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0258-tagging-external-resource/manifest.json",
     label: "Tagging with an External Resource",
     summary:
       "IIIF Cookbook recipe: Tagging with an External Resource. Source: https://iiif.io/api/cookbook/recipe/0258-tagging-external-resource/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0258-tagging-external-resource/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0326-annotating-image-layer/manifest.json",
     label: "Annotate specific images or layers",
     summary:
       "IIIF Cookbook recipe: Annotate specific images or layers (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0326-annotating-image-layer/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0326-annotating-image-layer/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0261-non-rectangular-commenting/manifest.json",
     label: "Annotation with a Non-Rectangular Polygon",
     summary:
       "IIIF Cookbook recipe: Annotation with a Non-Rectangular Polygon. Source: https://iiif.io/api/cookbook/recipe/0261-non-rectangular-commenting/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0261-non-rectangular-commenting/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/manifest-rtl.json",
     label: "Viewing direction and Its Effect on Navigation (RTL)",
     summary:
       "IIIF Cookbook recipe: Viewing direction and Its Effect on Navigation (RTL). Source: https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/manifest-rtl.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0117-add-image-thumbnail/manifest.json",
     label: "Image Thumbnail for Manifest",
     summary:
       "IIIF Cookbook recipe: Image Thumbnail for Manifest. Source: https://iiif.io/api/cookbook/recipe/0117-add-image-thumbnail/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0117-add-image-thumbnail/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0202-start-canvas/manifest.json",
     label: "Load Manifest Beginning with a Specific Canvas",
     summary:
       "IIIF Cookbook recipe: Load Manifest Beginning with a Specific Canvas. Source: https://iiif.io/api/cookbook/recipe/0202-start-canvas/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0202-start-canvas/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0139-geolocate-canvas-fragment/manifest.json",
     label: "Represent Canvas Fragment as a Geographic Area in a Web Mapping Client",
     summary:
       "IIIF Cookbook recipe: Represent Canvas Fragment as a Geographic Area in a Web Mapping Client (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0139-geolocate-canvas-fragment/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0139-geolocate-canvas-fragment/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0434-choice-av/manifest.json",
     label: "Multiple Choice of Audio Formats in a Single View (Canvas)",
     summary:
       "IIIF Cookbook recipe: Multiple Choice of Audio Formats in a Single View (Canvas). Source: https://iiif.io/api/cookbook/recipe/0434-choice-av/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0434-choice-av/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/manifest-continuous.json",
     label: "Book 'behavior' Variations (continuous, individuals) – Continuous",
     summary:
       "IIIF Cookbook recipe: Book 'behavior' Variations (continuous, individuals) – Continuous (compatibility: partial). Source: https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/manifest-continuous.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0040-image-rotation-service/manifest-service.json",
     label: "Image Rotation Two Ways",
     summary:
       "IIIF Cookbook recipe: Image Rotation Two Ways (compatibility: none). Source: https://iiif.io/api/cookbook/recipe/0040-image-rotation-service/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0040-image-rotation-service/manifest-service.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0030-multi-volume/collection.json",
     label: "Multi-volume Work with Individually-bound Volumes",
     summary:
       "IIIF Cookbook recipe: Multi-volume Work with Individually-bound Volumes. Source: https://iiif.io/api/cookbook/recipe/0030-multi-volume/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0030-multi-volume/collection.json",
     resourceType: "collection",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0007-string-formats/manifest.json",
     label: "Embedding HTML in descriptive properties",
     summary:
       "IIIF Cookbook recipe: Embedding HTML in descriptive properties. Source: https://iiif.io/api/cookbook/recipe/0007-string-formats/",
     kind: "external",
     resourceId: "https://iiif.io/api/cookbook/recipe/0007-string-formats/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0306-linking-annotations-to-manifests/manifest.json",
     label: "Linking external Annotations targeting a Canvas to a Manifest",
     summary:
       "IIIF Cookbook recipe: Linking external Annotations targeting a Canvas to a Manifest. Source: https://iiif.io/api/cookbook/recipe/0306-linking-annotations-to-manifests/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0306-linking-annotations-to-manifests/manifest.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/manifest-ttb.json",
     label: "Viewing direction and Its Effect on Navigation (TTB)",
     summary:
       "IIIF Cookbook recipe: Viewing direction and Its Effect on Navigation (TTB). Source: https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0010-book-2-viewing-direction/manifest-ttb.json",
     resourceType: "manifest",
     thumbnail: null,
   },
   {
     id: "https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/manifest-individuals.json",
     label: "Book 'behavior' Variations (continuous, individuals) – Individuals",
     summary:
       "IIIF Cookbook recipe: Book 'behavior' Variations (continuous, individuals) – Individuals. Source: https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/",
     kind: "external",
     resourceId:
       "https://iiif.io/api/cookbook/recipe/0011-book-3-behavior/manifest-individuals.json",
     resourceType: "manifest",
     thumbnail: null,
   },
 ];

/**
 * In-memory adapter: synchronously filters FAKE_RESOURCES by query string.
 * Wraps result in a small simulated delay to demonstrate loading state.
 */
function createMemoryAdapter(delayMs = 300): V2ExternalSearchAdapter {
  return {
    id: "memory",
    async search(query) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!query.trim()) return FAKE_RESOURCES.slice(0, 5);
      const q = query.toLowerCase();
      return FAKE_RESOURCES.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          (r.summary ?? "").toLowerCase().includes(q) ||
          r.resourceType.toLowerCase().includes(q),
      );
    },
  };
}

/**
 * Adapter that always rejects after a short delay – used to demonstrate
 * graceful error degradation.
 */
function createFailingAdapter(): V2ExternalSearchAdapter {
  return {
    id: "failing",
    async search() {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error("External search service unavailable")), 400),
      );
      return [];
    },
  };
}

const historyConfig = {
  localStorageKey: "@v2/iiif-browser-search-stories",
  restoreFromLocalStorage: false,
  saveToLocalStorage: false,
  initialHistory: [
    {
      url: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
      resource: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
      route: "/manifest?id=https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
    },
  ],
};

// ── Story 1: Within-only (default, no external search) ──────────────────────

/**
 * The default omnibox with no external search configured.
 * Behaviour is identical to the existing within-collection search.
 * Open the omnibox (Cmd/Ctrl+K) and type to search within the collection.
 */
export const SearchWithinOnly = () => (
  <div className="w-full h-[80vh] flex">
    <IIIFBrowser
      debug
      className="w-full h-[80vh] flex"
      history={historyConfig}
      search={{
        enableWithinCollection: true,
        enableExternal: false,
      }}
    />
  </div>
);
SearchWithinOnly.storyName = "Search: Within-only (default)";

// ── Story 2: Custom in-memory adapter + within collection ────────────────────

/**
 * Both within-collection results AND external results from a custom in-memory
 * adapter, shown in grouped mode with section headers.
 *
 * The in-memory adapter filters a small set of IIIF Cookbook manifests.
 * Open the omnibox and type "image", "audio", "video", or "opera" to see
 * external results appear under the "Global results" section header.
 */
export const SearchCustomAdapterGrouped = () => {
  const adapter = useMemo(() => createMemoryAdapter(400), []);

  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        className="w-full h-[80vh] flex"
        history={historyConfig}
        search={{
          enableWithinCollection: true,
          enableExternal: true,
          combination: {
            mode: "grouped",
            maxExternalResults: 8,
            maxWithinResults: 8,
          },
          adapter,
          withinSectionLabel: "In this collection",
          externalSectionLabel: "Global results",
        }}
      />
    </div>
  );
};
SearchCustomAdapterGrouped.storyName = "Search: Custom adapter + within (grouped)";

// ── Story 3: Custom adapter only (no within-collection) ─────────────────────

/**
 * External-only search: within-collection results are disabled.
 * All results come from the custom in-memory adapter.
 */
export const SearchCustomAdapterOnly = () => {
  const adapter = useMemo(() => createMemoryAdapter(300), []);

  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        className="w-full h-[80vh] flex"
        history={historyConfig}
        search={{
          enableWithinCollection: false,
          enableExternal: true,
          combination: {
            mode: "withinFirst",
            maxExternalResults: 10,
          },
          adapter,
          externalSectionLabel: "All resources",
        }}
      />
    </div>
  );
};
SearchCustomAdapterOnly.storyName = "Search: Custom adapter only (no within)";

// ── Story 4: Interleaved combination mode ────────────────────────────────────

/**
 * Demonstrates the "interleaved" combination mode: within-collection and
 * external results are merged in a round-robin fashion (one within, one
 * external, one within, …) without section headers.
 */
export const SearchInterleaved = () => {
  const adapter = useMemo(() => createMemoryAdapter(200), []);

  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        className="w-full h-[80vh] flex"
        history={historyConfig}
        search={{
          enableWithinCollection: true,
          enableExternal: true,
          combination: {
            mode: "interleaved",
            maxExternalResults: 6,
            maxWithinResults: 6,
          },
          adapter,
        }}
      />
    </div>
  );
};
SearchInterleaved.storyName = "Search: Interleaved (within + external, no sections)";

// ── Story 5: External first ──────────────────────────────────────────────────

/**
 * Demonstrates the "externalFirst" combination mode: external results appear
 * at the top of the flat list, within-collection results follow.
 */
export const SearchExternalFirst = () => {
  const adapter = useMemo(() => createMemoryAdapter(200), []);

  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        className="w-full h-[80vh] flex"
        history={historyConfig}
        search={{
          enableWithinCollection: true,
          enableExternal: true,
          combination: {
            mode: "externalFirst",
            maxExternalResults: 5,
            maxWithinResults: 5,
          },
          adapter,
        }}
      />
    </div>
  );
};
SearchExternalFirst.storyName = "Search: External first (flat list)";

// ── Story 6: Graceful error degradation ─────────────────────────────────────

/**
 * The external adapter always fails.  The omnibox should degrade gracefully:
 * within-collection results still appear, a warning indicator (⚠) is shown
 * in the search bar, and no broken state is presented to the user.
 */
export const SearchExternalError = () => {
  const adapter = useMemo(() => createFailingAdapter(), []);

  return (
    <div className="w-full h-[80vh] flex">
      <IIIFBrowser
        debug
        className="w-full h-[80vh] flex"
        history={historyConfig}
        search={{
          enableWithinCollection: true,
          enableExternal: true,
          combination: { mode: "grouped" },
          adapter,
        }}
      />
    </div>
  );
};
SearchExternalError.storyName = "Search: Graceful external error degradation";

// ── Story 7: Typesense config example (requires real endpoint) ───────────────

/**
 * Demonstrates how to wire up the built-in Typesense adapter.
 *
 * This story will NOT produce real results unless you replace the placeholder
 * values below with a real Typesense endpoint, API key, and collection name.
 *
 * To test with a real Typesense instance, update:
 *   - `host`       – your Typesense server host
 *   - `apiKey`     – a search-only API key
 *   - `collection` – your collection name
 *
 * For local development you can spin up Typesense via Docker:
 *   docker run -p 8108:8108 -v /tmp/typesense-data:/data typesense/typesense:0.25.2 \
 *     --data-dir /data --api-key=xyz --enable-cors
 */
export const SearchTypesenseConfig = () => (
  <div className="w-full h-[80vh] flex">
    <IIIFBrowser
      debug
      className="w-full h-[80vh] flex"
      history={historyConfig}
      search={{
        enableWithinCollection: true,
        enableExternal: true,
        combination: {
          mode: "grouped",
          maxExternalResults: 8,
          maxWithinResults: 8,
        },
        typesense: {
          host: "localhost",
          port: 8108,
          protocol: "http",
          apiKey: "xyz",
          collection: "iiif_resources",
          searchParams: {
            query_by: "label,summary",
            per_page: 8,
          },
          mapHitToResult(hit) {
            const doc = hit.document;
            return {
              id: String(doc.id),
              label: String(doc.label ?? doc.title ?? "Untitled resource"),
              thumbnail: doc.thumbnail ? String(doc.thumbnail) : null,
              summary: hit.highlights?.map((h) => h.snippet?.trim()).filter(Boolean).join(" · ") ?? (doc.summary ? String(doc.summary) : null),
              kind: "external",
              resourceId: String(doc.iiif_id ?? doc.id),
              resourceType: String(doc.type ?? "manifest"),
              metadata: doc,
            };
          },
        },
        withinSectionLabel: "In this collection",
        externalSectionLabel: "Typesense results",
      }}
    />
  </div>
);
SearchTypesenseConfig.storyName = "Search: Typesense config (requires live endpoint)";
