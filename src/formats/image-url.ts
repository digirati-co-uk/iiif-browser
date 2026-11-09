import type { ExplorerFormat } from "../IIIFBrowser.types";
import { createIIIFRequest, imageRequestUrl } from "../mdxeditor/image-api";
import {
  canvasToImageSelector,
  findSelectedPainting,
  paintingReference,
} from "../utilities/painting-selection";

/** A rendered Image API request, including the selected source, crop and rotation. */
export const imageUrlFormat: ExplorerFormat<"image-url"> = {
  label: "IIIF image URL",
  supportedTypes: [
    "Canvas",
    "CanvasRegion",
    "ImageService",
    "ImageServiceRegion",
  ],
  format: (resource, options, vault) => {
    let id = resource.id;
    let version: 2 | 3 = resource.type.endsWith("2") ? 2 : 3;
    let selector = resource.imageSelector || resource.selector;
    if (resource.type === "Canvas") {
      const canvas = vault.get<any>(resource);
      const painting = findSelectedPainting(
        vault,
        canvas,
        resource.selectedPainting,
      );
      if (!painting) throw new Error("Choose an image source for this Canvas");
      const service = paintingReference(painting).service;
      if (!service) throw new Error("Image service not found");
      id = service.id;
      version = service.type === "ImageService3" ? 3 : 2;
      selector =
        resource.imageSelector ||
        canvasToImageSelector(canvas, painting, resource.selector);
    } else {
      const service = vault.get<any>(resource, { skipSelfReturn: false });
      const type = service?.type || service?.["@type"];
      if (type) version = type === "ImageService3" ? 3 : 2;
    }
    const spatial = selector?.spatial;
    // Image API 3 rejects implicit upscaling. Small crops must stay at or below
    // their source dimensions even when the output asks for a larger preview.
    const width =
      options.width && spatial
        ? Math.min(options.width, Math.round(spatial.width))
        : options.width;
    const height =
      options.height && spatial
        ? Math.min(options.height, Math.round(spatial.height))
        : options.height;
    const request = createIIIFRequest(
      id,
      version,
      spatial
        ? {
            x: Math.round(spatial.x),
            y: Math.round(spatial.y),
            w: Math.round(spatial.width),
            h: Math.round(spatial.height),
          }
        : { full: true },
      { ...options, width, height, rotation: resource.rotation },
    );
    return imageRequestUrl(request);
  },
};
