import { Vault } from "@iiif/helpers";
import mitt from "mitt";
import { describe, expect, it } from "vitest";
import type { BrowserLinkConfig } from "../src/v2/browser/BrowserLink";
import { createOutputStore, type OutputTarget, type SelectedItem } from "../src/v2/stores/output-store";

function createConfig(overrides: Partial<BrowserLinkConfig> = {}): BrowserLinkConfig {
  return {
    allowNavigationToBuiltInPages: true,
    onlyAllowedDomains: false,
    canSelectOnlyAllowedDomains: false,
    allowedDomains: [],
    disallowedResources: [],
    markedResources: [],
    multiSelect: true,
    canCropImage: false,
    alwaysShowNavigationArrow: true,
    clickToSelect: false,
    doubleClickToNavigate: false,
    clickToNavigate: true,
    canNavigateToCollection: true,
    canNavigateToManifest: true,
    canNavigateToCanvas: true,
    canSelectCollection: true,
    canSelectManifest: true,
    canSelectCanvas: true,
    canSelectImageService: true,
    customCanNavigate: null,
    customCanSelect: null,
    ...overrides,
  };
}

function listLabels(outputs: OutputTarget[]) {
  return outputs.map((target) => target.label);
}

function createOutputTargets(callbacks: {
  mixedSingle: (resource: unknown) => void;
  allTypes: (resource: unknown) => void;
}): OutputTarget[] {
  return [
    {
      label: "Manifest only",
      type: "callback",
      cb: () => undefined,
      format: { type: "json" },
      supportedTypes: ["Manifest"],
    },
    {
      label: "Canvas list",
      type: "callback",
      cb: () => undefined,
      format: { type: "json" },
      supportedTypes: ["CanvasList"],
    },
    {
      label: "Manifest or Canvas single",
      type: "callback",
      cb: callbacks.mixedSingle,
      format: { type: "custom", format: (resource) => resource },
      supportedTypes: ["Manifest", "Canvas"],
    },
    {
      label: "All callback",
      type: "callback",
      cb: callbacks.allTypes,
      format: { type: "custom", format: (resource) => resource },
      supportedTypes: ["All"],
    },
  ];
}

function makeStore(callbacks: { mixedSingle: (resource: unknown) => void; allTypes: (resource: unknown) => void }) {
  const emitter = mitt<any>();
  return createOutputStore({
    vault: new Vault(),
    emitter,
    linkConfig: createConfig(),
    output: createOutputTargets(callbacks),
  });
}

const manifest: SelectedItem = {
  id: "https://example.org/manifest/1",
  type: "Manifest",
};

const canvasA: SelectedItem = {
  id: "https://example.org/canvas/1",
  type: "Canvas",
};

const canvasB: SelectedItem = {
  id: "https://example.org/canvas/2",
  type: "Canvas",
};

describe("mixed selection gating", () => {
  it("offers manifest outputs for manifest-only selection", () => {
    const store = makeStore({
      mixedSingle: () => undefined,
      allTypes: () => undefined,
    });

    store.getState().replaceSelectedItems([manifest]);
    const labels = listLabels(store.getState().availableOutputs);

    expect(labels).toContain("Manifest only");
    expect(labels).toContain("Manifest or Canvas single");
    expect(labels).not.toContain("Canvas list");
  });

  it("offers canvas list for multi-canvas selection", () => {
    const store = makeStore({
      mixedSingle: () => undefined,
      allTypes: () => undefined,
    });

    store.getState().replaceSelectedItems([canvasA, canvasB]);
    const labels = listLabels(store.getState().availableOutputs);

    expect(labels).toContain("Canvas list");
    expect(labels).not.toContain("Manifest or Canvas single");
  });

  it("shows only all-supported output for mixed manifest/canvas selection", () => {
    const store = makeStore({
      mixedSingle: () => undefined,
      allTypes: () => undefined,
    });

    store.getState().replaceSelectedItems([manifest, canvasA]);
    const labels = listLabels(store.getState().availableOutputs);

    expect(labels).toHaveLength(1);
    expect(labels[0]).toBe("All callback");
  });

  it("gates mixed-single output while running all callback for mixed selection", async () => {
    let mixedSingleCalls = 0;
    let allCalls = 0;

    const store = makeStore({
      mixedSingle: () => {
        mixedSingleCalls += 1;
      },
      allTypes: () => {
        allCalls += 1;
      },
    });

    const outputs = store.getState().allOutputs;
    const mixedSingleAction = outputs.find((output) => output.label === "Manifest or Canvas single");
    const allAction = outputs.find((output) => output.label === "All callback");

    expect(mixedSingleAction).toBeTruthy();
    expect(allAction).toBeTruthy();

    store.getState().replaceSelectedItems([manifest, canvasA]);
    await store.getState().runTargetAction(mixedSingleAction as OutputTarget);
    await store.getState().runTargetAction(allAction as OutputTarget);

    expect(mixedSingleCalls).toBe(0);
    expect(allCalls).toBe(1);
  });
});
