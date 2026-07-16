import {
  canonicalServiceUrl,
  getImageServices,
  type RegionParameter,
} from "@atlas-viewer/iiif-image-api";
import "../mdx-plugins.css";
import type { Vault } from "@iiif/helpers";
import { createPaintingAnnotationsHelper, getValue } from "@iiif/helpers";
import {
  activeEditor$,
  ButtonWithTooltip,
  Cell,
  closeImageDialog$,
  createActiveEditorSubscription$,
  type EditingImageDialogState,
  ImageNode,
  type InactiveImageDialogState,
  imageDialogState$,
  imagePlugin,
  insertMarkdown$,
  type NewImageDialogState,
  type RealmPlugin,
  realmPlugin,
  saveImage$,
  useCellValue,
  usePublisher,
} from "@mdxeditor/editor";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal as AriaModal,
  Dialog,
  Heading,
  ModalOverlay,
} from "react-aria-components";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";
import {
  createIIIFRequest,
  fullSizeRequest,
  getImageCapabilities,
  type IIIFImageInfo,
  type IIIFImageRequest,
  imageApiVersion,
  imageRequestUrl,
  imageServiceId,
  parseIIIFImageUrl,
  requestAtWidth,
} from "./image-api";

type ImageQuality = "default" | "color" | "gray" | "bitonal";
type ImageFormat = "jpg" | "png" | "webp" | "tif" | "gif" | "jp2" | "pdf";
type ImageInfoCache = Map<string, Promise<IIIFImageInfo>>;

export interface IIIFImageOptions {
  actionLabel?: string;
  selectLabel?: string;
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
  rotation?: number;
};

type Selection = {
  resource: IIIFSelectedResource | IIIFSelectedResource[];
  vault: Vault;
};

type Draft = {
  request: IIIFImageRequest;
  label: string;
};

const config$ = Cell<IIIFBrowserPluginParams>({});
const dialogOpen$ = Cell(false);
const infoCache$ = Cell<ImageInfoCache>(new Map());

const plugin = realmPlugin<IIIFBrowserPluginParams>({
  init(realm, params) {
    realm.pub(config$, params ?? {});
    realm.pub(infoCache$, new Map());
    realm.pub(createActiveEditorSubscription$, (editor) => {
      const scheduled = new Map<string, string>();
      return editor.registerNodeTransform(ImageNode, (node) => {
        const config = realm.getValue(config$);
        const configuredMultiplier =
          config.image === false
            ? false
            : (config.image?.resizeMultiplier ?? 2);
        const multiplier =
          configuredMultiplier === false
            ? false
            : configuredMultiplier > 0
              ? configuredMultiplier
              : 2;
        const width = node.getWidth();
        const request = parseIIIFImageUrl(node.getSrc());
        if (multiplier === false || typeof width !== "number" || !request) {
          return;
        }

        const key = node.getKey();
        const signature = `${node.getSrc()}|${width}|${multiplier}`;
        if (scheduled.get(key) === signature) return;
        scheduled.set(key, signature);

        const serviceId = imageServiceId(request);
        void loadImageInfo(
          realm.getValue(infoCache$),
          serviceId,
          config.browserProps?.history?.requestInitOptions,
        )
          .then((info) => {
            editor.update(() => {
              const latest = node.getLatest();
              const latestRequest = parseIIIFImageUrl(latest.getSrc());
              const latestWidth = latest.getWidth();
              if (
                !latest.isAttached() ||
                !latestRequest ||
                typeof latestWidth !== "number"
              ) {
                return;
              }
              const capabilities = getImageCapabilities(
                info,
                latestRequest.region,
              );
              if (
                !capabilities.customSize ||
                isListedSize(latestRequest, capabilities.sizes)
              ) {
                return;
              }
              const resized = requestAtWidth(
                latestRequest,
                latestWidth * multiplier,
                capabilities,
              );
              const src = imageRequestUrl(resized, info);
              if (src !== latest.getSrc()) latest.setSrc(src);
            });
          })
          .catch(() => undefined)
          .finally(() => {
            if (scheduled.get(key) === signature) scheduled.delete(key);
          });
      });
    });
  },
  update(realm, params) {
    realm.pub(config$, params ?? {});
  },
});

/** Adds the IIIF Browser dialog and MDXEditor's image support. */
export function iiifBrowserPlugin(
  params: IIIFBrowserPluginParams = {},
): RealmPlugin {
  const images = imagePlugin({ ImageDialog: IIIFBrowserDialog });
  const browser = plugin(params);

  return {
    init(realm) {
      images.init?.(realm);
      browser.init?.(realm);
    },
    postInit(realm) {
      images.postInit?.(realm);
      browser.postInit?.(realm);
    },
    update(realm) {
      images.update?.(realm);
      browser.update?.(realm);
    },
  };
}

export interface InsertIIIFBrowserProps
  extends Omit<ComponentProps<typeof ButtonWithTooltip>, "title"> {
  label?: string;
}

/** Toolbar button used inside MDXEditor's toolbarPlugin contents. */
export function InsertIIIFBrowser({
  label = "Insert IIIF image",
  children,
  ...props
}: InsertIIIFBrowserProps) {
  const config = useCellValue(config$);
  const setOpen = usePublisher(dialogOpen$);

  return (
    <ButtonWithTooltip
      {...props}
      title={label}
      aria-label={label}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
    >
      {children ?? <IIIFPluginLogo icon={config.icon ?? "stack"} />}
    </ButtonWithTooltip>
  );
}

function IIIFBrowserDialog() {
  const config = useCellValue(config$);
  const activeEditor = useCellValue(activeEditor$);
  const insertOpen = useCellValue(dialogOpen$);
  const imageDialog = useCellValue(imageDialogState$);
  const infoCache = useCellValue(infoCache$);
  const setInsertOpen = usePublisher(dialogOpen$);
  const closeImageDialog = usePublisher(closeImageDialog$);
  const insertMarkdown = usePublisher(insertMarkdown$);
  const saveImage = usePublisher(saveImage$);
  const image = config.image === false ? false : (config.image ?? {});
  const [screen, setScreen] = useState<"browser" | "options">("browser");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const wasInsertOpen = useRef(false);
  const editingValues =
    imageDialog.type === "editing" ? imageDialog.initialValues : null;
  const editingSource = editingValues?.src;
  const editingRequest = useMemo(
    () => (editingSource ? parseIIIFImageUrl(editingSource) : null),
    [editingSource],
  );
  const isGenericImageDialog =
    imageDialog.type !== "inactive" && !editingRequest;
  const open = insertOpen || imageDialog.type !== "inactive";

  useEffect(() => {
    if (
      insertOpen &&
      !wasInsertOpen.current &&
      imageDialog.type === "inactive"
    ) {
      setScreen("browser");
      setDraft(null);
      setError("");
    }
    wasInsertOpen.current = insertOpen;
  }, [imageDialog.type, insertOpen]);

  useEffect(() => {
    if (!editingRequest || !editingValues) return;
    setInsertOpen(false);
    setDraft({
      request: editingRequest,
      label: editingValues.altText ?? "IIIF image",
    });
    setScreen("options");
    setError("");
  }, [editingRequest, editingValues, setInsertOpen]);

  const close = () => {
    setInsertOpen(false);
    if (imageDialog.type !== "inactive") closeImageDialog();
    setScreen("browser");
    setDraft(null);
    setError("");
  };

  const browserProps = config.browserProps ?? {};
  const output = useMemo(() => {
    const selection = (
      resource: Selection["resource"],
      _parent: unknown,
      vault: Vault,
    ) => ({ resource, vault });
    const select = (value: Selection) => {
      try {
        const resource = one(value.resource);
        const service = imageService(resource, value.vault);
        const spatial = resource.selector?.spatial;
        const region: RegionParameter = spatial
          ? {
              x: Math.round(spatial.x),
              y: Math.round(spatial.y),
              w: Math.round(spatial.width),
              h: Math.round(spatial.height),
            }
          : { full: true };
        const options = image === false ? {} : image;
        setDraft({
          request: createIIIFRequest(service.id, service.version, region, {
            width: options.width,
            height: options.height,
            rotation: resource.rotation ?? options.rotation,
            quality: options.quality,
            format: options.format,
          }),
          label: resourceLabel(resource, value.vault),
        });
        setScreen("options");
        setError("");
      } catch (caught) {
        setError(errorMessage(caught, "Could not use the selected image"));
      }
    };
    const supportedTypes =
      image === false
        ? (["Canvas", "CanvasRegion"] as const)
        : ([
            "Canvas",
            "CanvasRegion",
            "ImageService",
            "ImageServiceRegion",
          ] as const);
    return [
      {
        type: "callback" as const,
        label: image === false ? "Continue" : (image.selectLabel ?? "Continue"),
        supportedTypes: [...supportedTypes],
        cb: select,
        format: { type: "custom" as const, format: selection },
      },
    ];
  }, [image]);

  const confirm = (kind: "image" | "canvas", resolvedUrl?: string) => {
    if (!draft) return;
    try {
      const url = resolvedUrl ?? imageRequestUrl(draft.request, null);
      if (editingValues) {
        saveImage({ ...editingValues, src: url, altText: draft.label });
        close();
        return;
      }
      const markdown =
        kind === "canvas"
          ? `![${escapeMarkdown(draft.label)}](${url})\n\n*${escapeMarkdown(draft.label)}*`
          : `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(draft.label)}" data-iiif-image="true" />`;
      activeEditor?.focus(() => insertMarkdown(markdown), {
        defaultSelection: "rootEnd",
      });
      close();
    } catch (caught) {
      setError(errorMessage(caught, "Could not save the IIIF image"));
    }
  };

  const title = isGenericImageDialog
    ? imageDialog.type === "editing"
      ? "Edit image"
      : "Insert image"
    : editingRequest
      ? "Edit IIIF image"
      : screen === "options"
        ? (config.dialog?.optionsTitle ?? "Image options")
        : (config.dialog?.title ?? "Insert from IIIF");

  return (
    <ModalOverlay
      isOpen={open}
      isDismissable
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      className="iiif-browser-mdx-overlay"
    >
      <AriaModal
        className={classNames(
          "iiif-browser-mdx-modal",
          config.dialog?.className,
        )}
        style={config.dialog?.style}
      >
        <Dialog className="iiif-browser-mdx-dialog">
          <header className="iiif-browser-mdx-header">
            {!editingRequest &&
            !isGenericImageDialog &&
            screen === "options" ? (
              <button
                type="button"
                className="iiif-browser-mdx-back"
                onClick={() => setScreen("browser")}
              >
                <span aria-hidden="true">←</span> Back
              </button>
            ) : null}
            <Heading slot="title" className="iiif-browser-mdx-title">
              {title}
            </Heading>
            <button
              type="button"
              className="iiif-browser-mdx-close"
              onClick={close}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
              <span className="iiif-browser-mdx-sr-only">
                {config.dialog?.closeLabel ?? "Close"}
              </span>
            </button>
          </header>

          {error ? (
            <div className="iiif-browser-mdx-alert" role="alert">
              {error}
            </div>
          ) : null}

          {isGenericImageDialog ? (
            <GenericImageForm
              state={imageDialog}
              onCancel={close}
              onSave={(values) => {
                saveImage(values);
                close();
              }}
            />
          ) : screen === "browser" ? (
            <div
              className={classNames(
                "iiif-browser-mdx-browser iiif-browser",
                config.dialog?.browserClassName,
              )}
            >
              <IIIFBrowser
                {...browserProps}
                className={
                  browserProps.className ??
                  "h-full w-full border-none border-t rounded-none"
                }
                navigation={{
                  canCropImage: true,
                  multiSelect: false,
                  ...browserProps.navigation,
                }}
                output={output}
              />
            </div>
          ) : draft ? (
            <ImageOptions
              draft={draft}
              setDraft={setDraft}
              cache={infoCache}
              requestInit={browserProps.history?.requestInitOptions}
              className={config.dialog?.optionsClassName}
              onCancel={close}
              imageAction={
                editingRequest
                  ? {
                      label: "Save changes",
                      onClick: (url) => confirm("image", url),
                    }
                  : image === false
                    ? null
                    : {
                        label: image.actionLabel ?? "Insert image",
                        onClick: (url) => confirm("image", url),
                      }
              }
              canvasAction={
                !editingRequest && config.canvasSnippet
                  ? {
                      label:
                        config.canvasSnippet === true
                          ? "Insert Canvas snippet"
                          : (config.canvasSnippet.actionLabel ??
                            "Insert Canvas snippet"),
                      onClick: (url) => confirm("canvas", url),
                    }
                  : null
              }
            />
          ) : null}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}

function ImageOptions({
  draft,
  setDraft,
  cache,
  requestInit,
  className,
  onCancel,
  imageAction,
  canvasAction,
}: {
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
          <img src={previewUrl} alt="" />
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
            disabled={invalidCrop}
            onClick={() => canvasAction.onClick(outputUrl)}
          >
            {canvasAction.label}
          </button>
        ) : null}
        {imageAction ? (
          <button
            type="button"
            className="iiif-browser-mdx-primary"
            disabled={invalidCrop}
            onClick={() => imageAction.onClick(outputUrl)}
          >
            {imageAction.label}
          </button>
        ) : null}
      </footer>
    </>
  );
}

function GenericImageForm({
  state,
  onCancel,
  onSave,
}: {
  state:
    | EditingImageDialogState
    | InactiveImageDialogState
    | NewImageDialogState;
  onCancel: () => void;
  onSave: (values: {
    src?: string;
    altText?: string;
    title?: string;
    width?: number;
    height?: number;
  }) => void;
}) {
  const initial = state.type === "editing" ? state.initialValues : {};
  const [src, setSrc] = useState(initial.src ?? "");
  const [altText, setAltText] = useState(initial.altText ?? "");
  const [title, setTitle] = useState(initial.title ?? "");

  useEffect(() => {
    setSrc(initial.src ?? "");
    setAltText(initial.altText ?? "");
    setTitle(initial.title ?? "");
  }, [initial.src, initial.altText, initial.title]);

  return (
    <>
      <div className="iiif-browser-mdx-generic-form">
        <label className="iiif-browser-mdx-field">
          <span>Image URL</span>
          <input
            type="url"
            value={src}
            onChange={(event) => setSrc(event.currentTarget.value)}
          />
        </label>
        <label className="iiif-browser-mdx-field">
          <span>Alternative text</span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.currentTarget.value)}
          />
        </label>
        <label className="iiif-browser-mdx-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
      </div>
      <footer className="iiif-browser-mdx-footer">
        <button
          type="button"
          className="iiif-browser-mdx-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="iiif-browser-mdx-primary"
          disabled={!src}
          onClick={() => onSave({ ...initial, src, altText, title })}
        >
          Save image
        </button>
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

function loadImageInfo(
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

function imageService(resource: IIIFSelectedResource, vault: Vault) {
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
  const paintable =
    createPaintingAnnotationsHelper(vault).getPaintables(canvas).items[0];
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

function resourceLabel(resource: IIIFSelectedResource, vault: Vault) {
  return (
    getValue(resource.label) ||
    getValue(vault.get<any>(resource)?.label) ||
    "IIIF image"
  );
}

function one(resource: Selection["resource"]) {
  if (Array.isArray(resource)) throw new Error("Select a single IIIF resource");
  return resource;
}

function isListedSize(
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

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeMarkdown(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/([[\]()*_])/g, "\\$1")
    .replaceAll("\n", " ");
}
