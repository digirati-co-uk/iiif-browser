import { CanvasContext, useCanvas, useManifest } from "react-iiif-vault";
import { CanvasThumbnailImage } from "../components/CanvasThumbnailImage";
import { ResourceGridItem } from "./ResourceGridItem";

export function CanvasGridSnippet({
  manifest,
}: {
  manifest: { id: string; type: string };
}) {
  const canvas = useCanvas();

  if (!canvas) return null;

  return (
    <ResourceGridItem
      className="rounded-md cursor-pointer hover:bg-slate-200 p-1 group aspect-square items-center"
      resource={canvas}
      parent={manifest}
      thumbnail={
        <CanvasContext canvas={canvas.id}>
          <CanvasThumbnailImage />
        </CanvasContext>
      }
      hideLabel
    />
  );
}
