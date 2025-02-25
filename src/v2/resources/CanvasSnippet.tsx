import { usePress } from "react-aria";
import { useCanvas, useManifest } from "react-iiif-vault";
import { useNavigate } from "react-router-dom";
import { CanvasThumbnailImage } from "../components/CanvasThumbnailImage";

export function CanvasSnippet() {
  const manifest = useManifest()!;
  const canvas = useCanvas()!;
  const navigate = useNavigate();
  const { pressProps } = usePress({
    onPress: () => {
      navigate({
        search: `?id=${encodeURIComponent(manifest.id)}&canvas=${canvas.id}`,
      });
    },
  });
  return (
    <div
      className="overflow-hidden rounded [&>img]:object-cover aspect-square bg-slate-50 group-hover:bg-slate-100"
      {...pressProps}
    >
      <CanvasThumbnailImage />
    </div>
  );
}
