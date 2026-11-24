import type { BoxSelector } from "@iiif/helpers";
import { Vault } from "@iiif/helpers";
import { describe, expect, it } from "vitest";
import { imageService } from "../src/editor/image-options";
import { imageUrlFormat } from "../src/formats/image-url";
import { outputTypesForItem } from "../src/stores/output-store";
import {
  canvasToImageSelector,
  defaultSelectedPainting,
  findSelectedPainting,
  getImagePaintings,
  selectedPaintingFromId,
  selectedPaintingThumbnail,
} from "../src/utilities/painting-selection";

const canvasId = "https://example.org/canvas";
const naturalId = "https://example.org/natural/full/max/0/default.jpg";
const xrayId = "https://example.org/xray/full/max/0/default.jpg";

function loadCanvas(body: any, target: any = canvasId) {
  const vault = new Vault();
  vault.loadSync("https://example.org/manifest", {
    id: "https://example.org/manifest",
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
                target,
                body,
              },
            ],
          },
        ],
      },
    ],
  } as any);
  return {
    vault,
    canvas: vault.get<any>({ id: canvasId, type: "Canvas" })!,
  };
}

const crop: BoxSelector = {
  type: "BoxSelector",
  spatial: { x: 200, y: 100, width: 100, height: 50 },
};

describe("painting selection", () => {
  it("finds an image service among bare service references", () => {
    const { vault } = loadCanvas({
      id: "https://example.org/image",
      type: "Image",
      service: [
        "https://example.org/other-service",
        {
          id: "https://example.org/image-service",
          type: "ImageService3",
          profile: "level1",
        },
      ],
    });
    expect(imageService({ id: canvasId, type: "Canvas" }, vault)).toEqual({
      id: "https://example.org/image-service",
      version: 3,
    });
  });

  it("maps a Canvas-space crop into the selected image coordinates", () => {
    const { vault, canvas } = loadCanvas(
      {
        id: "https://example.org/image",
        type: "Image",
        width: 800,
        height: 400,
        service: [
          {
            id: "https://example.org/image-service",
            type: "ImageService3",
            profile: "level1",
          },
        ],
      },
      `${canvasId}#xywh=100,50,400,200`,
    );
    const painting = getImagePaintings(vault, canvas)[0]!;

    expect(canvasToImageSelector(canvas, painting, crop)?.spatial).toEqual({
      x: 200,
      y: 100,
      width: 200,
      height: 100,
    });
  });

  it("uses full image-service dimensions instead of a scaled painting body", () => {
    const { vault, canvas } = loadCanvas({
      id: "https://example.org/image/full/250,125/0/default.jpg",
      type: "Image",
      width: 250,
      height: 125,
      service: [
        {
          "@id": "https://example.org/image",
          "@type": "ImageService2",
          profile: "http://iiif.io/api/image/2/level2.json",
          width: 1000,
          height: 500,
        },
      ],
    });
    const painting = getImagePaintings(vault, canvas)[0]!;

    expect(canvasToImageSelector(canvas, painting, crop)?.spatial).toEqual(
      crop.spatial,
    );
  });

  it.each([
    [90, { x: 160, y: 320, width: 120, height: 60 }],
    [180, { x: 280, y: 280, width: 90, height: 80 }],
    [270, { x: 220, y: 220, width: 120, height: 60 }],
  ])(
    "recrops a painting already rotated by %i degrees",
    async (rotation, expected) => {
      const { vault, canvas } = loadCanvas(
        {
          type: "SpecificResource",
          source: {
            id: "https://example.org/image/100,200,300,200/max/90/default.jpg",
            type: "Image",
            width: 200,
            height: 300,
            service: [
              {
                id: "https://example.org/image",
                type: "ImageService3",
                profile: "level2",
                width: 1200,
                height: 800,
              },
            ],
          },
          selector: {
            type: "ImageApiSelector",
            region: "100,200,300,200",
            rotation: String(rotation),
          },
        },
        `${canvasId}#xywh=100,50,400,200`,
      );
      const selector: BoxSelector = {
        type: "BoxSelector",
        spatial: { x: 140, y: 90, width: 120, height: 80 },
      };
      const painting = getImagePaintings(vault, canvas)[0]!;
      expect(
        canvasToImageSelector(canvas, painting, selector)?.spatial,
      ).toEqual(expected);

      const url = await imageUrlFormat.format(
        { id: canvasId, type: "Canvas", selector, rotation: 90 },
        { type: "image-url" },
        vault,
      );
      const region = [
        expected.x,
        expected.y,
        expected.width,
        expected.height,
      ].join(",");
      expect(url).toBe(
        `https://example.org/image/${region}/max/${(rotation + 90) % 360}/default.jpg`,
      );
    },
  );

  it("uses a deterministic Choice default and preserves another service by id", () => {
    const { vault, canvas } = loadCanvas({
      type: "Choice",
      items: [
        {
          id: naturalId,
          type: "Image",
          width: 2000,
          height: 1000,
          service: [
            {
              id: "https://example.org/natural",
              type: "ImageService3",
              profile: "level1",
            },
          ],
        },
        {
          id: xrayId,
          type: "Image",
          width: 2000,
          height: 1000,
          service: [
            {
              id: "https://example.org/xray",
              type: "ImageService3",
              profile: "level1",
            },
          ],
        },
      ],
    });

    expect(defaultSelectedPainting(vault, canvas)).toMatchObject({
      id: naturalId,
      choice: true,
      service: { id: "https://example.org/natural" },
    });

    const xray = selectedPaintingFromId(vault, canvas, xrayId)!;
    expect(xray).toMatchObject({
      id: xrayId,
      choice: true,
      service: { id: "https://example.org/xray" },
    });
    expect(findSelectedPainting(vault, canvas, xray)?.resource.id).toBe(xrayId);
  });

  it("requires an explicit source for multi-up Image Service output", () => {
    const { vault, canvas } = loadCanvas([
      {
        id: naturalId,
        type: "Image",
        width: 1000,
        height: 500,
        service: [
          {
            id: "https://example.org/natural",
            type: "ImageService3",
            profile: "level1",
          },
        ],
      },
      {
        id: xrayId,
        type: "Image",
        width: 1000,
        height: 500,
        service: [
          {
            id: "https://example.org/xray",
            type: "ImageService3",
            profile: "level1",
          },
        ],
      },
    ]);

    expect(defaultSelectedPainting(vault, canvas)).toBeUndefined();
    expect(
      outputTypesForItem({ id: canvas.id, type: "Canvas", selector: crop }),
    ).toEqual(["Canvas", "CanvasRegion"]);
  });

  it("builds a cropped preview only when the chosen painting has a service", () => {
    const { vault, canvas } = loadCanvas({
      id: naturalId,
      type: "Image",
      width: 2000,
      height: 1000,
      service: [
        {
          id: "https://example.org/natural",
          type: "ImageService3",
          profile: "level1",
        },
      ],
    });
    const selected = defaultSelectedPainting(vault, canvas)!;
    const imageSelector = canvasToImageSelector(
      canvas,
      findSelectedPainting(vault, canvas, selected)!,
      crop,
    )!;

    expect(
      selectedPaintingThumbnail(vault, canvas, selected, imageSelector, 90),
    ).toContain("/400,200,200,100/!120,100/90/default.jpg");
  });
});
