/** The text/plain Content State payload used by IIIF Cookbook recipe 0599. */
export interface IIIFDropTarget {
  id: string;
  type: "Manifest" | "Collection" | "Canvas";
  parent?: { id: string; type: "Manifest" };
}

function httpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function parseIIIFDrop(text: string): IIIFDropTarget[] | null {
  try {
    const annotation = JSON.parse(text);
    if (
      annotation?.type !== "Annotation" ||
      ![annotation.motivation].flat().includes("contentState")
    )
      return null;
    const targets = [annotation.target].flat();
    if (!targets.length) return null;
    const result: IIIFDropTarget[] = [];
    for (const target of targets) {
      // Selectors need region-aware insertion; do not silently discard them.
      if (
        !target ||
        target.selector ||
        !httpUrl(target.id) ||
        !["Manifest", "Collection", "Canvas"].includes(target.type) ||
        new URL(target.id).hash
      )
        return null;
      if (target.type === "Canvas") {
        const parent = [target.partOf]
          .flat()
          .find((part) => part?.type === "Manifest" && httpUrl(part.id));
        if (!parent) return null;
        result.push({
          id: target.id,
          type: "Canvas",
          parent: { id: parent.id, type: "Manifest" },
        });
      } else {
        result.push({ id: target.id, type: target.type });
      }
    }
    return result;
  } catch {
    return null;
  }
}

export function dropBrowserHistory(target: IIIFDropTarget) {
  const id = target.parent?.id ?? target.id;
  return {
    initialHistory: [
      {
        url: target.id,
        resource: target.id,
        route:
          target.type === "Canvas"
            ? `/manifest?id=${encodeURIComponent(id)}&canvas=${encodeURIComponent(target.id)}`
            : `/loading?id=${encodeURIComponent(id)}`,
        metadata: { type: target.type },
      },
    ],
    restoreFromLocalStorage: false,
    saveToLocalStorage: false,
  };
}
