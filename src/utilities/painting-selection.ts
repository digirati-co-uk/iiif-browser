import {
  type BoxSelector,
  createPaintingAnnotationsHelper,
  parseSelector,
  type Vault,
} from "@iiif/helpers";
import {
  createImageServiceRequest,
  getImageServices,
  parseRegionParameter,
} from "@iiif/parser/image-3";
import { imageRequestUrl, parseIIIFImageUrl } from "../mdxeditor/image-api";
import type { CanvasNormalized } from "@iiif/parser/presentation-3-normalized/types";

export type SelectedPainting = {
  id: string;
  type: "Image";
  annotationId: string;
  choice?: true;
  service?: {
    id: string;
    type: string;
  };
};

type Painting = ReturnType<
  ReturnType<typeof createPaintingAnnotationsHelper>["getPaintables"]
>["items"][number];
type ImagePainting = Omit<Painting, "resource"> & {
  resource: {
    id: string;
    type: "Image";
    width?: number;
    height?: number;
    label?: any;
    service?: any[];
  };
};

function imageServiceType(service: any) {
  if (service.type || service["@type"]) {
    return service.type || service["@type"];
  }
  const metadata = [
    ...(Array.isArray(service["@context"])
      ? service["@context"]
      : [service["@context"]]),
    ...(Array.isArray(service.profile) ? service.profile : [service.profile]),
  ].filter(Boolean);
  if (metadata.some((value) => String(value).includes("/image/1/"))) {
    return "ImageService1";
  }
  if (metadata.some((value) => String(value).includes("/image/2/"))) {
    return "ImageService2";
  }
  return "ImageService3";
}

export function getImagePaintings(
  vault: Vault,
  canvas: CanvasNormalized,
  enabledChoices?: string[],
) {
  return createPaintingAnnotationsHelper(vault)
    .getPaintables(canvas, enabledChoices)
    .items.filter(
      (item) => item.type === "image" && item.resource.type === "Image",
    ) as ImagePainting[];
}

export function paintingReference(
  painting: ImagePainting,
  choice = false,
): SelectedPainting {
  const service = getImageServices(painting.resource)[0];
  const serviceId = service?.id || (service?.["@id"] as string | undefined);
  return {
    id: painting.resource.id,
    type: "Image",
    annotationId: painting.annotationId,
    ...(choice ? { choice: true as const } : {}),
    ...(service && serviceId
      ? {
          service: {
            id: serviceId,
            type: imageServiceType(service),
          },
        }
      : {}),
  };
}

export function findSelectedPainting(
  vault: Vault,
  canvas: CanvasNormalized,
  selected?: SelectedPainting,
) {
  const paintings = getImagePaintings(
    vault,
    canvas,
    selected ? [selected.id] : undefined,
  );
  if (!selected) {
    return paintings.length === 1 ? paintings[0] : undefined;
  }
  return paintings.find(
    (painting) =>
      painting.annotationId === selected.annotationId &&
      painting.resource.id === selected.id,
  );
}

export function selectedPaintingFromId(
  vault: Vault,
  canvas: CanvasNormalized,
  id?: string | null,
) {
  if (!id) return;
  const painting = getImagePaintings(vault, canvas, [id]).find(
    (candidate) => candidate.resource.id === id,
  );
  return painting ? paintingReference(painting, true) : undefined;
}

export function defaultSelectedPainting(
  vault: Vault,
  canvas: CanvasNormalized,
) {
  const painting = findSelectedPainting(vault, canvas);
  const choice = createPaintingAnnotationsHelper(vault).extractChoices(canvas);
  return painting ? paintingReference(painting, Boolean(choice)) : undefined;
}

function box(selector: any): BoxSelector | undefined {
  if (!selector) return;
  if (selector.type === "BoxSelector") return selector;
  const parsed = parseSelector(selector).selector;
  return parsed?.type === "BoxSelector" ? parsed : undefined;
}

function paintingImageTransform(painting: ImagePainting) {
  const service = getImageServices(painting.resource)[0];
  const serviceId = (
    service?.id || (service?.["@id"] as string | undefined)
  )?.replace(/(?:\/info\.json)?\/$|\/info\.json$/, "");
  const request =
    serviceId && painting.resource.id.startsWith(`${serviceId}/`)
      ? parseIIIFImageUrl(painting.resource.id)
      : null;
  const selector = painting.selector as {
    type?: string;
    region?: string;
    rotation?: string | number;
  } | null;
  const imageSelector =
    selector?.type === "ImageApiSelector" ||
    selector?.type === "iiif:ImageApiSelector"
      ? selector
      : null;
  const angle = Number(
    String(selector?.rotation ?? request?.rotation.angle ?? 0).replace(
      /^!/,
      "",
    ),
  );
  return {
    width: service?.width || painting.resource.width,
    height: service?.height || painting.resource.height,
    region:
      typeof imageSelector?.region === "string"
        ? parseRegionParameter(imageSelector.region)
        : request?.region,
    angle: Number.isFinite(angle) ? ((angle % 360) + 360) % 360 : 0,
  };
}

export function paintingImageRotation(painting: ImagePainting, rotation = 0) {
  return (
    (((paintingImageTransform(painting).angle + rotation) % 360) + 360) % 360
  );
}

function pixelBox(
  spatial: BoxSelector["spatial"],
  width: number,
  height: number,
) {
  return spatial.unit === "percent"
    ? {
        x: (spatial.x * width) / 100,
        y: (spatial.y * height) / 100,
        width: (spatial.width * width) / 100,
        height: (spatial.height * height) / 100,
      }
    : spatial;
}

export function canvasToImageSelector(
  canvas: CanvasNormalized,
  painting: ImagePainting,
  selector?: BoxSelector,
): BoxSelector | undefined {
  const target = pixelBox(
    box(painting.target?.selector)?.spatial ?? {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    canvas.width,
    canvas.height,
  );
  const { width, height, region, angle } = paintingImageTransform(painting);
  const fullWidth = width || target.width;
  const fullHeight = height || target.height;
  let source = box(painting.selector)?.spatial;
  if (region?.square) {
    const side = Math.min(fullWidth, fullHeight);
    source = {
      x: (fullWidth - side) / 2,
      y: (fullHeight - side) / 2,
      width: side,
      height: side,
    };
  } else if (
    region?.w &&
    region.h &&
    Number.isFinite(region.x) &&
    Number.isFinite(region.y)
  ) {
    const scaleX = region.percent ? fullWidth / 100 : 1;
    const scaleY = region.percent ? fullHeight / 100 : 1;
    source = {
      x: region.x! * scaleX,
      y: region.y! * scaleY,
      width: region.w * scaleX,
      height: region.h * scaleY,
    };
  }
  if (source) source = pixelBox(source, fullWidth, fullHeight);
  if (!selector)
    return source ? { type: "BoxSelector", spatial: source } : undefined;
  source ??= { x: 0, y: 0, width: fullWidth, height: fullHeight };
  const selection = pixelBox(selector.spatial, canvas.width, canvas.height);

  const left = Math.max(selection.x, target.x);
  const top = Math.max(selection.y, target.y);
  const right = Math.min(
    selection.x + selection.width,
    target.x + target.width,
  );
  const bottom = Math.min(
    selection.y + selection.height,
    target.y + target.height,
  );
  if (right <= left || bottom <= top || !target.width || !target.height) {
    return;
  }

  const radians = (angle * Math.PI) / 180;
  const cos =
    angle % 90 === 0 ? Math.round(Math.cos(radians)) : Math.cos(radians);
  const sin =
    angle % 90 === 0 ? Math.round(Math.sin(radians)) : Math.sin(radians);
  const rotatedWidth =
    Math.abs(cos) * source.width + Math.abs(sin) * source.height;
  const rotatedHeight =
    Math.abs(sin) * source.width + Math.abs(cos) * source.height;
  // Undo the painting rotation about its centre after removing the Canvas offset and scale.
  const corners = [left, right].flatMap((x) =>
    [top, bottom].map((y) => {
      const dx =
        ((x - target.x) * rotatedWidth) / target.width - rotatedWidth / 2;
      const dy =
        ((y - target.y) * rotatedHeight) / target.height - rotatedHeight / 2;
      return {
        x: cos * dx + sin * dy + source.width / 2,
        y: -sin * dx + cos * dy + source.height / 2,
      };
    }),
  );
  const x = Math.max(0, Math.min(...corners.map((corner) => corner.x)));
  const y = Math.max(0, Math.min(...corners.map((corner) => corner.y)));
  const endX = Math.min(
    source.width,
    Math.max(...corners.map((corner) => corner.x)),
  );
  const endY = Math.min(
    source.height,
    Math.max(...corners.map((corner) => corner.y)),
  );
  if (endX <= x || endY <= y) return;
  return {
    type: "BoxSelector",
    spatial: {
      x: source.x + x,
      y: source.y + y,
      width: endX - x,
      height: endY - y,
    },
  };
}

export function selectedPaintingThumbnail(
  vault: Vault,
  canvas: CanvasNormalized,
  selected: SelectedPainting | undefined,
  selector: BoxSelector | undefined,
  rotation = 0,
  size = 120,
) {
  try {
    if (!selected) return;
    const painting = findSelectedPainting(vault, canvas, selected);
    if (!painting) return;
    selector ??= canvasToImageSelector(canvas, painting);
    rotation = paintingImageRotation(painting, rotation);
    if (!selector && !rotation) return;
    const service = getImageServices(painting.resource)[0];
    const id = service?.id || (service?.["@id"] as string | undefined);
    if (!service || !id) return;
    const normalizedService = {
      ...service,
      id,
      type: imageServiceType(service),
    };
    const request = createImageServiceRequest(normalizedService);
    if (request.type !== "image") return;
    return imageRequestUrl({
      ...request,
      region: selector
        ? {
            x: Math.round(selector.spatial.x),
            y: Math.round(selector.spatial.y),
            w: Math.round(selector.spatial.width),
            h: Math.round(selector.spatial.height),
          }
        : { full: true },
      size: {
        width: Math.min(size, selector?.spatial.width || service.width || size),
        height: Math.min(
          size,
          selector?.spatial.height || service.height || size,
        ),
        max: false,
        upscaled: false,
        confined: true,
        version: normalizedService.type === "ImageService3" ? 3 : 2,
      },
      rotation: { angle: rotation },
    });
  } catch {
    return;
  }
}
