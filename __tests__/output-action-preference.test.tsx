// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserOutputActions } from "../src/browser/BrowserOuputActions";
import {
  outputPreferenceKey,
  preferenceSignature,
} from "../src/utilities/output-preference";

const state = vi.hoisted(() => {
  const outputs = [
    {
      type: "callback",
      label: "Return selected state",
      format: { type: "json" },
      supportedTypes: ["Canvas"],
      cb() {},
    },
    {
      type: "callback",
      label: "Return image URL",
      format: { type: "image-url" },
      supportedTypes: ["Canvas"],
      cb() {},
    },
  ];
  return { outputs, available: outputs, scope: "instance-a", run: vi.fn() };
});
vi.mock("../src/context", () => ({
  useAvailableOutputs: () => state.available,
  useAllOutputs: () => state.outputs,
  usePreferenceScope: () => state.scope,
  useSelectedActions: () => ({ runTargetAction: state.run }),
  useUIConfig: () => ({}),
}));
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const render = () =>
  act(async () => root.render(createElement(BrowserOutputActions)));
const primary = () =>
  container.querySelector('[aria-label="Output actions"] > button')!;
async function chooseImage() {
  await act(async () =>
    (
      container.querySelector(
        '[aria-label="More actions"]',
      ) as HTMLButtonElement
    ).click(),
  );
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (node) => node.textContent === "Return image URL",
  ) as HTMLElement;
  expect(item).toBeTruthy();
  await act(async () => item.click());
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  state.scope = "instance-a";
  state.available = state.outputs;
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("remembered output action", () => {
  it("promotes the chosen menu action, executes it, and restores it on remount", async () => {
    await render();
    expect(primary().textContent).toBe("Return selected state");
    await chooseImage();
    expect(state.run).toHaveBeenCalledWith(state.outputs[1]);
    expect(primary().textContent).toBe("Return image URL");
    await act(async () => root.unmount());
    root = createRoot(container);
    await render();
    expect(primary().textContent).toBe("Return image URL");
    await act(async () => (primary() as HTMLButtonElement).click());
    expect(state.run).toHaveBeenLastCalledWith(state.outputs[1]);
  });
  it("isolates instances and falls back temporarily when the preferred action is unavailable", async () => {
    await render();
    await chooseImage();
    state.scope = "instance-b";
    await render();
    expect(primary().textContent).toBe("Return selected state");
    state.scope = "instance-a";
    state.available = [state.outputs[0]];
    await render();
    expect(primary().textContent).toBe("Return selected state");
    state.available = state.outputs;
    await render();
    expect(primary().textContent).toBe("Return image URL");
  });
  it("keeps the selected default for this session if local storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await render();
    await chooseImage();
    expect(primary().textContent).toBe("Return image URL");
    expect(state.run).toHaveBeenCalledWith(state.outputs[1]);
  });
  it("keys preferences by the complete configured outputs, independent of callback identities and property order", () => {
    const key = outputPreferenceKey("scope", state.outputs as any);
    expect(outputPreferenceKey("other", state.outputs as any)).not.toBe(key);
    expect(
      outputPreferenceKey("scope", [
        { ...state.outputs[0], label: "Different action" },
      ] as any),
    ).not.toBe(key);
    expect(preferenceSignature({ b: 2, a: 1 })).toBe(
      preferenceSignature({ a: 1, b: 2 }),
    );
    expect(
      outputPreferenceKey(
        "scope",
        state.outputs.map((output) => ({ ...output, cb() {} })) as any,
      ),
    ).toBe(key);
  });
});
