import type { Vault } from "@iiif/helpers";

/** Canvas identifiers often cannot be fetched independently of their Manifest. */
export function findCanvasParent(
  id: string,
  vault?: Vault,
): { id: string; type: "Manifest" } | undefined {
  if (!vault) return;
  const canvas = vault.get<any>(id);
  const parent =
    canvas?.type === "Canvas" &&
    canvas.partOf?.find((part: any) => part.type === "Manifest");
  if (parent) return { id: parent.id, type: "Manifest" };
  const manifest = Object.values(vault.getState().iiif.entities.Manifest).find(
    (item) => item.items?.some((canvas) => canvas.id === id),
  );
  return manifest ? { id: manifest.id, type: "Manifest" } : undefined;
}
