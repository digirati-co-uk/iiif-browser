import type { BoxSelector } from "@iiif/helpers";
import { Vault } from "@iiif/helpers";
import mitt from "mitt";
import { describe, expect, it } from "vitest";
import type { BrowserLinkConfig } from "../src/browser/BrowserLink";
import { createOutputStore } from "../src/stores/output-store";

const manifestId = "https://example.org/manifest";
const canvasId = "https://example.org/canvas";

const linkConfig: BrowserLinkConfig = {
  allowNavigationToBuiltInPages: true,
  onlyAllowedDomains: false,
  canSelectOnlyAllowedDomains: false,
  allowedDomains: [],
  disallowedResources: [],
  markedResources: [],
  multiSelect: false,
  canCropImage: true,
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

describe("output store Canvas refinements", () => {
  it("commits and removes a crop with one refinement event per action", () => {
    const vault = new Vault();
    vault.loadSync(manifestId, {
      id: manifestId,
      type: "Manifest",
      label: { en: ["Manifest"] },
      items: [
        {
          id: canvasId,
          type: "Canvas",
          width: 1000,
          height: 500,
          items: [
            {
              id: "https://example.org/page",
              type: "AnnotationPage",
              items: [
                {
                  id: "https://example.org/painting",
                  type: "Annotation",
                  motivation: "painting",
                  target: canvasId,
                  body: {
                    id: "https://example.org/image/full/max/0/default.jpg",
                    type: "Image",
                    width: 1000,
                    height: 500,
                    service: [
                      {
                        id: "https://example.org/image",
                        type: "ImageService3",
                        profile: "level1",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const emitter = mitt<any>();
    const refinements: any[] = [];
    emitter.on("output.refine-selected-item", (item) => {
      refinements.push(item);
    });
    const output = createOutputStore({
      vault,
      emitter,
      linkConfig,
      output: [
        {
          label: "Canvas",
          type: "callback",
          cb: () => undefined,
          format: { type: "custom", format: (resource) => resource },
          supportedTypes: ["Canvas"],
        },
        {
          label: "Canvas region",
          type: "callback",
          cb: () => undefined,
          format: { type: "custom", format: (resource) => resource },
          supportedTypes: ["CanvasRegion"],
        },
        {
          label: "Image service",
          type: "callback",
          cb: () => undefined,
          format: { type: "custom", format: (resource) => resource },
          supportedTypes: ["ImageService"],
        },
        {
          label: "Image service region",
          type: "callback",
          cb: () => undefined,
          format: { type: "custom", format: (resource) => resource },
          supportedTypes: ["ImageServiceRegion"],
        },
      ],
    });
    emitter.emit("canvas.change", {
      id: canvasId,
      type: "Canvas",
      parent: { id: manifestId, type: "Manifest" },
    });

    const crop: BoxSelector = {
      type: "BoxSelector",
      spatial: { x: 100, y: 50, width: 300, height: 200 },
    };
    output.getState().refineSelectedItem(canvasId, crop);

    expect(refinements).toHaveLength(1);
    expect(refinements[0]).toMatchObject({
      selector: crop,
      imageSelector: crop,
    });
    expect(
      output.getState().availableOutputs.map((target) => target.label),
    ).toEqual([
      "Canvas",
      "Canvas region",
      "Image service",
      "Image service region",
    ]);

    output.getState().refineSelectedItem(canvasId, null);

    expect(refinements).toHaveLength(2);
    expect(output.getState().selectedItems[0]?.selector).toBeUndefined();
    expect(output.getState().selectedItems[0]?.imageSelector).toBeUndefined();
    expect(
      output.getState().availableOutputs.map((target) => target.label),
    ).toEqual(["Canvas", "Image service"]);
  });
});
