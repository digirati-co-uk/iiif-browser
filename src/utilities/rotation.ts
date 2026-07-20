type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function normaliseRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

export function canvasToViewerBox(
  box: Box,
  canvas: { width: number; height: number },
  rotation: number,
): Box {
  // Atlas rotates manual image-service rotations around the Canvas centre.
  const centre = (canvas.width + canvas.height) / 2;
  const offset = (canvas.width - canvas.height) / 2;

  switch (normaliseRotation(rotation)) {
    case 90:
      return {
        x: centre - box.y - box.height,
        y: box.x - offset,
        width: box.height,
        height: box.width,
      };
    case 180:
      return {
        x: canvas.width - box.x - box.width,
        y: canvas.height - box.y - box.height,
        width: box.width,
        height: box.height,
      };
    case 270:
      return {
        x: box.y + offset,
        y: centre - box.x - box.width,
        width: box.height,
        height: box.width,
      };
    default:
      return box;
  }
}

export function viewerToCanvasBox(
  box: Box,
  canvas: { width: number; height: number },
  rotation: number,
): Box {
  const centre = (canvas.width + canvas.height) / 2;
  const offset = (canvas.width - canvas.height) / 2;

  switch (normaliseRotation(rotation)) {
    case 90:
      return {
        x: box.y + offset,
        y: centre - box.x - box.width,
        width: box.height,
        height: box.width,
      };
    case 180:
      return canvasToViewerBox(box, canvas, 180);
    case 270:
      return {
        x: centre - box.y - box.height,
        y: box.x - offset,
        width: box.height,
        height: box.width,
      };
    default:
      return box;
  }
}

export function rotatedCanvasOverflow(
  canvas: { width: number; height: number },
  rotation: number,
): Box[] {
  if (
    ![90, 270].includes(normaliseRotation(rotation)) ||
    canvas.width === canvas.height
  ) {
    return [];
  }

  const overflow = (canvas.height - canvas.width) / 2;
  if (overflow > 0) {
    return [
      {
        x: -overflow,
        y: overflow,
        width: overflow,
        height: canvas.width,
      },
      {
        x: canvas.width,
        y: overflow,
        width: overflow,
        height: canvas.width,
      },
    ];
  }

  return [
    {
      x: -overflow,
      y: overflow,
      width: canvas.height,
      height: -overflow,
    },
    {
      x: -overflow,
      y: canvas.height,
      width: canvas.height,
      height: -overflow,
    },
  ];
}

export function rotatedCanvasBounds(
  canvas: { width: number; height: number },
  rotation: number,
): Box {
  return canvasToViewerBox(
    { x: 0, y: 0, width: canvas.width, height: canvas.height },
    canvas,
    rotation,
  );
}
