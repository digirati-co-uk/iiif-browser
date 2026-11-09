import type { NotebookResource } from "./resources";
import type { NotebookStore } from "./store";

type OpenResource = (resource: NotebookResource) => void;
const browsers = new WeakMap<
  NotebookStore,
  Map<symbol, { open: OpenResource; projectId?: string }>
>();
export function registerNotebookBrowser(
  store: NotebookStore,
  open: OpenResource,
  projectId?: string,
) {
  const key = Symbol();
  const entries = browsers.get(store) ?? new Map();
  browsers.set(store, entries);
  entries.set(key, { open, projectId });
  return () => {
    entries.delete(key);
  };
}
export function openNotebookResource(
  store: NotebookStore,
  resource: NotebookResource,
  projectId?: string,
) {
  const open = Array.from(browsers.get(store)?.values() ?? [])
    .filter((entry) => entry.projectId === projectId)
    .at(-1)?.open;
  if (!open) return false;
  open(resource);
  return true;
}
export function notebookResourceHistory(resource: NotebookResource) {
  const target =
    resource.type === "ContentState"
      ? (resource.targets?.[0] ?? resource)
      : resource;
  const params = new URLSearchParams({ id: target.parent?.id ?? target.id });
  if (target.type === "Canvas") params.set("canvas", target.id);
  if (target.xywh) params.set("xywh", target.xywh);
  return {
    initialHistory: [
      {
        url: target.id,
        resource: null,
        route: `/loading?${params}`,
        parent: target.parent,
      },
    ],
    restoreFromLocalStorage: false,
    saveToLocalStorage: false,
  };
}
