import type { InternationalString } from "@iiif/presentation-3";
import mitt, { type Emitter } from "mitt";
import type { BoxSelector } from "react-iiif-vault";
import type { HistoryItem } from "./stores/browser-store";

export type BrowserEvents = {
  ready: undefined;
  "history.change": { item: HistoryItem; source: string };
  "collection.change": {
    id: string;
    type: string;
    label?: InternationalString;
  } | null;
  "resource.change": { id: string; type: string } | null;
  "manifest.change": {
    id: string;
    type: string;
    label?: InternationalString;
  } | null;
  "canvas.change": {
    id: string;
    type: string;
    label?: InternationalString;
    parent?: {
      id: string;
      type: string;
      label?: InternationalString;
    };
    selector?: BoxSelector;
  } | null;
  "image-service.change": {
    id: string;
  };
  "search.index-start": undefined;
  "search.index-complete": undefined;
  "history.page": { url: string; route: string };
  "history.clear": undefined;
};

export type BrowserEmitter = Emitter<BrowserEvents>;

export function createEmitter({ debug }: { debug?: boolean }) {
  const emitter = mitt<BrowserEvents>();

  if (debug) {
    emitter.on("*", (e, t) =>
      console.log(
        `%c${e}`,
        "background: palevioletred;color:white;padding:2px 8px;",
        t,
      ),
    );
  }

  return emitter;
}
