// @vitest-environment jsdom
import {
  CanvasRenderer,
  Runtime,
  World,
  WorldObject,
  popmotionController,
} from "@atlas-viewer/atlas";
import {
  resetViewerHome,
  rotateViewerTo,
} from "../src/utilities/viewer-navigation";
import { describe, expect, it, vi } from "vitest";

function setup() {
  let size = { width: 600, height: 400 };
  const surface = document.createElement("canvas");
  surface.width = 600;
  surface.height = 400;
  surface.getBoundingClientRect = () => ({ x: 0, y: 0, ...size }) as DOMRect;
  surface.getContext = vi.fn(
    () =>
      new Proxy(
        {},
        {
          get: (target, key) => (target as any)[key] ?? (() => {}),
          set: (target, key, value) => {
            (target as any)[key] = value;
            return true;
          },
        },
      ),
  ) as any;
  const world = new World(3072, 2048);
  world.appendChild(
    WorldObject.createWithProps({
      id: "delft",
      x: 0,
      y: 0,
      width: 3072,
      height: 2048,
    }),
  );
  const renderer = new CanvasRenderer(surface);
  const runtime = new Runtime(
    renderer,
    world,
    { x: 0, y: 0, width: 600, height: 400, scale: 1 },
    [],
  );
  runtime.stop();
  runtime.setHomePosition({ x: 0, y: 0, width: 3072, height: 2048 });
  runtime.updateRendererScreenPosition();
  runtime.goHome();
  const stop = popmotionController({ parentElement: surface }).start(runtime);
  function settle() {
    for (let i = 0; i < 250; i++)
      runtime.transitionManager.runTransition(runtime.target, 16);
  }
  return {
    runtime,
    settle,
    resize() {
      size = { width: 720, height: 280 };
      surface.width = 720;
      surface.height = 280;
    },
    cleanup() {
      stop();
      runtime.stop();
      renderer.reset();
    },
  };
}

describe("Delft landscape Canvas rotation in a wide viewer", () => {
  it("animates consecutive quarter turns, preserves a panned centre, and resets mid-turn", () => {
    const h = setup();
    try {
      h.resize();
      resetViewerHome(h.runtime, 0);
      h.runtime.setViewport({ x: 700, y: 400, width: 900, height: 350 });
      const before = h.runtime.worldToViewer(1150, 575, 0, 0);
      rotateViewerTo(h.runtime, 90);
      h.runtime.world.flushSubscriptions();
      // The controlled output must not set runtime.viewRotation ahead of the animation.
      expect(h.runtime.viewRotation).toBe(0);
      h.runtime.transitionManager.runTransition(h.runtime.target, 100);
      expect(h.runtime.viewRotation).toBeGreaterThan(0);
      expect(h.runtime.viewRotation).toBeLessThan(90);
      const during = h.runtime.worldToViewer(1150, 575, 0, 0);
      expect(during.x).toBeCloseTo(before.x);
      expect(during.y).toBeCloseTo(before.y);
      // A second command must use the pending destination, not the intermediate angle.
      rotateViewerTo(h.runtime, 180);
      h.runtime.world.flushSubscriptions();
      h.settle();
      expect(h.runtime.viewRotation).toBeCloseTo(180);
      rotateViewerTo(h.runtime, 270);
      h.runtime.world.flushSubscriptions();
      resetViewerHome(h.runtime, 270);
      h.settle();
      expect(h.runtime.viewRotation).toBeCloseTo(270);
      const centre = h.runtime.worldToViewer(1536, 1024, 0, 0);
      expect(centre.x).toBeCloseTo(360);
      expect(centre.y).toBeCloseTo(140);
      rotateViewerTo(h.runtime, 0);
      h.runtime.world.flushSubscriptions();
      h.settle();
      expect(h.runtime.viewRotation % 360).toBeCloseTo(0);
    } finally {
      h.cleanup();
    }
  });
  it.each([0, 90, 180, 270])(
    "homes to the centre with all corners visible at %d degrees",
    (rotation) => {
      const h = setup();
      try {
        h.runtime.viewRotation = rotation;
        h.resize();
        resetViewerHome(h.runtime, rotation);
        h.runtime.world.flushSubscriptions();
        h.settle();
        expect(h.runtime.width / h.runtime.height).toBeCloseTo(720 / 280, 3);
        const centre = h.runtime.worldToViewer(1536, 1024, 0, 0);
        expect(centre.x).toBeCloseTo(360, 1);
        expect(centre.y).toBeCloseTo(140, 1);
        for (const [x, y] of [
          [0, 0],
          [3072, 0],
          [0, 2048],
          [3072, 2048],
        ]) {
          const point = h.runtime.worldToViewer(x, y, 0, 0);
          expect(point.x).toBeGreaterThanOrEqual(-0.1);
          expect(point.y).toBeGreaterThanOrEqual(-0.1);
          expect(point.x).toBeLessThanOrEqual(720.1);
          expect(point.y).toBeLessThanOrEqual(280.1);
        }
      } finally {
        h.cleanup();
      }
    },
  );
});
