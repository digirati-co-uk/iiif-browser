import { Button } from "react-aria-components";
import { IIIFBrowser } from "./IIIFBrowser";
import { IIIFBrowserOmnisearch } from "./OmnisearchBox";
import { BrowserLink } from "./browser/BrowserLink";

export default {
  title: "IIIF Browser v2",
  component: IIIFBrowser,
};

export const Default = () => (
  <>
    <div className="max-w-2xl">
      <IIIFBrowser debug />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
      <div id="iiif-browser__debug-selected" />
    </div>
  </>
);

export const CustomHomage = () => (
  <>
    <div className="max-w-2xl">
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
    <div className="max-w-2xl">
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
  <div className="max-w-2xl">
    <IIIFBrowser
      debug
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
