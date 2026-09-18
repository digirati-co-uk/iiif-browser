import type { Collection } from "@iiif/presentation-3";
import type { Vault } from "@iiif/helpers";
import { noteResources } from "./resources";
import type { NotebookNote } from "./store";

export function noteUrl(id?: string, collection = false) {
  const params = new URLSearchParams();
  if (id) params.set("note", id);
  if (collection) params.set("view", "collection");
  return `iiif://notes${params.size ? `?${params}` : ""}`;
}

/** Local IIIF collections reference the original resources; no copies are fetched. */
export function notebookCollection(notes: NotebookNote[]): Collection {
  return {
    id: noteUrl(undefined, true),
    type: "Collection",
    label: { en: ["Your notes"] },
    items: notes.map((note) => {
      const items = new Map<string, any>();
      for (const source of noteResources(note.content)) {
        for (const resource of source.type === "ContentState"
          ? (source.targets ?? [])
          : [source]) {
          const target =
            resource.type === "Canvas" ? resource.parent : resource;
          if (
            !target ||
            (target.type !== "Manifest" && target.type !== "Collection") ||
            items.has(target.id)
          )
            continue;
          items.set(target.id, {
            id: target.id,
            type: target.type,
            label: { none: [resource.label] },
            ...(resource.thumbnail
              ? { thumbnail: [{ id: resource.thumbnail, type: "Image" }] }
              : {}),
          });
        }
      }
      return {
        id: noteUrl(note.id, true),
        type: "Collection",
        label: { none: [note.title || "Untitled note"] },
        items: [...items.values()],
      };
    }),
  };
}

export function loadNotebookCollection(vault: Vault, collection: Collection) {
  vault.loadSync(collection.id, collection);
  // Vault imports merge arrays. Replace local membership so deletions and renames remain live.
  vault.batch(() => {
    for (const item of [collection, ...(collection.items ?? [])]) {
      if (item.type !== "Collection") continue;
      vault.modifyEntityField(item, "label", item.label);
      vault.modifyEntityField(
        item,
        "items",
        item.items.map(({ id, type }) => ({ id, type })),
      );
    }
  });
}
