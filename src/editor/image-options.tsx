import {
  canonicalServiceUrl,
  getImageServices,
  type RegionParameter,
} from "@atlas-viewer/iiif-image-api";
import {
  createPaintingAnnotationsHelper,
  getValue,
  type Vault,
} from "@iiif/helpers";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import type { IIIFBrowserProps } from "../IIIFBrowser";
import {
  fitInitialImageRequest,
  fullSizeRequest,
  getImageCapabilities,
  type IIIFImageInfo,
  type IIIFImageRequest,
  imageApiVersion,
  imageRequestUrl,
  imageServiceId,
  initialImageWidth,
  requestAtWidth,
} from "../mdxeditor/image-api";

type ImageQuality = "default" | "color" | "gray" | "bitonal";
type ImageFormat = "jpg" | "png" | "webp" | "tif" | "gif" | "jp2" | "pdf";
export type ImageInfoCache = Map<string, Promise<IIIFImageInfo>>;

export interface IIIFImageOptions {
  actionLabel?: string;
  selectLabel?: string;
  /** Fallback request width when the editor cannot be measured. Defaults to 640. */
  defaultWidth?: number;
  width?: number;
  height?: number;
  rotation?: number;
  quality?: ImageQuality;
  format?: ImageFormat;
  /** Image request pixels per rendered CSS pixel after MDXEditor resizing. */
  resizeMultiplier?: number | false;
}

export interface CanvasSnippetOptions {
  actionLabel?: string;
}

export interface IIIFBrowserPluginParams {
  /** Built-in toolbar icon. Defaults to the image stack. */
  icon?: "stack" | "add";
  /** Every IIIF Browser option except its plugin-owned output actions. */
  browserProps?: Omit<IIIFBrowserProps, "output">;
  /** Configure Image API output, or set to false to hide the image action. */
  image?: false | IIIFImageOptions;
  /** Adds a Markdown image followed by the Canvas label as its caption. */
  canvasSnippet?: boolean | CanvasSnippetOptions;
  dialog?: {
    title?: ReactNode;
    optionsTitle?: ReactNode;
    closeLabel?: string;
    className?: string;
    style?: CSSProperties;
    browserClassName?: string;
    optionsClassName?: string;
  };
}

export type IIIFSelectedResource = {
  id: string;
  type: string;
  label?: Parameters<typeof getValue>[0];
  selector?: {
    type: string;
    spatial: { x: number; y: number; width: number; height: number };
  };
  imageSelector?: {
    type: string;
    spatial: { x: number; y: number; width: number; height: number };
  };
  selectedPainting?: {
    id: string;
    type: "Image";
    annotationId: string;
    choice?: true;
  };
  rotation?: number;
};

export type Selection = {
  resource: IIIFSelectedResource | IIIFSelectedResource[];
  vault: Vault;
};

export type Draft = {
  request: IIIFImageRequest;
  label: string;
  autoSize?: boolean;
};

export function initialEditorImageSize(
  options: IIIFImageOptions,
  element?: HTMLElement | null,
) {
  if (options.width || options.height)
    return { width: options.width, height: options.height };
  const style = element && getComputedStyle(element);
  const width = element
    ? element.clientWidth -
      Number.parseFloat(style?.paddingLeft || "0") -
      Number.parseFloat(style?.paddingRight || "0")
    : undefined;
  return { width: initialImageWidth(width, options.defaultWidth) };
}

export function ImageOptions({
  draft,
  setDraft,
  cache,
  requestInit,
  className,
  onCancel,
  imageAction,
  canvasAction,
  children,
}: {
  children?: ReactNode;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  cache: ImageInfoCache;
  requestInit?: RequestInit;
  className?: string;
  onCancel: () => void;
  imageAction: { label: string; onClick: (url: string) => void } | null;
  canvasAction: { label: string; onClick: (url: string) => void } | null;
}) {
  const { info, loading, error } = useImageInfo(
    cache,
    imageServiceId(draft.request),
    requestInit,
  );
  useEffect(() => {
    if (info && draft.autoSize)
      setDraft({
        ...draft,
        request: fitInitialImageRequest(draft.request, info),
        autoSize: false,
      });
  }, [info, draft, setDraft]);
  const capabilities = info
    ? getImageCapabilities(info, draft.request.region)
    : null;
  const version = info
    ? imageApiVersion(info)
    : (draft.request.size.version ?? 3);
  const listedSize = capabilities
    ? capabilities.sizes.find((size) => sizeMatchesRequest(draft.request, size))
    : null;
  const sizeMode = draft.request.size.max
    ? "max"
    : listedSize
      ? `preset:${listedSize.width}x${listedSize.height}`
      : "custom";
  const customWidth = capabilities
    ? requestWidth(draft.request, capabilities)
    : (draft.request.size.width ?? 1);
  const hasCrop = !draft.request.region.full;
  const invalidCrop = Boolean(info && hasCrop && !capabilities?.crop);
  const outputUrl = imageRequestUrl(draft.request, info);
  const previewRequest =
    capabilities?.customSize && (draft.request.size.max || customWidth > 900)
      ? requestAtWidth(draft.request, 900, capabilities)
      : draft.request;
  const previewUrl = imageRequestUrl(previewRequest, info);

  const updateRequest = (request: IIIFImageRequest) =>
    setDraft({ ...draft, request });

  const removeCrop = () => {
    const request = { ...draft.request, region: { full: true } };
    if (info && !request.size.max) {
      updateRequest(
        requestAtWidth(
          request,
          customWidth,
          getImageCapabilities(info, request.region),
        ),
      );
    } else {
      updateRequest(request);
    }
  };

  return (
    <>
      <div className={classNames("iiif-browser-mdx-options", className)}>
        <section
          className="iiif-browser-mdx-preview"
          aria-label="Image preview"
        >
          {!draft.autoSize || !loading ? (
            <img src={previewUrl} alt="" />
          ) : (
            <output>Loading image…</output>
          )}
          <p title={outputUrl}>{outputUrl}</p>
        </section>

        <div className="iiif-browser-mdx-controls">
          {loading ? <output>Loading Image API options…</output> : null}
          {error ? (
            <p className="iiif-browser-mdx-inline-alert" role="alert">
              {error} The current request can still be used, but service options
              are unavailable.
            </p>
          ) : null}

          <label className="iiif-browser-mdx-field">
            <span>Alternative text</span>
            <input
              type="text"
              value={draft.label}
              onChange={(event) =>
                setDraft({ ...draft, label: event.currentTarget.value })
              }
            />
          </label>

          {children}

          {capabilities ? (
            <fieldset className="iiif-browser-mdx-fieldset">
              <legend>Image size</legend>
              <label className="iiif-browser-mdx-field">
                <span>Request size</span>
                <select
                  value={sizeMode}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (value === "max") {
                      updateRequest(fullSizeRequest(draft.request, version));
                    } else if (value === "custom") {
                      updateRequest(
                        requestAtWidth(
                          draft.request,
                          Math.min(1200, capabilities.maxWidth),
                          capabilities,
                        ),
                      );
                    } else {
                      const size = capabilities.sizes.find(
                        (candidate) =>
                          `preset:${candidate.width}x${candidate.height}` ===
                          value,
                      );
                      if (size) {
                        updateRequest({
                          ...draft.request,
                          size: {
                            max: false,
                            upscaled: false,
                            confined: false,
                            width: size.width,
                            height: size.height,
                            version,
                          },
                        });
                      }
                    }
                  }}
                >
                  <option value="max">
                    Maximum ({capabilities.sourceWidth} ×{" "}
                    {capabilities.sourceHeight})
                  </option>
                  {capabilities.sizes.map((size) => (
                    <option
                      key={`${size.width}x${size.height}`}
                      value={`preset:${size.width}x${size.height}`}
                    >
                      Preferred: {size.width} × {size.height}
                    </option>
                  ))}
                  {capabilities.customSize || sizeMode === "custom" ? (
                    <option value="custom">Custom width</option>
                  ) : null}
                </select>
              </label>
              {sizeMode === "custom" ? (
                <label className="iiif-browser-mdx-field">
                  <span>
                    Width <output>{customWidth}px</output>
                  </span>
                  <input
                    className="iiif-browser-mdx-range"
                    type="range"
                    min={Math.min(64, capabilities.maxWidth)}
                    max={capabilities.maxWidth}
                    value={customWidth}
                    disabled={!capabilities.customSize}
                    onChange={(event) =>
                      updateRequest(
                        requestAtWidth(
                          draft.request,
                          event.currentTarget.valueAsNumber,
                          capabilities,
                        ),
                      )
                    }
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}

          {hasCrop ? (
            <fieldset className="iiif-browser-mdx-fieldset">
              <legend>Crop</legend>
              <div className="iiif-browser-mdx-crop">
                <span>{regionLabel(draft.request.region)}</span>
                <button type="button" onClick={removeCrop}>
                  Remove crop
                </button>
              </div>
              {invalidCrop ? (
                <p className="iiif-browser-mdx-inline-alert" role="alert">
                  This service does not declare support for pixel cropping.
                  Remove the crop to continue.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {capabilities?.rotation ? (
            <fieldset className="iiif-browser-mdx-fieldset">
              <legend>Rotation</legend>
              <div className="iiif-browser-mdx-segmented">
                {[0, 90, 180, 270].map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    aria-pressed={draft.request.rotation.angle === rotation}
                    onClick={() =>
                      updateRequest({
                        ...draft.request,
                        rotation: {
                          ...draft.request.rotation,
                          angle: rotation,
                        },
                      })
                    }
                  >
                    {rotation}°
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {capabilities &&
          (capabilities.formats.length > 1 ||
            capabilities.qualities.length > 1) ? (
            <div className="iiif-browser-mdx-field-row">
              <label className="iiif-browser-mdx-field">
                <span>Format</span>
                <select
                  value={draft.request.format}
                  onChange={(event) =>
                    updateRequest({
                      ...draft.request,
                      format: event.currentTarget.value,
                    })
                  }
                >
                  {withCurrent(capabilities.formats, draft.request.format).map(
                    (format) => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="iiif-browser-mdx-field">
                <span>Quality</span>
                <select
                  value={draft.request.quality}
                  onChange={(event) =>
                    updateRequest({
                      ...draft.request,
                      quality: event.currentTarget.value,
                    })
                  }
                >
                  {withCurrent(
                    capabilities.qualities,
                    draft.request.quality,
                  ).map((quality) => (
                    <option key={quality} value={quality}>
                      {quality}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="iiif-browser-mdx-footer">
        <button
          type="button"
          className="iiif-browser-mdx-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        {canvasAction ? (
          <button
            type="button"
            className="iiif-browser-mdx-secondary"
            disabled={invalidCrop || (draft.autoSize && loading)}
            onClick={() => canvasAction.onClick(outputUrl)}
          >
            {canvasAction.label}
          </button>
        ) : null}
        {imageAction ? (
          <button
            type="button"
            className="iiif-browser-mdx-primary"
            disabled={invalidCrop || (draft.autoSize && loading)}
            onClick={() => imageAction.onClick(outputUrl)}
          >
            {imageAction.label}
          </button>
        ) : null}
      </footer>
    </>
  );
}

function useImageInfo(
  cache: ImageInfoCache,
  serviceId: string,
  requestInit?: RequestInit,
) {
  const [state, setState] = useState<{
    info: IIIFImageInfo | null;
    loading: boolean;
    error: string;
  }>({ info: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    setState({ info: null, loading: true, error: "" });
    void loadImageInfo(cache, serviceId, requestInit)
      .then((info) => {
        if (active) setState({ info, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            info: null,
            loading: false,
            error: errorMessage(error, "Could not load info.json."),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [cache, serviceId, requestInit]);

  return state;
}

export function loadImageInfo(
  cache: ImageInfoCache,
  serviceId: string,
  requestInit?: RequestInit,
) {
  let request = cache.get(serviceId);
  if (!request) {
    request = fetch(canonicalServiceUrl(serviceId), requestInit).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load info.json (${response.status}).`);
        }
        const info = (await response.json()) as IIIFImageInfo;
        if (!(info.width > 0) || !(info.height > 0)) {
          throw new Error(
            "The Image API information document has no dimensions.",
          );
        }
        if (!info.id && info["@id"]) info.id = info["@id"];
        return info;
      },
    );
    request.catch(() => cache.delete(serviceId));
    cache.set(serviceId, request);
  }
  return request;
}

export function imageService(resource: IIIFSelectedResource, vault: Vault) {
  if (resource.type.startsWith("ImageService")) {
    const service = vault.get<any>(resource, { skipSelfReturn: false });
    return {
      id: service?.id || service?.["@id"] || resource.id,
      version: imageServiceVersion(
        service?.type || resource.type,
        service?.["@context"],
      ),
    };
  }

  const canvas = vault.get<any>(resource, { skipSelfReturn: false });
  const paintables = createPaintingAnnotationsHelper(vault).getPaintables(
    canvas,
    resource.selectedPainting ? [resource.selectedPainting.id] : undefined,
  ).items;
  const paintable = resource.selectedPainting
    ? paintables.find(
        (candidate) =>
          candidate.annotationId === resource.selectedPainting?.annotationId &&
          candidate.resource.id === resource.selectedPainting.id,
      )
    : paintables.length === 1
      ? paintables[0]
      : undefined;
  if (
    !paintable ||
    paintable.type !== "image" ||
    paintable.resource.type !== "Image"
  ) {
    throw new Error("The selected Canvas does not contain an image");
  }
  const service = getImageServices(paintable.resource)[0];
  const id = service?.id || service?.["@id"];
  if (!id) {
    throw new Error(
      "The selected image does not have an IIIF Image API service",
    );
  }
  return {
    id,
    version: imageServiceVersion(
      service.type || service["@type"],
      service["@context"],
    ),
  };
}

function imageServiceVersion(
  type?: string,
  context?: string | string[],
): 2 | 3 {
  if (type?.endsWith("2")) return 2;
  const contexts = Array.isArray(context) ? context : [context];
  return contexts.some((value) => value?.includes("/image/2/")) ? 2 : 3;
}

export function resourceLabel(resource: IIIFSelectedResource, vault: Vault) {
  return (
    getValue(resource.label) ||
    getValue(vault.get<any>(resource)?.label) ||
    "IIIF image"
  );
}

export function one(resource: Selection["resource"]) {
  if (Array.isArray(resource)) throw new Error("Select a single IIIF resource");
  return resource;
}

export function isListedSize(
  request: IIIFImageRequest,
  sizes: Array<{ width: number; height: number }>,
) {
  return sizes.some((size) => sizeMatchesRequest(request, size));
}

function sizeMatchesRequest(
  request: IIIFImageRequest,
  size: { width: number; height: number },
) {
  return (
    request.size.width === size.width &&
    (!request.size.height || request.size.height === size.height)
  );
}

function requestWidth(
  request: IIIFImageRequest,
  capabilities: ReturnType<typeof getImageCapabilities>,
) {
  if (request.size.width) return request.size.width;
  if (request.size.height) {
    return Math.round(
      request.size.height *
        (capabilities.sourceWidth / capabilities.sourceHeight),
    );
  }
  return capabilities.maxWidth;
}

function regionLabel(region: RegionParameter) {
  if (region.square) return "Square crop";
  if (region.w && region.h) {
    const prefix = region.percent ? "Percentage crop" : "Pixel crop";
    return `${prefix}: ${region.x ?? 0}, ${region.y ?? 0}, ${region.w} × ${region.h}`;
  }
  return "Full image";
}

function withCurrent(values: string[], current: string) {
  return values.includes(current) ? values : [current, ...values];
}

export function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

export function escapeMarkdown(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/([[\]()*_])/g, "\\$1")
    .replaceAll("\n", " ");
}
