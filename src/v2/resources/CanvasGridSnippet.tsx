import { useCanvas, useManifest } from "react-iiif-vault";
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
      resource={canvas}
      parent={manifest}
      thumbnail={<CanvasThumbnailImage />}
      hideLabel
    />
  );
}
