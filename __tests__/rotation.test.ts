// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasControls } from "../src/components/CanvasControls";

const state = vi.hoisted(() => ({
  rotation: 0,
  canvas: { id: "https://example.org/canvas", width: 400, height: 200 },
  selector: {
    type: "BoxSelector",
    spatial: { x: 40, y: 20, width: 100, height: 50 },
  } as {
    type: string;
    spatial: { x: number; y: number; width: number; height: number };
  } | null,
  refine: vi.fn(),
  rotate: vi.fn(),
  setEditMode: vi.fn(),
  requestAnnotation: vi.fn(),
  cancelRequest: vi.fn(),
  preset: {
    runtime: {
      touchRotationEnabled: true,
      viewRotation: 0,
      transitionManager: { getPendingTransition: () => ({ done: true }) },
      setTouchRotationEnabled: vi.fn(),
      world: { goHome: vi.fn(), zoomTo: vi.fn(), rotateBy: vi.fn() },
    },
  },
}));
vi.mock("react-iiif-vault", () => ({
  useCanvas: () => state.canvas,
  useViewerPreset: () => state.preset,
  useRequestAnnotation: () => ({
    requestAnnotation: state.requestAnnotation,
    cancelRequest: state.cancelRequest,
  }),
}));
vi.mock("../src/context", () => ({
  useCanvasOutputRotation: () => state.rotation,
  useCanvasOutputSelector: () => state.selector,
  useLinkConfig: () => ({ canCropImage: true }),
  useMode: () => ({ mode: "explore", setEditMode: state.setEditMode }),
  useRefineSelectedItem: () => state.refine,
  useSetRotation: () => state.rotate,
}));
vi.mock("../src/components/CanvasImageSourceSelect", () => ({
  CanvasImageSourceSelect: () => null,
}));
vi.mock("../src/components/CropAnnotationControls", () => ({
  CropAnnotationControls: () => null,
}));
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  state.rotation = 0;
  state.selector = {
    type: "BoxSelector",
    spatial: { x: 40, y: 20, width: 100, height: 50 },
  };
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("Atlas camera rotation crop coordinates", () => {
  it.each([0, 90, 180, 270])(
    "keeps the crop in original Canvas coordinates at %d°",
    async (rotation) => {
      state.rotation = rotation;
      const box = { x: 50, y: 30, width: 120, height: 60 };
      state.requestAnnotation.mockResolvedValue({
        cancelled: false,
        boundingBox: box,
      });
      await act(async () => root.render(createElement(CanvasControls)));
      await act(async () =>
        (
          container.querySelector(
            '[aria-label="Edit crop"]',
          ) as HTMLButtonElement
        ).click(),
      );
      expect(state.requestAnnotation).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: state.selector!.spatial,
          bounds: { x: 0, y: 0, width: 400, height: 200 },
        }),
      );
      expect(state.refine).toHaveBeenCalledWith(state.canvas.id, {
        type: "BoxSelector",
        spatial: box,
      });
    },
  );
  it("lets Atlas animate a rotation without forcing a home transition", async () => {
    await act(async () => root.render(createElement(CanvasControls)));
    state.rotation = 90;
    await act(async () => root.render(createElement(CanvasControls)));
    expect(state.preset.runtime.world.rotateBy).toHaveBeenCalledWith(90);
    expect(state.preset.runtime.world.goHome).not.toHaveBeenCalled();
  });
  it("keeps existing crop tools on the left and puts a new crop in the zoom column", async () => {
    await act(async () => root.render(createElement(CanvasControls)));
    expect(
      container.querySelector(
        '.ib-viewer-controls__tools [aria-label="Edit crop"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '.ib-viewer-controls__tools [aria-label="Remove crop"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '.ib-viewer-controls__zoom [aria-label="Crop image"]',
      ),
    ).toBeNull();
    state.selector = null;
    await act(async () => root.render(createElement(CanvasControls)));
    expect(container.querySelector('[aria-label="Edit crop"]')).toBeNull();
    expect(container.querySelector('[aria-label="Remove crop"]')).toBeNull();
    expect(
      container.querySelector(
        '.ib-viewer-controls__zoom [aria-label="Crop image"][data-secondary]',
      ),
    ).toBeTruthy();
  });
  it("moves the thumbnail toggle into the secondary controls with its controlled state", async () => {
    const onToggle = vi.fn();
    await act(async () =>
      root.render(
        createElement(CanvasControls, {
          thumbnails: { visible: false, controls: "thumbnail-strip", onToggle },
        }),
      ),
    );
    const toggle = container.querySelector(
      '.ib-viewer-controls__zoom [aria-label="Show thumbnails"]',
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-controls")).toBe("thumbnail-strip");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await act(async () => toggle.click());
    expect(onToggle).toHaveBeenCalledOnce();
    await act(async () =>
      root.render(
        createElement(CanvasControls, {
          thumbnails: { visible: true, controls: "thumbnail-strip", onToggle },
        }),
      ),
    );
    expect(
      container
        .querySelector('[aria-label="Hide thumbnails"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
  });
  it("does not commit a cancelled crop", async () => {
    state.requestAnnotation.mockResolvedValue({
      cancelled: true,
      boundingBox: state.selector!.spatial,
    });
    await act(async () => root.render(createElement(CanvasControls)));
    await act(async () =>
      (
        container.querySelector('[aria-label="Edit crop"]') as HTMLButtonElement
      ).click(),
    );
    expect(state.refine).not.toHaveBeenCalled();
    expect(state.setEditMode).toHaveBeenCalledWith(false);
  });
  it("wraps the output rotation back to zero after four quarter turns", async () => {
    state.rotation = 270;
    await act(async () => root.render(createElement(CanvasControls)));
    await act(async () =>
      (
        container.querySelector(
          '[aria-label="Rotate clockwise"]',
        ) as HTMLButtonElement
      ).click(),
    );
    expect(state.rotate).toHaveBeenCalledWith(state.canvas.id, 0);
  });
});
