import { Vault } from "@iiif/helpers";
import { upgrade } from "@iiif/parser/upgrader";
import type { SelectedItem } from "../stores/output-store";
import { notebookSelection } from "./selection";
import {
  isNotebookUrl,
  type NotebookResolverOptions,
  type NotebookResource,
} from "./resources";

/** Resolve region imagery for pasted Content States, retaining their original payload. */
export async function enrichNotebookCrops(
  resource: NotebookResource,
  options: NotebookResolverOptions = {},
  vault = new Vault(),
): Promise<NotebookResource> {
  if (
    resource.type !== "ContentState" ||
    !resource.targets?.some((target) => target.xywh && !target.image)
  )
    return resource;
  const manifests = new Map<string, Promise<void>>();
  const targets = await Promise.all(
    resource.targets.map(async (target) => {
      if (!target.xywh || target.image || !target.parent) return target;
      const id = target.parent.id;
      if (!manifests.has(id))
        manifests.set(
          id,
          (async () => {
            if (vault.get<any>(id)?.items?.length) return;
            const url = options.beforeFetchUrl
              ? await options.beforeFetchUrl(id)
              : id;
            if (!isNotebookUrl(url)) throw new Error("Invalid Manifest URL");
            const response = await fetch(url, options.requestInitOptions);
            if (!response.ok)
              throw new Error(`Manifest returned HTTP ${response.status}`);
            let manifest = upgrade(await response.json());
            if (manifest?.type !== "Manifest")
              throw new Error("Crop requires a Manifest");
            if (options.preprocessManifest)
              manifest = await options.preprocessManifest(manifest);
            vault.loadSync(id, manifest);
          })(),
        );
      await manifests.get(id);
      const canvas = vault.get<any>(target.id);
      const percent = target.xywh.startsWith("pct:");
      const values = target.xywh.replace(/^pct:/, "").split(",").map(Number);
      if (
        values.length !== 4 ||
        !values.every(Number.isFinite) ||
        values[0] < 0 ||
        values[1] < 0 ||
        values[2] <= 0 ||
        values[3] <= 0
      )
        throw new Error("Invalid crop region");
      const [x, y, width, height] = values.map((value, index) =>
        percent
          ? (value * (index % 2 ? canvas.height : canvas.width)) / 100
          : value,
      );
      const selected: SelectedItem = {
        id: target.id,
        type: "Canvas",
        parent: target.parent,
        selector: { type: "BoxSelector", spatial: { x, y, width, height } },
      };
      const preview = await notebookSelection(selected, vault, "crop");
      return {
        ...target,
        label: target.label === target.type ? preview.label : target.label,
        image: preview.image,
        thumbnail: preview.thumbnail,
      };
    }),
  );
  const crop = targets.find((target) => target.xywh && target.image);
  return {
    ...resource,
    targets,
    ...(crop
      ? {
          label: resource.label.startsWith("Content State")
            ? crop.label
            : resource.label,
          image: crop.image,
          thumbnail: crop.thumbnail,
        }
      : {}),
  };
}
