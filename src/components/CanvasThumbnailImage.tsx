import { useCanvas, useThumbnail } from "react-iiif-vault";
import { LazyLoadComponent } from "react-lazy-load-image-component";
import { CanvasThumbnailFallback } from "./CanvasThumbnailFallback";

export function CanvasThumbnailImage() {
  const canvas = useCanvas();
  const thumbnail = useThumbnail({ height: 120, width: 120 }, false);
  // const ref = useRef<HTMLDivElement>(null);
  // Save this for later.
  // useLayoutEffect(() => {
  //   if (ref.current) {
  //     const rect = ref.current.getBoundingClientRect();
  //     console.log("LazyCanvasThumbnail", { width: rect.width, height: rect.height });
  //   }
  // }, []);

  if (!thumbnail) {
    // Fallbacks.
    return (
      <LazyLoadComponent>
        <CanvasThumbnailFallback />
      </LazyLoadComponent>
    );
  }

  return (
    <LazyLoadComponent>
      <img
        draggable="false"
        className="w-full h-full object-contain select-none"
        src={thumbnail?.id}
        alt=""
      />
    </LazyLoadComponent>
  );
}
