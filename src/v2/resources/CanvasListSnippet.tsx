import { useCanvas } from "react-iiif-vault";
import { ResourceListItem } from "./ResourceListItem";

export function CanvasListSnippet({
  manifest,
}: {
  manifest: { id: string; type: string };
}) {
  const canvas = useCanvas();

  if (!canvas) return null;

  return <ResourceListItem resource={canvas} parent={manifest} />;
}
