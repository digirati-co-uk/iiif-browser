import {
  dropBrowserHistory,
  type IIIFDropTarget,
} from "../editor/content-state";
import {
  classNames,
  type Draft,
  errorMessage,
  escapeAttribute,
  escapeMarkdown,
  type IIIFBrowserPluginParams,
  type ImageInfoCache,
  ImageOptions,
  imageService,
  initialEditorImageSize,
  isListedSize,
  loadImageInfo,
  one,
  resourceLabel,
  type Selection,
} from "../editor/image-options";
import { registerIIIFDrop } from "../editor/mdx-drop";

export type {
  CanvasSnippetOptions,
  IIIFBrowserPluginParams,
  IIIFImageOptions,
  IIIFSelectedResource,
} from "../editor/image-options";

import type { RegionParameter } from "@atlas-viewer/iiif-image-api";
import "../mdx-plugins.css";
import type { Vault } from "@iiif/helpers";
import {
  activeEditor$,
  ButtonWithTooltip,
  Cell,
  closeImageDialog$,
  createActiveEditorSubscription$,
  disableImageResize$,
  type EditingImageDialogState,
  ImageNode,
  type InactiveImageDialogState,
  imageDialogState$,
  imagePlugin,
  insertMarkdown$,
  type NewImageDialogState,
  type RealmPlugin,
  readOnly$,
  realmPlugin,
  saveImage$,
  useCellValue,
  usePublisher,
} from "@mdxeditor/editor";
import {
  type ComponentProps,
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
import { IIIFBrowser } from "../IIIFBrowser";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";
import {
  createIIIFRequest,
  getImageCapabilities,
  imageRequestUrl,
  imageServiceId,
  parseIIIFImageUrl,
  requestAtWidth,
} from "./image-api";

const config$ = Cell<IIIFBrowserPluginParams>({});
const dropTarget$ = Cell<IIIFDropTarget | null>(null);
const dialogOpen$ = Cell(false);
const infoCache$ = Cell<ImageInfoCache>(new Map());

const plugin = realmPlugin<IIIFBrowserPluginParams>({
  init(realm, params) {
    realm.pub(config$, params ?? {});
    realm.pub(infoCache$, new Map());
    realm.link(readOnly$, disableImageResize$);
    realm.pub(disableImageResize$, realm.getValue(readOnly$));
    realm.pub(createActiveEditorSubscription$, (editor) =>
      registerIIIFDrop(editor, (targets) => {
        if (targets.length !== 1) return false;
        realm.pub(dropTarget$, targets[0]);
        realm.pub(dialogOpen$, true);
        return true;
      }),
    );
    realm.pub(createActiveEditorSubscription$, (editor) => {
      const scheduled = new Map<string, string>();
      return editor.registerNodeTransform(ImageNode, (node) => {
        if (!editor.isEditable()) return;
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
                !editor.isEditable() ||
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
    realm.pub(disableImageResize$, realm.getValue(readOnly$));
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
  const setDropTarget = usePublisher(dropTarget$);

  return (
    <ButtonWithTooltip
      {...props}
      title={label}
      aria-label={label}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          setDropTarget(null);
          setOpen(true);
        }
      }}
    >
      {children ?? <IIIFPluginLogo icon={config.icon ?? "stack"} />}
    </ButtonWithTooltip>
  );
}

function IIIFBrowserDialog() {
  const config = useCellValue(config$);
  const dropTarget = useCellValue(dropTarget$);
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
        const spatial =
          resource.imageSelector?.spatial || resource.selector?.spatial;
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
            ...initialEditorImageSize(options, activeEditor?.getRootElement()),
            rotation: resource.rotation ?? options.rotation,
            quality: options.quality,
            format: options.format,
          }),
          label: resourceLabel(resource, value.vault),
          autoSize: !options.width && !options.height,
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
  }, [image, activeEditor]);

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
                history={
                  dropTarget
                    ? {
                        ...browserProps.history,
                        ...dropBrowserHistory(dropTarget),
                      }
                    : browserProps.history
                }
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
              key={imageServiceId(draft.request)}
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
