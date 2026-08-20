import { useEffect, useMemo, useState } from "react";
import { useCanvas, useThumbnail, useVault } from "react-iiif-vault";
import type { SelectedItem } from "../stores/output-store";
import { selectedPaintingThumbnail } from "../utilities/painting-selection";
import { CanvasThumbnailFallback } from "./CanvasThumbnailFallback";

export function CanvasThumbnailImage({
  selection,
}: {
  selection?: SelectedItem;
}) {
  const vault = useVault();
  const canvas = useCanvas();
  const thumbnail = useThumbnail({ height: 120, width: 120 }, false);
  const selectedThumbnail = useMemo(
    () =>
      canvas
        ? selectedPaintingThumbnail(
            vault,
            canvas,
            selection?.selectedPainting,
            selection?.imageSelector,
            selection?.rotation,
          )
        : undefined,
    [
      canvas,
      selection?.imageSelector,
      selection?.selectedPainting,
      selection?.rotation,
      vault,
    ],
  );
  const [selectionFailed, setSelectionFailed] = useState(false);
  useEffect(() => setSelectionFailed(false), [selectedThumbnail]);
  // const ref = useRef<HTMLDivElement>(null);
  // Save this for later.
  // useLayoutEffect(() => {
  //   if (ref.current) {
  //     const rect = ref.current.getBoundingClientRect();
  //     console.log("LazyCanvasThumbnail", { width: rect.width, height: rect.height });
  //   }
  // }, []);

  if (!thumbnail && (!selectedThumbnail || selectionFailed)) {
    // Fallbacks.
    return <CanvasThumbnailFallback />;
  }

  return (
    <img
      draggable="false"
      loading="lazy"
      className="w-full h-full object-contain select-none"
      src={
        selectedThumbnail && !selectionFailed
          ? selectedThumbnail
          : thumbnail?.id
      }
      alt=""
      onError={() => setSelectionFailed(true)}
    />
  );
}
