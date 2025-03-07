import type { Vault } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import type { Emitter } from "mitt";
import { createStore } from "zustand/vanilla";
import type { BrowserLinkConfig } from "../browser/BrowserLink";
import type { BrowserEvents } from "../events";

type SelectedItem = {
  id: string;
  type: string;
  label?: InternationalString;
  thumbnail?: string;
  parent?: {
    id: string;
    type: string;
    label?: InternationalString;
    thumbnail?: string;
  };
};

// This needs to track the following:
// - Which items are selected
// - When selected items are automatically selected on navigation
// - Which output formats are available, and which should be displayed as buttons
// - What happens when an output format is clicked
// - Handling select/deselect items
// - Checking if an item can be selected
export interface OutputStore {
  defaultSelectedItem: SelectedItem | null;
  selectedItems: Array<SelectedItem>;
  wasManuallySelected: boolean;
  availableOutputs: Array<OutputTarget>;
  replaceSelectedItems(items: Array<SelectedItem>): void;
  selectItem(item: SelectedItem): void;
  toggleItemSelection(item: SelectedItem, single?: boolean): void;
  deselectItem(item: SelectedItem): void;
  resetSelection(): void;
  handleClickOutput(target: OutputTarget): void;
}

export type OutputType =
  | "Collection"
  | "Manifest"
  | "Canvas"
  | "ImageService"
  | "CanvasRegion"
  | "ImageServiceRegion"
  // Lists.
  | "CollectionList"
  | "ManifestList"
  | "CollectionItemList"
  | "CanvasList";

type OutputFormat =
  | { type: "content-state"; encoded?: boolean }
  | { type: "json"; pretty?: boolean }
  | {
      type: "custom";
      format: (
        resource: SelectedItem,
        parent: SelectedItem | null,
        vault: Vault,
      ) => any;
    }
  | { type: "url"; resolvable?: boolean };

export type OutputTarget = {
  label: string;
  format: OutputFormat;
  supportedTypes: OutputType[];
  inlineAction?: boolean;
} & OutputTargetTypes;

export type OutputTargetTypes =
  | { type: "callback"; cb: (resource: any) => void }
  | { type: "clipboard" }
  | {
      type: "input";
      separator?: string;
      el: { current: null | HTMLInputElement };
    }
  | {
      type: "open-new-window";
      urlPattern?: string;
      target?: string;
      features?: string;
      cb?: (resource: any, window: Window | null) => void;
    };

export type OutputConfig = OutputTarget[];

interface OutputStoreOptions {
  vault: Vault;
  linkConfig: BrowserLinkConfig;
  output: OutputConfig;
  emitter: Emitter<OutputStoreEvents & BrowserEvents>;
}

type OutputStoreEvents = {
  "output:replace-selected-items": Array<SelectedItem>;
  "output:select-item": SelectedItem;
  "output:deselect-item": SelectedItem;
  "output:deselect-all-items": undefined;
  "output:reset-selection": undefined;
};

export function createOutputStore(options: OutputStoreOptions) {
  const { output, emitter } = options;
  const store = createStore<OutputStore>((set, get) => ({
    defaultSelectedItem: null,
    selectedItems: [],
    wasManuallySelected: false,
    availableOutputs: output,
    replaceSelectedItems(items: Array<SelectedItem>): void {
      set({
        selectedItems: items,
        wasManuallySelected: true,
      });
      emitter.emit("output:replace-selected-items", items);
    },
    selectItem(item: SelectedItem): void {
      set({
        selectedItems: [...get().selectedItems, item],
        wasManuallySelected: true,
      });
      emitter.emit("output:select-item", item);
    },
    deselectItem(item: SelectedItem): void {
      const index = get().selectedItems.findIndex((i) => i.id === item.id);
      if (index === -1) return;
      set({
        selectedItems: [
          ...get().selectedItems.slice(0, index),
          ...get().selectedItems.slice(index + 1),
        ],
        wasManuallySelected: true,
      });
      emitter.emit("output:deselect-item", item);

      if (get().selectedItems.length === 0) {
        get().resetSelection();
      }
    },

    resetSelection(): void {
      const defaultSelectedItem = get().defaultSelectedItem;
      set({
        selectedItems: defaultSelectedItem ? [defaultSelectedItem] : [],
        wasManuallySelected: false,
      });
      emitter.emit("output:reset-selection");
    },

    toggleItemSelection(item: SelectedItem, single?: boolean): void {
      const index = get().selectedItems.findIndex((i) => i.id === item.id);
      if (index === -1) {
        if (single) {
          get().replaceSelectedItems([item]);
        } else {
          get().selectItem(item);
        }
      } else {
        get().deselectItem(item);
      }
    },

    handleClickOutput(target: OutputTarget): void {
      // @todo.
      console.log("handleClickOutput", {
        target,
        selectedItems: get().selectedItems,
      });
    },
  }));

  emitter.on("resource.change", (resource) => {
    if (!resource) {
      store.setState({
        defaultSelectedItem: null,
        selectedItems: [],
        wasManuallySelected: false,
      });
      emitter.emit("output:deselect-all-items");
      return;
    }

    const item = {
      id: resource.id,
      type: resource.type,
      // @todo once we have label/thumbnail/parent add it here.
    };
    store.setState({
      defaultSelectedItem: item,
      selectedItems: [item],
      wasManuallySelected: false,
    });
    emitter.emit("output:select-item", item);
  });

  return store;
}
