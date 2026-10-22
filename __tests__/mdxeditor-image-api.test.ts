import { describe, expect, it } from "vitest";
import {
  createIIIFRequest,
  fitInitialImageRequest,
  getImageCapabilities,
  imageRequestUrl,
  imageServiceId,
  initialImageWidth,
  parseIIIFImageUrl,
  requestAtWidth,
} from "../src/mdxeditor/image-api";

const info = {
  "@context": "http://iiif.io/api/image/2/context.json",
  "@id": "https://example.org/iiif/book%2Fpage-1",
  protocol: "http://iiif.io/api/image",
  profile: ["http://iiif.io/api/image/2/level2.json"],
  width: 2400,
  height: 1600,
  maxWidth: 1800,
  sizes: [
    { width: 600, height: 400 },
    { width: 1200, height: 800 },
  ],
};

describe("MDXEditor IIIF image requests", () => {
  it("rejects presentation URLs and ordinary image paths", () => {
    expect(
      parseIIIFImageUrl(
        "https://heritage.tudelft.nl/iiif/manifests/015fcbc0-6ccb-4dd9-bffe-9e5b64545f6f/manifest.json",
      ),
    ).toBeNull();
    expect(
      parseIIIFImageUrl("https://example.org/photos/2024/10/12/photo.jpg"),
    ).toBeNull();
    expect(
      parseIIIFImageUrl(
        "https://example.org/iiif/id/pct:10,20,30,40/^pct:50/!22.5/default.png?token=test",
      ),
    ).not.toBeNull();
  });
  it("parses an existing cropped request and preserves its service identity", () => {
    const request = parseIIIFImageUrl(
      "https://example.org/iiif/book%2Fpage-1/10,20,900,600/600,/90/default.jpg",
    );

    expect(request).not.toBeNull();
    expect(request?.region).toMatchObject({ x: 10, y: 20, w: 900, h: 600 });
    expect(request?.rotation.angle).toBe(90);
    expect(imageServiceId(request!)).toBe(
      "https://example.org/iiif/book%2Fpage-1",
    );
  });

  it("uses profile limits and rewrites custom requests at a crisp resize ratio", () => {
    const request = parseIIIFImageUrl(
      "https://example.org/iiif/book%2Fpage-1/full/900,/0/default.jpg",
    )!;
    const capabilities = getImageCapabilities(info, request.region);
    const resized = requestAtWidth(request, 500 * 2, capabilities);

    expect(capabilities).toMatchObject({
      customSize: true,
      crop: true,
      rotation: true,
      maxWidth: 1800,
    });
    expect(imageRequestUrl(resized, info)).toBe(
      "https://example.org/iiif/book%2Fpage-1/full/1000,/0/default.jpg",
    );
  });

  it("keeps level zero services on their declared fixed sizes", () => {
    const levelZero = {
      ...info,
      profile: ["http://iiif.io/api/image/2/level0.json"],
      maxWidth: undefined,
    };
    const capabilities = getImageCapabilities(levelZero, { full: true });

    expect(capabilities.customSize).toBe(false);
    expect(capabilities.rotation).toBe(false);
    expect(capabilities.sizes).toEqual(info.sizes);
  });

  it("serializes confined dimensions without dropping the height", () => {
    const request = parseIIIFImageUrl(
      "https://example.org/iiif/book%2Fpage-1/full/!800,600/0/default.jpg",
    )!;

    expect(imageRequestUrl(request, info)).toContain("/full/!800,600/0/");
  });
});

it("defaults to the editor width or a validated fallback and respects service limits", () => {
  expect(initialImageWidth(840, 600)).toBe(840);
  expect(initialImageWidth(0, 600)).toBe(600);
  expect(initialImageWidth(undefined, Number.NaN)).toBe(640);
  const request = createIIIFRequest(
    "https://example.org/iiif/book",
    2,
    { full: true },
    { width: 900 },
  );
  expect(fitInitialImageRequest(request, info).size.width).toBe(900);
  expect(
    fitInitialImageRequest(request, { ...info, width: 300, height: 200 }).size
      .width,
  ).toBe(300);
  expect(
    fitInitialImageRequest(request, {
      ...info,
      profile: ["http://iiif.io/api/image/2/level0.json"],
    }).size.width,
  ).toBe(1200);
  expect(
    fitInitialImageRequest(request, {
      ...info,
      profile: ["http://iiif.io/api/image/2/level0.json"],
      sizes: [],
    }).size.max,
  ).toBe(true);
});
