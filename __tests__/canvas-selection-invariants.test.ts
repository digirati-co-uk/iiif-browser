import { Vault } from "@iiif/helpers";
import { describe, expect, it } from "vitest";
import type { BrowserLinkConfig } from "../src/browser/BrowserLink";
import { createEmitter } from "../src/events";
import {
  type BrowserStoreConfig,
  createBrowserStore,
} from "../src/stores/browser-store";
import { createOutputStore } from "../src/stores/output-store";

const manifestId = "https://example.org/manifest";
const canvasId = "https://example.org/canvas/1";

const browserConfig: BrowserStoreConfig = {
  historyLimit: 100,
  restoreFromLocalStorage: false,
  saveToLocalStorage: false,
  localStorageKey: "@test/canvas-selection",
  collectionUrlMapping: {},
  collectionUrlMappingParams: {},
  seedCollections: [],
  initialHistory: [
    {
      resource: manifestId,
      route: `/manifest?id=${encodeURIComponent(manifestId)}`,
      url: manifestId,
    },
  ],
  initialHistoryCursor: 0,
};

const linkConfig: BrowserLinkConfig = {
  allowNavigationToBuiltInPages: true,
  onlyAllowedDomains: false,
  canSelectOnlyAllowedDomains: false,
  allowedDomains: [],
  disallowedResources: [],
  markedResources: [],
  multiSelect: false,
  canCropImage: false,
  alwaysShowNavigationArrow: true,
  clickToSelect: false,
  doubleClickToNavigate: false,
  clickToNavigate: true,
  canNavigateToCollection: true,
  canNavigateToManifest: true,
  canNavigateToCanvas: true,
  canSelectCollection: false,
  canSelectManifest: false,
  canSelectCanvas: true,
  canSelectImageService: false,
  customCanNavigate: null,
  customCanSelect: null,
};

describe("canvas selection invariants", () => {
  it("ends cached canvas navigation with one usable Canvas selection", async () => {
    const vault = new Vault();
    vault.loadSync(manifestId, {
      id: manifestId,
      type: "Manifest",
      label: { en: ["Manifest"] },
      items: [
        {
          id: canvasId,
          type: "Canvas",
          label: { en: ["Canvas"] },
          height: 100,
          width: 100,
          items: [],
        },
      ],
    });

    const emitter = createEmitter({});
    const browser = createBrowserStore({
      ...browserConfig,
      emitter,
      vault,
    });
    browser.getState().getLoadedResource(manifestId);

    const output = createOutputStore({
      vault,
      emitter: emitter as any,
      linkConfig,
      output: [
        {
          label: "Select canvas",
          type: "callback",
          cb: () => undefined,
          format: { type: "custom", format: (resource) => resource },
          supportedTypes: ["Canvas"],
        },
      ],
    });
    const canvasEvents: string[] = [];
    const resourceEvents: string[] = [];
    emitter.on("canvas.change", (resource) => {
      if (resource) canvasEvents.push(resource.id);
    });
    emitter.on("resource.change", (resource) => {
      if (resource) resourceEvents.push(resource.id);
    });

    await browser
      .getState()
      .resolve(canvasId, { parent: { id: manifestId, type: "Manifest" } });

    expect(canvasEvents).toEqual([canvasId]);
    expect(resourceEvents).toEqual([]);
    expect(output.getState().selectedItems).toEqual([
      expect.objectContaining({
        id: canvasId,
        type: "Canvas",
        parent: expect.objectContaining({ id: manifestId, type: "Manifest" }),
      }),
    ]);
    expect(output.getState().availableOutputs).toHaveLength(1);
  });
});
