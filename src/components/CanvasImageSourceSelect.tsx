import { getValue } from "@iiif/helpers";
import { useEffect, useMemo } from "react";
import {
  useCanvas,
  usePaintables,
  useVault,
} from "react-iiif-vault";
import { useCanvasSelectedPainting, useSetSelectedPainting } from "../context";
import {
  paintingReference,
  selectedPaintingFromId,
} from "../utilities/painting-selection";

export function CanvasImageSourceSelect() {
  const canvas = useCanvas();
  const vault = useVault();
  const [paintables] = usePaintables();
  const selected = useCanvasSelectedPainting(canvas);
  const setSelected = useSetSelectedPainting();
  const images = useMemo(
    () =>
      paintables.items.filter(
        (item) => item.type === "image" && item.resource.type === "Image",
      ),
    [paintables.items],
  );
  const choice = paintables.choice;

  useEffect(() => {
    if (!canvas) return;
    if (images.length === 1 && (!choice || !selected)) {
      setSelected(
        canvas.id,
        paintingReference(images[0] as any, Boolean(choice)),
      );
    } else if (
      images.length > 1 &&
      selected &&
      !images.some(
        (image) =>
          image.annotationId === selected.annotationId &&
          image.resource.id === selected.id,
      )
    ) {
      setSelected(canvas.id, undefined);
    }
  }, [canvas, choice, images, selected, setSelected]);

  if (!canvas) return null;
  if (choice?.type === "complex-choice") {
    return (
      <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
        Unsupported image alternatives
      </span>
    );
  }

  if (choice?.type === "single-choice") {
    const current =
      selected?.id ||
      choice.items.find((item) => item.selected)?.id ||
      choice.items[0]?.id ||
      "";
    return (
      <label className="flex items-center gap-1 rounded border border-gray-300 bg-white/95 px-2 py-1 text-xs text-gray-900">
        Image
        <select
          aria-label="Image alternative"
          value={current}
          onChange={(event) => {
            const id = event.currentTarget.value;
            const painting = selectedPaintingFromId(vault, canvas, id);
            if (painting) {
              setSelected(canvas.id, painting);
            }
          }}
        >
          {choice.items.map((item) => (
            <option key={item.id} value={item.id}>
              {getValue(item.label) || item.id}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (images.length < 2) return null;
  return (
    <label className="flex items-center gap-1 rounded border border-gray-300 bg-white/95 px-2 py-1 text-xs text-gray-900">
      Image source
      <select
        aria-label="Image source for output"
        value={selected?.id || ""}
        onChange={(event) => {
          const painting = images.find(
            (image) => image.resource.id === event.currentTarget.value,
          );
          setSelected(
            canvas.id,
            painting ? paintingReference(painting as any) : undefined,
          );
        }}
      >
        <option value="">Choose an image</option>
        {images.map((image) => (
          <option
            key={`${image.annotationId}:${image.resource.id}`}
            value={image.resource.id}
          >
            {getValue((image.resource as any).label) || image.resource.id}
          </option>
        ))}
      </select>
    </label>
  );
}
