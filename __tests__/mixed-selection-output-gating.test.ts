import { Vault } from "@iiif/helpers";
import mitt from "mitt";
import type { BrowserLinkConfig } from "../src/v2/browser/BrowserLink";
import {
  createOutputStore,
  type OutputTarget,
  type SelectedItem,
} from "../src/v2/stores/output-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createConfig(
  overrides: Partial<BrowserLinkConfig> = {},
): BrowserLinkConfig {
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

function createOutputTargets(
  callbacks: {
    mixedSingle: (resource: unknown) => void;
    allTypes: (resource: unknown) => void;
  },
): OutputTarget[] {
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

function makeStore(callbacks: {
  mixedSingle: (resource: unknown) => void;
  allTypes: (resource: unknown) => void;
}) {
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

{
  const store = makeStore({
    mixedSingle: () => undefined,
    allTypes: () => undefined,
  });
  store.getState().replaceSelectedItems([manifest]);
  const labels = listLabels(store.getState().availableOutputs);
  assert(labels.includes("Manifest only"), "Expected manifest action for manifest");
  assert(
    labels.includes("Manifest or Canvas single"),
    "Expected dual single-type action for single manifest",
  );
  assert(!labels.includes("Canvas list"), "Did not expect canvas list for manifest");
}

{
  const store = makeStore({
    mixedSingle: () => undefined,
    allTypes: () => undefined,
  });
  store.getState().replaceSelectedItems([canvasA, canvasB]);
  const labels = listLabels(store.getState().availableOutputs);
  assert(labels.includes("Canvas list"), "Expected canvas-list action");
  assert(
    !labels.includes("Manifest or Canvas single"),
    "Did not expect single-type action for multi-canvas selection",
  );
}

{
  const store = makeStore({
    mixedSingle: () => undefined,
    allTypes: () => undefined,
  });
  store.getState().replaceSelectedItems([manifest, canvasA]);
  const labels = listLabels(store.getState().availableOutputs);
  assert(
    labels.length === 1 && labels[0] === "All callback",
    "Expected mixed selection to expose only All-supported outputs",
  );
}

{
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
  const mixedSingleAction = outputs.find(
    (output) => output.label === "Manifest or Canvas single",
  );
  const allAction = outputs.find((output) => output.label === "All callback");

  assert(mixedSingleAction, "Expected mixedSingleAction");
  assert(allAction, "Expected allAction");

  store.getState().replaceSelectedItems([manifest, canvasA]);
  await store.getState().runTargetAction(mixedSingleAction);
  await store.getState().runTargetAction(allAction);

  assert(
    mixedSingleCalls === 0,
    "Expected unsupported mixed single-type action not to run for mixed selections",
  );
  assert(allCalls === 1, "Expected All-supported action to run once");
}

console.log("mixed-selection-output-gating tests passed");
