import type { ExplorerFormat } from "../IIIFBrowser.types";

export const customFormat: ExplorerFormat<"custom"> = {
  label: "Custom",
  format: (resource, options, vault) => {
    options.format(resource, resource.parent, vault);
  },
  supportedTypes: [
    "Collection",
    "Manifest",
    "Canvas",
    "ImageService",
    "CanvasRegion",
    "ImageServiceRegion",
  ],
};
