import { describe, expect, it, vi } from "vitest";
import { createInteractionFixture } from "../src/fixtures/interaction-regression";
import { contentStateFormat } from "../src/formats/content-state";
import { imageUrlFormat } from "../src/formats/image-url";
import { parseIIIFImageUrl } from "../src/mdxeditor/image-api";
import {
  defaultSelectedPainting,
  selectedPaintingThumbnail,
} from "../src/utilities/painting-selection";
import { createOutputStore } from "../src/stores/output-store";
import { createEmitter } from "../src/events";
import type { BrowserLinkConfig } from "../src/browser/BrowserLink";

const selector = {
  type: "BoxSelector" as const,
  spatial: { x: 100, y: 200, width: 600, height: 800 },
};
const linkConfig = {
  canSelectCanvas: true,
  canSelectManifest: true,
  canSelectCollection: true,
  canSelectImageService: true,
  disallowedResources: [],
  canSelectOnlyAllowedDomains: false,
  customCanSelect: null,
} as unknown as BrowserLinkConfig;

describe("rotation and crop output round trips", () => {
  it("caps a small Image API 3 crop to its source dimensions", async () => {
    const { vault, canvasId } = createInteractionFixture({ image3: true });
    const url = await imageUrlFormat.format(
      {
        id: canvasId,
        type: "Canvas",
        rotation: 90,
        selector: {
          type: "BoxSelector",
          spatial: { x: 10, y: 20, width: 100, height: 150 },
        },
      },
      { type: "image-url", width: 600 },
      vault,
    );
    expect(url).toContain("/10,20,100,150/100,/90/default.jpg");
  });

  it.each([false, true])(
    "publishes crop/rotation through callbacks for Presentation 2=%s",
    async (presentation2) => {
      const { vault, canvasId, manifestId } = createInteractionFixture({
        presentation2,
      });
      const emitter = createEmitter({});
      const cb = vi.fn();
      const target = {
        type: "callback" as const,
        label: "Image",
        supportedTypes: ["Canvas" as const],
        format: { type: "image-url" as const, width: 600 },
        cb,
      };
      const store = createOutputStore({
        vault,
        emitter: emitter as any,
        linkConfig,
        output: [target],
      });
      emitter.emit("canvas.change", {
        id: canvasId,
        type: "Canvas",
        parent: { id: manifestId, type: "Manifest" },
      });
      for (const angle of [0, 90, 180, 270, 0]) {
        store.getState().setRotation(canvasId, angle);
        store.getState().refineSelectedItem(canvasId, selector);
        await store.getState().runTargetAction(target);
        const resource = store.getState().selectedItems[0];
        expect(resource).toMatchObject({
          rotation: angle,
          selector,
          imageSelector: selector,
        });
        expect(parseIIIFImageUrl(cb.mock.lastCall![0])).toMatchObject({
          region: { x: 100, y: 200, w: 600, h: 800 },
          rotation: { angle },
          size: { width: 600 },
        });
        const state = JSON.parse(
          await contentStateFormat.format(
            resource,
            { type: "content-state" },
            vault,
          ),
        );
        expect(state.target.id).toBe(`${canvasId}#xywh=100,200,600,800`);
        expect(state.target.partOf[0].id).toBe(manifestId);
        expect(state.target.selector).toEqual(
          angle
            ? { type: "ImageApiSelector", rotation: `${angle}` }
            : undefined,
        );
      }
      store.getState().refineSelectedItem(canvasId, null);
      await store.getState().runTargetAction(target);
      expect(parseIIIFImageUrl(cb.mock.lastCall![0])?.region).toEqual({
        full: true,
      });
    },
  );
  it.each([false, true])(
    "keeps API version and source for Image API 3=%s",
    async (image3) => {
      const { vault, canvasId, serviceId } = createInteractionFixture({
        image3,
      });
      const canvas = vault.get<any>(canvasId);
      const selectedPainting = defaultSelectedPainting(vault, canvas);
      const url = await imageUrlFormat.format(
        { id: canvasId, type: "Canvas", selectedPainting, rotation: 90 },
        { type: "image-url" },
        vault,
      );
      expect(url).toBe(
        `${serviceId}/full/${image3 ? "max" : "full"}/90/default.jpg`,
      );
      expect(
        selectedPaintingThumbnail(
          vault,
          canvas,
          selectedPainting,
          undefined,
          90,
        ),
      ).toContain("/!120,120/90/default.jpg");
    },
  );
});
