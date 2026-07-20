import type { BoxSelector, Vault } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import type { Emitter } from "mitt";
import { createStore } from "zustand/vanilla";
import {
  type BrowserLinkConfig,
  isDomainAllowed,
} from "../browser/BrowserLink";
import type { BrowserEvents } from "../events";
import { formats } from "../formats";
import { targets } from "../targets";
import {
  canvasToImageSelector,
  defaultSelectedPainting,
  findSelectedPainting,
  type SelectedPainting,
} from "../utilities/painting-selection";

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
  imageSelector?: BoxSelector;
  selectedPainting?: SelectedPainting;
  rotation?: number;
};

const typeNormalizationMap: Record<string, string> = {
  manifest: "Manifest",
  collection: "Collection",
  canvas: "Canvas",
};

export function normalizeResourceType(type: string | null | undefined): string {
  const value = (type || "").trim();
  if (!value) {
    return "unknown";
  }

  const normalized = typeNormalizationMap[value.toLowerCase()];
  return normalized || value;
}

function normalizeIdentityInput(
  input: SelectedItem | { id: string; type: string } | string,
): SelectedItem | { id: string; type: string } {
  if (typeof input === "string") {
    return { id: input, type: "unknown" };
  }

  return {
    ...input,
    type: normalizeResourceType(input.type),
  };
}

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
  setSelectedPainting(id: string, painting?: SelectedPainting): void;
  setRotation(id: string, rotation: number): void;
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
  | { type: "content-state"; encoded?: boolean; pretty?: boolean }
  | { type: "json"; pretty?: boolean }
  | { type: "image-service" }
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
  buttonClassName?: string;
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
  "output.set-rotation": SelectedItem;
};

export function canNavigateItem(
  _input: SelectedItem | { id: string; type: string } | string,
  config: BrowserLinkConfig,
  vault: Vault,
) {
  const input = normalizeIdentityInput(_input);

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
  const input = normalizeIdentityInput(_input);

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

export function isOutputSupportedForSelection(
  outputTarget: OutputTarget,
  selectedItems: SelectedItem[],
) {
  if (selectedItems.length === 0) {
    return false;
  }

  if (outputTarget.supportedTypes.includes("All")) {
    return true;
  }

  const uniqueTypes = new Set(selectedItems.map((item) => item.type));

  if (selectedItems.length === 1) {
    return outputTypesForItem(selectedItems[0]!).some((type) =>
      outputTarget.supportedTypes.includes(type),
    );
  }

  if (uniqueTypes.size !== 1) {
    return false;
  }

  const [onlyType] = uniqueTypes;
  return outputTarget.supportedTypes.includes(`${onlyType}List` as any);
}

export function outputTypesForItem(item: SelectedItem): OutputType[] {
  const types = [item.type as OutputType];
  if (item.type !== "Canvas") return types;
  if (item.selector) types.push("CanvasRegion");
  if (item.selectedPainting?.service) {
    types.push("ImageService");
    if (item.imageSelector) types.push("ImageServiceRegion");
  }
  return types;
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

    async runTargetAction(outputTarget: OutputTarget) {
      const resources = get().selectedItems;
      if (!isOutputSupportedForSelection(outputTarget, resources)) {
        return;
      }

      const format = outputTarget.format;
      const chosenFormat = formats[format.type];
      const template = targets[outputTarget.type];

      const resource = resources.length === 1 ? resources[0] : resources;

      if (!resources.length) {
        return;
      }

      if (!chosenFormat || !template) {
        throw new Error(
          `Unsupported output: ${format.type} / ${outputTarget.type}`,
        );
      }

      const formatted = await chosenFormat.format(
        resource,
        format as never,
        vault,
      );
      await template.action(
        formatted,
        resource as any,
        outputTarget as any,
        vault,
      );
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

    setRotation(id: string, rotation: number) {
      const item = get().selectedItems.find((i) => i.id === id);
      if (!item) return;
      const updatedItem = { ...item, rotation };
      set({
        selectedItems: [
          ...get().selectedItems.filter((i) => i.id !== id),
          updatedItem,
        ],
        wasManuallySelected: true,
      });
      emitter.emit("output.set-rotation", updatedItem);
      emitter.emit("output.selection-change");
    },

    refineSelectedItem(id: string, refinement: BoxSelector | null): void {
      const item = get().selectedItems.find((i) => i.id === id);
      if (!item) return;
      const canvas = vault.get<any>(item);
      const painting =
        canvas && item.selectedPainting
          ? findSelectedPainting(vault, canvas, item.selectedPainting)
          : undefined;
      const updatedItem = {
        ...item,
        selector: refinement || undefined,
        imageSelector:
          canvas && painting && refinement
            ? canvasToImageSelector(canvas, painting, refinement)
            : undefined,
      };
      set({
        selectedItems: [
          ...get().selectedItems.filter((i) => i.id !== id),
          updatedItem,
        ],
        wasManuallySelected: true,
      });
      emitter.emit("output.refine-selected-item", updatedItem);
      emitter.emit("output.selection-change");
    },

    setSelectedPainting(id, selectedPainting) {
      const item = get().selectedItems.find((candidate) => candidate.id === id);
      if (!item) return;
      if (
        item.selectedPainting?.id === selectedPainting?.id &&
        item.selectedPainting?.annotationId === selectedPainting?.annotationId &&
        item.selectedPainting?.service?.id === selectedPainting?.service?.id &&
        item.selectedPainting?.choice === selectedPainting?.choice
      ) {
        return;
      }
      const canvas = vault.get<any>(item);
      const painting =
        canvas && selectedPainting
          ? findSelectedPainting(vault, canvas, selectedPainting)
          : undefined;
      set({
        selectedItems: [
          ...get().selectedItems.filter((candidate) => candidate.id !== id),
          {
            ...item,
            selectedPainting,
            imageSelector:
              canvas && painting
                ? canvasToImageSelector(canvas, painting, item.selector)
                : undefined,
          },
        ],
      });
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

    const availableOutputs = output.filter((outputTarget) =>
      isOutputSupportedForSelection(outputTarget, selectedItems),
    );

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

    const previousItem = store
      .getState()
      .selectedItems.find((item) => item.id === canvas.id);
    const item: SelectedItem = {
      id: canvas.id,
      type: "Canvas",
      parent: canvas.parent,
      selector: canvas.selector,
      rotation: previousItem?.rotation,
    };
    const fullCanvas = vault.get<any>(item);
    item.selectedPainting =
      canvas.selectedPainting ||
      (fullCanvas ? defaultSelectedPainting(vault, fullCanvas) : undefined);
    const painting =
      fullCanvas && item.selectedPainting
        ? findSelectedPainting(vault, fullCanvas, item.selectedPainting)
        : undefined;
    item.imageSelector =
      fullCanvas && painting
        ? canvasToImageSelector(fullCanvas, painting, item.selector)
        : undefined;

    const selectable = canSelect(item);
    store.setState({
      defaultSelectedItem: item,
      selectedItems: selectable ? [item] : [],
      wasManuallySelected: false,
    });
    if (selectable) {
      emitter.emit("output.select-item", item);
    }
    emitter.emit("output.selection-change");
  });

  // Another special case for image services.
  emitter.on("image-service.change", (resource) => {
    if (!linkConfig.canSelectImageService) {
      return;
    }

    const item: SelectedItem = {
      id: resource.id,
      type: "ImageService",
    };

    const selectable = canSelect(item);
    store.setState({
      defaultSelectedItem: item,
      selectedItems: selectable ? [item] : [],
      wasManuallySelected: false,
    });
    if (selectable) {
      emitter.emit("output.select-item", item);
    }
    emitter.emit("output.selection-change");
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
    const selectable = canSelect(item);
    store.setState({
      defaultSelectedItem: item,
      selectedItems: selectable ? [item] : [],
      wasManuallySelected: false,
    });
    if (selectable) {
      emitter.emit("output.select-item", item);
    }
    emitter.emit("output.selection-change");
  });

  emitter.emit("output.selection-change");

  return store;
}
