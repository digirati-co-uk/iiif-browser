import { createThumbnailHelper, getValue, Vault } from "@iiif/helpers";
import { imageService } from "../editor/image-options";
import { contentStateFormat } from "../formats/content-state";
import { createIIIFRequest, imageRequestUrl } from "../mdxeditor/image-api";
import type { SelectedItem } from "../stores/output-store";
import {
  canvasToImageSelector,
  findSelectedPainting,
} from "../utilities/painting-selection";
import { isNotebookUrl, type NotebookResource } from "./resources";

/** The picker keeps the browser's selected painting and Canvas/Image coordinate mapping. */
export async function notebookSelection(
  resource: SelectedItem,
  vault: Vault,
  mode: "link" | "image" | "crop" = "link",
): Promise<NotebookResource> {
  const value = vault.get<any>(resource, { skipSelfReturn: false });
  const parent =
    resource.parent?.type === "Manifest"
      ? { id: resource.parent.id, type: "Manifest" as const }
      : undefined;
  const label =
    getValue(resource.parent?.label) ||
    (parent && getValue(vault.get<any>(parent)?.label)) ||
    getValue(resource.label) ||
    getValue(value?.label) ||
    resource.type;
  if (!isNotebookUrl(resource.id)) throw new Error("Invalid IIIF resource URL");
  let thumbnail = resource.thumbnail;
  try {
    if (mode === "link" && !resource.type.startsWith("ImageService"))
      thumbnail ||= (
        await createThumbnailHelper(vault).getBestThumbnailAtSize(
          resource as any,
          { width: 640, height: 400 },
        )
      ).best?.id;
  } catch {
    /* A label remains usable without an image. */
  }
  if (mode === "image" || resource.type.startsWith("ImageService")) {
    const service = imageService(resource, vault);
    if (!isNotebookUrl(service.id))
      throw new Error("Invalid Image service URL");
    const crop =
      mode === "crop"
        ? (resource.imageSelector?.spatial ?? resource.selector?.spatial)
        : undefined;
    const image = imageRequestUrl(
      createIIIFRequest(
        service.id,
        service.version,
        crop
          ? {
              x: Math.round(crop.x),
              y: Math.round(crop.y),
              w: Math.round(crop.width),
              h: Math.round(crop.height),
            }
          : { full: true },
        {
          width: Math.max(1, Math.min(640, crop?.width ?? value?.width ?? 640)),
          rotation: resource.rotation,
        },
      ),
    );
    const info = new URL(service.id);
    info.pathname = `${info.pathname.replace(/\/$/, "")}/info.json`;
    return {
      id: service.id,
      source: crop ? image : info.toString(),
      ...(crop
        ? { xywh: [crop.x, crop.y, crop.width, crop.height].join(",") }
        : {}),
      type: "ImageService",
      label,
      image,
      thumbnail: image,
    };
  }
  const target: NotebookResource = {
    id: resource.id,
    source: resource.id,
    type: resource.type as NotebookResource["type"],
    label,
    thumbnail,
    parent,
  };
  if (mode !== "crop") return target;
  if (resource.type !== "Canvas" || !parent || !resource.selector?.spatial)
    throw new Error("Select a Canvas region to insert a crop");
  const contentState = JSON.parse(
    (await contentStateFormat.format(
      resource as any,
      { type: "content-state" },
      vault,
    )) as string,
  );
  const source = JSON.stringify(contentState);
  const spatial = resource.selector.spatial;
  target.xywh = [spatial.x, spatial.y, spatial.width, spatial.height].join(",");
  const painting = findSelectedPainting(
    vault,
    value,
    resource.selectedPainting,
  );
  const region =
    resource.imageSelector?.spatial ||
    (painting &&
      canvasToImageSelector(value, painting, resource.selector)?.spatial);
  if (!region) throw new Error("Choose an image for this crop");
  const service = imageService(resource, vault);
  if (!isNotebookUrl(service.id)) throw new Error("Invalid Image service URL");
  target.image = imageRequestUrl(
    createIIIFRequest(
      service.id,
      service.version,
      {
        x: Math.round(region.x),
        y: Math.round(region.y),
        w: Math.round(region.width),
        h: Math.round(region.height),
      },
      {
        width: Math.max(1, Math.min(640, Math.round(region.width))),
        rotation: resource.rotation,
      },
    ),
  );
  target.thumbnail = target.image;
  return {
    id: source,
    source,
    type: "ContentState",
    label,
    contentState,
    targets: [target],
    image: target.image,
    thumbnail: target.image,
  };
}
