import { describe, expect, it } from "vitest";
import {
  canvasToViewerBox,
  rotatedCanvasBounds,
  rotatedCanvasOverflow,
  viewerToCanvasBox,
} from "../src/utilities/rotation";

const canvas = { width: 400, height: 200 };
const box = { x: 40, y: 20, width: 100, height: 50 };

describe("rotated crop coordinates", () => {
  it.each([
    [0, box],
    [90, { x: 230, y: -60, width: 50, height: 100 }],
    [180, { x: 260, y: 130, width: 100, height: 50 }],
    [270, { x: 120, y: 160, width: 50, height: 100 }],
  ])("maps a Canvas box into a %d° viewer", (rotation, expected) => {
    expect(canvasToViewerBox(box, canvas, rotation)).toEqual(expected);
    expect(viewerToCanvasBox(expected, canvas, rotation)).toEqual(box);
  });

  it("returns the hit areas outside the original Canvas", () => {
    expect(rotatedCanvasOverflow(canvas, 90)).toEqual([
      { x: 100, y: -100, width: 200, height: 100 },
      { x: 100, y: 200, width: 200, height: 100 },
    ]);
    expect(rotatedCanvasOverflow({ width: 200, height: 400 }, 270)).toEqual([
      { x: -100, y: 100, width: 100, height: 200 },
      { x: 200, y: 100, width: 100, height: 200 },
    ]);
  });

  it("returns the rotated image bounds", () => {
    expect(rotatedCanvasBounds(canvas, 90)).toEqual({
      x: 100,
      y: -100,
      width: 200,
      height: 400,
    });
    expect(rotatedCanvasBounds({ width: 200, height: 400 }, 270)).toEqual({
      x: -100,
      y: 100,
      width: 400,
      height: 200,
    });
  });
});
