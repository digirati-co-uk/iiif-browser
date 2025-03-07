import mitt, { type Emitter } from "mitt";
import type { HistoryItem } from "./stores/browser-store";

export type BrowserEvents = {
  "history.change": { item: HistoryItem; source: string };
  "collection.change": { id: string; type: string } | null;
  "resource.change": { id: string; type: string } | null;
  "manifest.change": { id: string; type: string } | null;
  "search.index-start": undefined;
  "search.index-complete": undefined;
  "history.page": { url: string; route: string };
};

export type BrowserEmitter = Emitter<BrowserEvents>;

export function createEmitter() {
  const emitter = mitt<BrowserEvents>();
  emitter.on("*", (e, t) =>
    console.log(
      `%c${e}`,
      "background: seagreen;color:white;padding:2px 8px;",
      t,
    ),
  );
  return emitter;
}
