import {
  fullSizeRequest,
  getImageCapabilities,
  imageApiVersion,
  imageRequestUrl,
  parseIIIFImageUrl,
  requestAtWidth,
} from "../mdxeditor/image-api";
import type { NotebookResource } from "./resources";

/** Compact choices from the same service capabilities as the full image editor. */
export function NotebookImageSize({
  resource,
  src,
  onChange,
}: {
  resource: NotebookResource;
  src: string;
  onChange(src: string): void;
}) {
  const request = parseIIIFImageUrl(src);
  const info = resource.imageInfo;
  if (!request || !info) return null;
  const capabilities = getImageCapabilities(info, request.region);
  const version = imageApiVersion(info);
  const url = (next: typeof request) => {
    const result = new URL(imageRequestUrl(next, info));
    result.search = new URL(src).search;
    return result.toString();
  };
  const choices = new Map<string, string>();
  for (const size of capabilities.sizes)
    choices.set(
      url({
        ...request,
        size: {
          ...size,
          max: false,
          upscaled: false,
          confined: false,
          version,
        },
      }),
      `${size.width} × ${size.height}`,
    );
  if (capabilities.customSize) {
    for (const width of [320, 640, 1280, capabilities.maxWidth]) {
      if (width <= capabilities.maxWidth)
        choices.set(
          url(requestAtWidth(request, width, capabilities)),
          `${width}px wide`,
        );
    }
  }
  choices.set(url(fullSizeRequest(request, version)), "Maximum available");
  if (!choices.has(src))
    choices.set(
      src,
      request.size.width
        ? `Current (${request.size.width}px wide)`
        : "Current size",
    );
  return (
    <label className="iiif-notebook__image-size">
      <span>Image size</span>
      <select value={src} onChange={(event) => onChange(event.target.value)}>
        {[...choices].map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
