import { useCanvas, useThumbnail } from "react-iiif-vault";
import { LazyLoadComponent } from "react-lazy-load-image-component";

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

  return (
    <LazyLoadComponent>
      <img
        className="w-full h-full object-contain"
        src={thumbnail?.id}
        alt=""
      />
    </LazyLoadComponent>
  );
}
