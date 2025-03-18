import type { BoxSelector, Vault } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import type { Emitter } from "mitt";
import { createStore } from "zustand/vanilla";
import { formats } from "../../formats";
import { targets } from "../../targets";
import {
  type BrowserLinkConfig,
  isDomainAllowed,
} from "../browser/BrowserLink";
import type { BrowserEvents } from "../events";

export type SelectedItem = {
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
  selector?: BoxSelector;
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
  allOutputs: Array<OutputTarget>;
  availableOutputs: Array<OutputTarget>;
  replaceSelectedItems(items: Array<SelectedItem>): void;
  selectItem(item: SelectedItem): void;
  toggleItemSelection(item: SelectedItem, single?: boolean): void;
  deselectItem(item: SelectedItem): void;
  resetSelection(): void;
  runTargetAction(target: OutputTarget): void;
  refineSelectedItem(id: string, refinement: BoxSelector | null): void;
}

export type OutputType =
  | "All"
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
  "output.replace-selected-items": Array<SelectedItem>;
  "output.select-item": SelectedItem;
  "output.deselect-item": SelectedItem;
  "output.deselect-all-items": undefined;
  "output.reset-selection": undefined;
  "output.selection-change": undefined;
  "output.refine-selected-item": SelectedItem;
};

export function canNavigateItem(
  _input: SelectedItem | { id: string; type: string } | string,
  config: BrowserLinkConfig,
  vault: Vault,
) {
  let input = _input;
  if (typeof input === "string") {
    input = { id: input, type: "unknown" };
  }

  if (config.customCanNavigate) {
    try {
      const customNav = config.customCanNavigate(input, vault);
      if (typeof customNav === "boolean") {
        return customNav;
      }
    } catch (error) {
      console.error("Error in customCanNavigate:", error);
    }
  }

  if (!config.allowNavigationToBuiltInPages && !input.id.startsWith("http")) {
    return false;
  }

  if (config.disallowedResources.includes(input.id)) {
    return false;
  }

  if (!config.canNavigateToCanvas && input.type === "Canvas") {
    return false;
  }
  if (!config.canNavigateToCollection && input.type === "Collection") {
    return false;
  }
  if (!config.canNavigateToManifest && input.type === "Manifest") {
    return false;
  }

  let allowed = true;
  if (config.onlyAllowedDomains) {
    allowed = isDomainAllowed(input.id, config.allowedDomains);
  }

  return allowed;
}

export function canSelectItem(
  _input: SelectedItem | { id: string; type: string } | string,
  config: BrowserLinkConfig,
  vault: Vault,
) {
  let input = _input;
  if (typeof input === "string") {
    input = { id: input, type: "unknown" };
  }

  if (config.customCanSelect) {
    try {
      const customSelect = config.customCanSelect(input, vault);
      if (typeof customSelect === "boolean") {
        return customSelect;
      }
    } catch (error) {
      console.error("Error in customCanSelect:", error);
    }
  }

  if (config.disallowedResources.includes(input.id)) {
    return false;
  }

  if (!config.canSelectCanvas && input.type === "Canvas") {
    return false;
  }
  if (!config.canSelectCollection && input.type === "Collection") {
    return false;
  }
  if (!config.canSelectManifest && input.type === "Manifest") {
    return false;
  }

  let allowed = true;
  if (config.canSelectOnlyAllowedDomains) {
    allowed = isDomainAllowed(input.id, config.allowedDomains);
  }

  return allowed;
}

export function createOutputStore(options: OutputStoreOptions) {
  const { output, emitter, linkConfig, vault } = options;

  function canSelect(item: SelectedItem) {
    return canSelectItem(item, linkConfig, vault);
  }

  const store = createStore<OutputStore>((set, get) => ({
    defaultSelectedItem: null,
    selectedItems: [],
    wasManuallySelected: false,
    allOutputs: output,
    availableOutputs: output,

    async runTargetAction(output: OutputTarget) {
      const resources = get().selectedItems;
      const format = output.format;
      const chosenFormat = formats[format.type];
      const template = targets[output.type];

      const resource = resources.length === 1 ? resources[0] : resources;

      if (!resources.length) {
        return;
      }

      if (!chosenFormat || !template) {
        throw new Error(`Unsupported output: ${format.type} / ${output.type}`);
      }

      const formatted = await chosenFormat.format(
        resource,
        format as never,
        vault,
      );
      await template.action(formatted, resource as any, output as any, vault);
    },
    replaceSelectedItems(items: Array<SelectedItem>): void {
      const selectedItems = items.filter(canSelect);
      set({
        selectedItems,
        wasManuallySelected: true,
      });
      emitter.emit("output.replace-selected-items", selectedItems);
      emitter.emit("output.selection-change");
    },
    selectItem(item: SelectedItem): void {
      const wasManuallySelected = get().wasManuallySelected;
      if (!canSelect(item)) return;
      set({
        selectedItems: wasManuallySelected
          ? [...get().selectedItems, item]
          : [item],
        wasManuallySelected: true,
      });
      emitter.emit("output.select-item", item);
      emitter.emit("output.selection-change");
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
      emitter.emit("output.deselect-item", item);
      emitter.emit("output.selection-change");

      if (get().selectedItems.length === 0) {
        get().resetSelection();
      }
    },

    refineSelectedItem(id: string, refinement: BoxSelector | null): void {
      const item = get().selectedItems.find((i) => i.id === id);
      if (!item) return;
      set({
        selectedItems: [
          ...get().selectedItems.filter((i) => i.id !== id),
          { ...item, selector: refinement || undefined },
        ],
        wasManuallySelected: true,
      });
      emitter.emit("output.refine-selected-item", item);
      emitter.emit("output.selection-change");
    },

    resetSelection(): void {
      const defaultSelectedItem = get().defaultSelectedItem;
      set({
        selectedItems:
          defaultSelectedItem && canSelect(defaultSelectedItem)
            ? [defaultSelectedItem]
            : [],
        wasManuallySelected: false,
      });
      emitter.emit("output.reset-selection");
      emitter.emit("output.selection-change");
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
  }));

  emitter.on("output.selection-change", () => {
    // @todo availableOutputs
    const { selectedItems } = store.getState();

    if (selectedItems.length === 0) {
      store.setState({ availableOutputs: [] });
      return;
    }

    const availableOutputs = output.filter((output) => {
      if (selectedItems.length === 1) {
        const item = selectedItems[0]!;
        // Handle cases for single items.
        if (!output.supportedTypes.includes(item.type as any)) {
          return false;
        }

        return true;
      }

      const uniqueTypes: string[] = [];
      for (const item of selectedItems) {
        if (uniqueTypes.includes(item.type)) {
          continue;
        }
        uniqueTypes.push(item.type);
      }

      // Option 1: check for `${type}List`
      if (uniqueTypes.length === 1) {
        const uniqueType = uniqueTypes[0]!;
        const typeList = `${uniqueType}List`;
        if (!output.supportedTypes.includes(typeList as any)) {
          return false;
        }
      }

      // At the moment no way to support this. Maybe an "All" type, useful for callbacks.
      if (output.supportedTypes.includes("All")) {
        return true;
      }

      return true;
    });

    store.setState({ availableOutputs });
  });

  // Special case, because the resource (loaded resource) is the Manifest.
  emitter.on("canvas.change", (canvas) => {
    if (!canvas) {
      store.setState({
        defaultSelectedItem: null,
        selectedItems: [],
        wasManuallySelected: false,
      });
      emitter.emit("output.deselect-all-items");
      return;
    }

    // Check if we can select canvases, otherwise fallback to manifest.
    if (!linkConfig.canSelectCanvas) {
      // In theory because of the events, the Manifest should be selected.
      return;
    }

    const item: SelectedItem = {
      id: canvas.id,
      type: "Canvas",
      parent: canvas.parent,
      selector: canvas.selector,
    };

    store.setState({
      defaultSelectedItem: item,
      selectedItems: canSelect(item) ? [item] : [],
      wasManuallySelected: false,
    });
    emitter.emit("output.select-item", item);
  });

  emitter.on("resource.change", (resource) => {
    if (!resource) {
      store.setState({
        defaultSelectedItem: null,
        selectedItems: [],
        wasManuallySelected: false,
      });
      emitter.emit("output.deselect-all-items");
      return;
    }

    const item: SelectedItem = {
      id: resource.id,
      type: resource.type,
      // @todo once we have label/thumbnail/parent add it here.
    };
    store.setState({
      defaultSelectedItem: item,
      selectedItems: canSelect(item) ? [item] : [],
      wasManuallySelected: false,
    });
    emitter.emit("output.select-item", item);
    emitter.emit("output.selection-change");
  });

  emitter.emit("output.selection-change");

  return store;
}
