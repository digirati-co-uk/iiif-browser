import {
  canonicalServiceUrl,
  combineProfiles,
  type ImageServiceImageRequest,
  parseImageServiceRequest,
  type RegionParameter,
  regionParameterToString,
  rotationParameterToString,
} from "@atlas-viewer/iiif-image-api";

export type IIIFImageRequest = Extract<
  ImageServiceImageRequest,
  { type: "image" }
>;

export type IIIFImageInfo = {
  id?: string;
  "@id"?: string;
  type?: string;
  "@type"?: string;
  "@context"?: string | string[];
  protocol?: string;
  profile?: unknown;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  maxArea?: number;
  sizes?: Array<{ width: number; height: number }>;
  extraFormats?: string[];
  extraQualities?: string[];
  extraFeatures?: string[];
  preferredFormats?: string[];
};

export type ImageCapabilities = {
  customSize: boolean;
  crop: boolean;
  rotation: boolean;
  formats: string[];
  qualities: string[];
  sizes: Array<{ width: number; height: number }>;
  maxWidth: number;
  sourceWidth: number;
  sourceHeight: number;
};

export function parseIIIFImageUrl(url: string): IIIFImageRequest | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
    parsedUrl.search = "";
    parsedUrl.hash = "";
    const request = parseImageServiceRequest(parsedUrl.toString());
    return request.type === "image" ? request : null;
  } catch {
    return null;
  }
}

export function createIIIFRequest(
  serviceId: string,
  version: 2 | 3,
  region: RegionParameter,
  options: {
    width?: number;
    height?: number;
    rotation?: number;
    quality?: string;
    format?: string;
  } = {},
): IIIFImageRequest {
  const parsed = parseImageServiceRequest(canonicalServiceUrl(serviceId));
  if (parsed.type !== "info") {
    throw new Error("Invalid IIIF Image API service URL");
  }

  const width = positiveInteger(options.width);
  const height = positiveInteger(options.height);
  return {
    ...parsed,
    type: "image",
    originalPath: "",
    region,
    size: {
      max: !width && !height,
      upscaled: false,
      confined: Boolean(width && height),
      width,
      height,
      serialiseAsFull: version === 2 && !width && !height,
      version,
    },
    rotation: { angle: normaliseRotation(options.rotation) },
    quality: options.quality ?? "default",
    format: options.format ?? "jpg",
  };
}

export function imageServiceId(request: IIIFImageRequest) {
  const prefix = request.prefix.replace(/^\/+|\/+$/g, "");
  return `${request.scheme}://${request.server}/${prefix ? `${prefix}/` : ""}${request.identifier}`;
}

export function imageRequestUrl(
  request: IIIFImageRequest,
  info?: IIIFImageInfo | null,
) {
  const version = info
    ? imageApiVersion(info)
    : request.size.serialiseAsFull
      ? 2
      : (request.size.version ?? 3);
  const size = request.size.max
    ? version === 2
      ? "full"
      : "max"
    : serialiseSize(request, version);
  return [
    imageServiceId(request),
    regionParameterToString(request.region),
    size,
    rotationParameterToString(request.rotation),
    `${request.quality}.${request.format}`,
  ].join("/");
}

export function getImageCapabilities(
  info: IIIFImageInfo,
  region: RegionParameter,
): ImageCapabilities {
  const profile = combineProfiles(info as never);
  const features = new Set(profile.extraFeatures);
  const { width: sourceWidth, height: sourceHeight } = regionDimensions(
    info,
    region,
  );
  const maxWidth = constrainedWidth(
    sourceWidth,
    sourceHeight,
    info.maxWidth ?? profile.maxWidth,
    info.maxHeight ?? profile.maxHeight,
    info.maxArea ?? profile.maxArea,
  );
  const formats = unique([
    ...(info.preferredFormats ?? []),
    ...profile.extraFormats,
  ]);
  const qualities = unique(profile.extraQualities);
  const sizes = region.full
    ? uniqueSizes(info.sizes ?? []).filter((size) => size.width <= maxWidth)
    : [];

  return {
    customSize:
      features.has("sizeByW") ||
      features.has("sizeByWh") ||
      features.has("sizeByConfinedWh"),
    crop: features.has("regionByPx"),
    rotation:
      features.has("rotationBy90s") || features.has("rotationArbitrary"),
    formats: formats.length ? formats : ["jpg"],
    qualities: qualities.length ? qualities : ["default"],
    sizes,
    maxWidth,
    sourceWidth,
    sourceHeight,
  };
}

export function requestAtWidth(
  request: IIIFImageRequest,
  width: number,
  capabilities: Pick<
    ImageCapabilities,
    "maxWidth" | "sourceWidth" | "sourceHeight"
  >,
) {
  const nextWidth = Math.max(
    1,
    Math.min(capabilities.maxWidth, Math.round(width)),
  );
  const nextHeight = Math.max(
    1,
    Math.round(
      nextWidth * (capabilities.sourceHeight / capabilities.sourceWidth),
    ),
  );
  return {
    ...request,
    size: {
      max: false,
      upscaled: false,
      confined: false,
      width: nextWidth,
      height: nextHeight,
      version: request.size.version,
    },
  } satisfies IIIFImageRequest;
}

export function fullSizeRequest(request: IIIFImageRequest, version: 2 | 3) {
  return {
    ...request,
    size: {
      max: true,
      upscaled: false,
      confined: false,
      serialiseAsFull: version === 2,
      version,
    },
  } satisfies IIIFImageRequest;
}

export function imageApiVersion(info: IIIFImageInfo): 2 | 3 {
  const contexts = Array.isArray(info["@context"])
    ? info["@context"]
    : [info["@context"]];
  return info.type?.endsWith("3") ||
    contexts.some((context) => context?.includes("/image/3/"))
    ? 3
    : 2;
}

function regionDimensions(info: IIIFImageInfo, region: RegionParameter) {
  if (region.square) {
    const side = Math.min(info.width, info.height);
    return { width: side, height: side };
  }
  if (region.w && region.h) {
    return region.percent
      ? {
          width: Math.round((info.width * region.w) / 100),
          height: Math.round((info.height * region.h) / 100),
        }
      : { width: region.w, height: region.h };
  }
  return { width: info.width, height: info.height };
}

function constrainedWidth(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth?: number,
  maxHeight?: number,
  maxArea?: number,
) {
  let width = sourceWidth;
  if (maxWidth) width = Math.min(width, maxWidth);
  if (maxHeight)
    width = Math.min(width, maxHeight * (sourceWidth / sourceHeight));
  if (maxArea) {
    width = Math.min(width, Math.sqrt(maxArea * (sourceWidth / sourceHeight)));
  }
  return Math.max(1, Math.floor(width));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueSizes(sizes: Array<{ width: number; height: number }>) {
  return [
    ...new Map(
      sizes
        .filter((size) => size.width > 0 && size.height > 0)
        .map((size) => [`${size.width}x${size.height}`, size]),
    ).values(),
  ].sort((a, b) => a.width - b.width);
}

function positiveInteger(value?: number) {
  return value && value > 0 ? Math.round(value) : undefined;
}

function normaliseRotation(value = 0) {
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : 0;
}

function serialiseSize(request: IIIFImageRequest, version: 2 | 3) {
  const { size } = request;
  const prefix = size.upscaled ? "^" : "";
  if (size.percentScale) return `${prefix}pct:${size.percentScale}`;
  if (size.confined) {
    return `${prefix}!${size.width ?? ""},${size.height ?? ""}`;
  }
  if (size.width) {
    return `${prefix}${size.width},${version === 3 ? (size.height ?? "") : ""}`;
  }
  return `${prefix},${size.height ?? ""}`;
}
