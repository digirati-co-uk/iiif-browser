import { getImageServices } from "@atlas-viewer/iiif-image-api";
import type { Vault } from "@iiif/helpers";
import { createPaintingAnnotationsHelper, getValue } from "@iiif/helpers";
import {
  activeEditor$,
  addComposerChild$,
  ButtonWithTooltip,
  Cell,
  imagePlugin,
  insertMarkdown$,
  type RealmPlugin,
  realmPlugin,
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
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";

type ImageQuality = "default" | "color" | "gray" | "bitonal";
type ImageFormat = "jpg" | "png" | "webp" | "tif" | "gif" | "jp2" | "pdf";

export interface IIIFImageOptions {
  actionLabel?: string;
  width?: number;
  height?: number;
  rotation?: number;
  quality?: ImageQuality;
  format?: ImageFormat;
}

export interface CanvasSnippetOptions {
  actionLabel?: string;
}

export interface IIIFBrowserPluginParams {
  /** Every IIIF Browser option except its plugin-owned output actions. */
  browserProps?: Omit<IIIFBrowserProps, "output">;
  /** Configure Image API output, or set to false to hide the image action. */
  image?: false | IIIFImageOptions;
  /** Adds a Markdown image followed by the Canvas label as its caption. */
  canvasSnippet?: boolean | CanvasSnippetOptions;
  dialog?: {
    title?: ReactNode;
    closeLabel?: string;
    className?: string;
    style?: CSSProperties;
    browserClassName?: string;
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
};

type Selection = {
  resource: IIIFSelectedResource | IIIFSelectedResource[];
  vault: Vault;
};

const config$ = Cell<IIIFBrowserPluginParams>({});
const dialogOpen$ = Cell(false);

const plugin = realmPlugin<IIIFBrowserPluginParams>({
  init(realm, params) {
    realm.pub(config$, params ?? {});
    realm.pub(addComposerChild$, IIIFBrowserDialog);
  },
  update(realm, params) {
    realm.pub(config$, params ?? {});
  },
});

/**
 * Adds the IIIF Browser dialog and the image visitors needed for inserted
 * Markdown/MDX image nodes.
 */
export function iiifBrowserPlugin(
  params: IIIFBrowserPluginParams = {},
): RealmPlugin {
  const images = imagePlugin();
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
  children = <span aria-hidden="true">IIIF</span>,
  ...props
}: InsertIIIFBrowserProps) {
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
      {children}
    </ButtonWithTooltip>
  );
}

function IIIFBrowserDialog() {
  const config = useCellValue(config$);
  const activeEditor = useCellValue(activeEditor$);
  const open = useCellValue(dialogOpen$);
  const setOpen = usePublisher(dialogOpen$);
  const insertMarkdown = usePublisher(insertMarkdown$);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const image = config.image === false ? false : (config.image ?? {});
  const [width, setWidth] = useState<number | undefined>(
    image === false ? undefined : image.width,
  );
  const [height, setHeight] = useState<number | undefined>(
    image === false ? undefined : image.height,
  );
  const [rotation, setRotation] = useState(
    image === false ? 0 : (image.rotation ?? 0),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (image === false) return;
    setWidth(image.width);
    setHeight(image.height);
    setRotation(image.rotation ?? 0);
  }, [image]);

  const browserProps = config.browserProps ?? {};
  const output = useMemo(() => {
    const selection = (
      resource: Selection["resource"],
      _parent: unknown,
      vault: Vault,
    ) => ({
      resource,
      vault,
    });
    const insert = (kind: "image" | "canvas") => (value: Selection) => {
      try {
        const resource = one(value.resource);
        const request = {
          width,
          height,
          rotation,
          quality: image === false ? "default" : image.quality,
          format: image === false ? "jpg" : image.format,
        };
        const url = createIIIFImageUrl(resource, value.vault, request);
        const label = resourceLabel(resource, value.vault);
        const markdown =
          kind === "canvas"
            ? `![${escapeMarkdown(label)}](${url})\n\n*${escapeMarkdown(label)}*`
            : `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(label)}" data-iiif-image="true" />`;
        activeEditor?.focus(() => insertMarkdown(markdown), {
          defaultSelection: "rootEnd",
        });
        setError("");
        setOpen(false);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not insert the IIIF image",
        );
      }
    };

    const actions: NonNullable<IIIFBrowserProps["output"]> = [];
    if (image !== false) {
      actions.push({
        type: "callback",
        label: image.actionLabel ?? "Insert image",
        supportedTypes: [
          "Canvas",
          "CanvasRegion",
          "ImageService",
          "ImageServiceRegion",
        ],
        cb: insert("image"),
        format: { type: "custom", format: selection },
      });
    }
    if (config.canvasSnippet) {
      const options = config.canvasSnippet === true ? {} : config.canvasSnippet;
      actions.push({
        type: "callback",
        label: options.actionLabel ?? "Insert Canvas snippet",
        supportedTypes: ["Canvas", "CanvasRegion"],
        cb: insert("canvas"),
        format: { type: "custom", format: selection },
      });
    }
    return actions;
  }, [
    config.canvasSnippet,
    activeEditor,
    height,
    image,
    insertMarkdown,
    rotation,
    setOpen,
    width,
  ]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={
        typeof config.dialog?.title === "string"
          ? config.dialog.title
          : "IIIF Browser"
      }
      className={config.dialog?.className}
      style={{
        width: "min(96vw, 1200px)",
        height: "min(90vh, 850px)",
        maxWidth: "none",
        maxHeight: "none",
        padding: 0,
        border: "1px solid #aaa",
        ...config.dialog?.style,
      }}
      onCancel={() => setOpen(false)}
      onClose={() => setOpen(false)}
    >
      <div
        style={{
          display: "flex",
          height: "100%",
          minHeight: 0,
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #ddd",
          }}
        >
          <strong>{config.dialog?.title ?? "Insert from IIIF"}</strong>
          <button type="button" onClick={() => setOpen(false)}>
            {config.dialog?.closeLabel ?? "Close"}
          </button>
        </header>
        {image !== false ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "0.5rem 1rem",
            }}
          >
            <NumberField label="Width" value={width} setValue={setWidth} />
            <NumberField label="Height" value={height} setValue={setHeight} />
            <NumberField
              label="Rotation"
              value={rotation}
              setValue={(value) => setRotation(value ?? 0)}
              min={0}
            />
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            style={{ color: "#b00020", padding: "0.5rem 1rem" }}
          >
            {error}
          </div>
        ) : null}
        <div
          className={config.dialog?.browserClassName}
          style={{ display: "flex", flex: 1, minHeight: 0 }}
        >
          <IIIFBrowser
            {...browserProps}
            className={browserProps.className ?? "h-full w-full"}
            navigation={{
              canCropImage: true,
              multiSelect: false,
              ...browserProps.navigation,
            }}
            output={output}
          />
        </div>
      </div>
    </dialog>
  );
}

function NumberField({
  label,
  value,
  setValue,
  min = 1,
}: {
  label: string;
  value: number | undefined;
  setValue: (value: number | undefined) => void;
  min?: number;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      {label}
      <input
        type="number"
        min={min}
        value={value ?? ""}
        placeholder={label === "Rotation" ? "0" : "max"}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          setValue(Number.isFinite(next) ? next : undefined);
        }}
        style={{ width: "6rem" }}
      />
    </label>
  );
}

function createIIIFImageUrl(
  resource: IIIFSelectedResource,
  vault: Vault,
  options: Omit<IIIFImageOptions, "actionLabel"> = {},
) {
  const service = imageService(resource, vault);
  const serviceId = service.id.replace(/\/info\.json$/i, "").replace(/\/$/, "");
  const spatial = resource.selector?.spatial;
  const region = spatial
    ? [spatial.x, spatial.y, spatial.width, spatial.height]
        .map(Math.round)
        .join(",")
    : "full";
  const width = positiveInteger(options.width);
  const height = positiveInteger(options.height);
  const size =
    width && height
      ? `!${width},${height}`
      : width
        ? `${width},`
        : height
          ? `,${height}`
          : service.version === 2
            ? "full"
            : "max";
  const rotation = Number.isFinite(options.rotation)
    ? (((options.rotation ?? 0) % 360) + 360) % 360
    : 0;

  return `${serviceId}/${region}/${size}/${rotation}/${options.quality ?? "default"}.${options.format ?? "jpg"}`;
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
  if (!id)
    throw new Error(
      "The selected image does not have an IIIF Image API service",
    );
  return {
    id,
    version: imageServiceVersion(
      service.type || service["@type"],
      service["@context"],
    ),
  };
}

function imageServiceVersion(type?: string, context?: string | string[]) {
  if (type?.endsWith("2")) return 2;
  const contexts = Array.isArray(context) ? context : [context];
  return contexts.some((value) => value?.includes("/image/2/")) ? 2 : 3;
}

function resourceLabel(resource: IIIFSelectedResource, vault: Vault) {
  const label =
    getValue(resource.label) || getValue(vault.get<any>(resource)?.label);
  return label || "IIIF image";
}

function one(resource: Selection["resource"]) {
  if (Array.isArray(resource)) throw new Error("Select a single IIIF resource");
  return resource;
}

function positiveInteger(value?: number) {
  return value && value > 0 ? Math.round(value) : undefined;
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
