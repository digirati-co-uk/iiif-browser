import {
  canonicalServiceUrl,
  getImageServices,
} from "@atlas-viewer/iiif-image-api";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import type { ExplorerFormat } from "../IIIFBrowser.types";
import { findSelectedPainting } from "../utilities/painting-selection";

export const imageServiceFormat: ExplorerFormat<"image-service"> = {
  label: "Image service",
  format: async (resource, options, vault) => {
    const canvas = vault.get<CanvasNormalized>(resource);
    const first = findSelectedPainting(
      vault,
      canvas,
      resource.selectedPainting,
    );

    if (!first) {
      throw new Error("Choose an image source for this Canvas");
    }

    if (first.type !== "image" || first.resource.type !== "Image") {
      throw new Error("Resource is not an image");
    }

    const service = getImageServices(first.resource)[0];

    if (options.allowImageFallback) {
      return first.resource.id || (first.resource as any)["@id"];
    }

    if (!service) {
      throw new Error("Image service not found");
    }

    const id = service.id || (service["@id"] as string);

    if (options.skipCanonical) {
      return id;
    }

    return canonicalServiceUrl(service.id || (service["@id"] as string));
  },
  supportedTypes: ["Canvas", "CanvasRegion"],
};
