import {
  type BoxSelector,
  createPaintingAnnotationsHelper,
  parseSelector,
  type Vault,
} from "@iiif/helpers";
import {
  createImageServiceRequest,
  getImageServices,
  imageServiceRequestToString,
} from "@iiif/parser/image-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";

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

export function canvasToImageSelector(
  canvas: CanvasNormalized,
  painting: ImagePainting,
  selector?: BoxSelector,
): BoxSelector | undefined {
  if (!selector) return;

  const target =
    box(painting.target?.selector) ||
    ({
      type: "BoxSelector",
      spatial: {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      },
    } as BoxSelector);
  const service = getImageServices(painting.resource)[0];
  const source =
    box(painting.selector) ||
    ({
      type: "BoxSelector",
      spatial: {
        x: 0,
        y: 0,
        width:
          service?.width || painting.resource.width || target.spatial.width,
        height:
          service?.height || painting.resource.height || target.spatial.height,
      },
    } as BoxSelector);

  const left = Math.max(selector.spatial.x, target.spatial.x);
  const top = Math.max(selector.spatial.y, target.spatial.y);
  const right = Math.min(
    selector.spatial.x + selector.spatial.width,
    target.spatial.x + target.spatial.width,
  );
  const bottom = Math.min(
    selector.spatial.y + selector.spatial.height,
    target.spatial.y + target.spatial.height,
  );
  if (
    right <= left ||
    bottom <= top ||
    !target.spatial.width ||
    !target.spatial.height
  ) {
    return;
  }

  const scaleX = source.spatial.width / target.spatial.width;
  const scaleY = source.spatial.height / target.spatial.height;
  return {
    type: "BoxSelector",
    spatial: {
      x: source.spatial.x + (left - target.spatial.x) * scaleX,
      y: source.spatial.y + (top - target.spatial.y) * scaleY,
      width: (right - left) * scaleX,
      height: (bottom - top) * scaleY,
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
    if (!selected || !selector) return;
    const painting = findSelectedPainting(vault, canvas, selected);
    if (!painting) return;
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
    return imageServiceRequestToString(
      {
        ...request,
        region: {
          x: Math.round(selector.spatial.x),
          y: Math.round(selector.spatial.y),
          w: Math.round(selector.spatial.width),
          h: Math.round(selector.spatial.height),
        },
        size: {
          width: size,
          max: false,
          upscaled: false,
          confined: true,
        },
        rotation: { angle: rotation },
      },
      normalizedService,
    );
  } catch {
    return;
  }
}
