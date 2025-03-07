import type { ExplorerFormat } from "../IIIFBrowser.types";

export const urlFormat: ExplorerFormat<"url"> = {
  label: "URL",
  supportedTypes: ["Collection", "Manifest", "Canvas", "ImageService"],
  format: async (resource: any, options) => {
    const singleResource = Array.isArray(resource) ? resource[0] : resource;
    if (!singleResource) {
      return null;
    }
    const parentResource = resource.parent;
    if (
      parentResource &&
      options.resolvable &&
      (resource.type !== "Manifest" ||
        resource.type !== "Collection" ||
        resource.type !== "ImageService")
    ) {
      return parentResource.id || parentResource["@id"];
    }
    return resource.id || resource["@id"];
  },
};
