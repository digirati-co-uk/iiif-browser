import { describe, expect, it, vi } from "vitest";
import { createEmitter } from "../src/events";
import {
  type BrowserStoreConfig,
  createBrowserStore,
  type HistoryItem,
} from "../src/stores/browser-store";

const leedsUrl =
  "https://explore.library.leeds.ac.uk/special-collections-explore/372659/horae_beatae_mariae_virginis";
const manifestUrl = "https://iiif.library.leeds.ac.uk/presentation/cc/pfk4sgw8";

const baseConfig: Omit<
  BrowserStoreConfig,
  "initialHistory" | "initialHistoryCursor"
> = {
  historyLimit: 100,
  restoreFromLocalStorage: false,
  saveToLocalStorage: false,
  localStorageKey: "@test/browser-digital-collections",
  collectionUrlMapping: {},
  collectionUrlMappingParams: {},
  seedCollections: [],
};

function createHistoryItem(route: string, url: string): HistoryItem {
  return {
    route,
    url,
    resource: null,
    timestamp: new Date().toISOString(),
  };
}

describe("browser digital collections", () => {
  it("loads a supported Leeds page as its IIIF manifest", async () => {
    const store = createBrowserStore({
      emitter: createEmitter({}),
      ...baseConfig,
      initialHistory: [createHistoryItem("/", "iiif://home")],
      initialHistoryCursor: 0,
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url === leedsUrl) {
          return new Response(
            `<p><strong>Manifest:</strong> ${manifestUrl}</p>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" },
            },
          );
        }

        if (url === manifestUrl) {
          return new Response(
            JSON.stringify({
              "@context": "http://iiif.io/api/presentation/3/context.json",
              id: manifestUrl,
              type: "Manifest",
              label: { en: ["Horae Beatae Mariae Virginis"] },
              items: [],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response("not found", { status: 404 });
      });

    try {
      await store.getState().loadResource(leedsUrl);

      const location = store.getState().history.location;
      expect(location.pathname).toBe("/manifest");

      const params = new URLSearchParams(location.search);
      expect(params.get("id")).toBe(manifestUrl);
      expect(
        store.getState().getLoadedResource(manifestUrl)?.resource,
      ).toMatchObject({
        id: manifestUrl,
        type: "Manifest",
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        leedsUrl,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        manifestUrl,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
