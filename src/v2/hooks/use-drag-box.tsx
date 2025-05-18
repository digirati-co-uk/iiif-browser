import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

export function useDragBox({
  onSelection,
  enabled = true,
}: {
  onSelection: (keys: number[], isShiftKeyPressed: boolean) => void;
  enabled?: boolean;
}) {
  const selectionBox = useRef<HTMLDivElement | null>(null);
  const gridList = useRef<HTMLDivElement | null>(null);
  const tileRef = useRef<HTMLDivElement | null>(null);
  const initialPoint = useRef({ x: 0, y: 0, scrollTop: 0 });
  const currentPoint = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDown = useRef(false);
  const [$container, setContainer] = useState<HTMLDivElement | null>(null);
  const [isShiftKeyPressed, setIsShiftKeyPressed] = useState(false);

  useLayoutEffect(() => {
    setContainer(document.getElementById("browser-container")! as any);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setIsShiftKeyPressed(event.shiftKey);
    };

    const handleKeyUp = () => {
      setIsShiftKeyPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const getSelectionBox = useCallback(() => {
    if (!$container) throw new Error("Container not found");
    const dScroll =
      initialPoint.current.scrollTop - $container.scrollTop + window.scrollY;

    console.log({ dScroll });

    if (dScroll < 0) {
      return {
        x: Math.min(initialPoint.current.x, currentPoint.current.x),
        y: Math.min(initialPoint.current.y, currentPoint.current.y) + dScroll,
        width: Math.abs(initialPoint.current.x - currentPoint.current.x),
        height:
          Math.abs(initialPoint.current.y - currentPoint.current.y) +
          Math.abs(dScroll),
      };
    }

    return {
      x: Math.min(initialPoint.current.x, currentPoint.current.x),
      y: Math.min(initialPoint.current.y, currentPoint.current.y),
      width: Math.abs(initialPoint.current.x - currentPoint.current.x),
      height:
        Math.abs(initialPoint.current.y - currentPoint.current.y) + dScroll,
    };
  }, [$container]);

  const onMouseDownCapture: React.MouseEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        if (!$container) return;
        initialPoint.current = {
          x: e.clientX,
          y: e.clientY,
          scrollTop: $container.scrollTop,
        };
        isMouseDown.current = true;
      },
      [$container],
    );

  const onMouseUpCapture: React.MouseEventHandler<HTMLDivElement> =
    useCallback(() => {
      setIsDragging(false);
      isMouseDown.current = false;
      if (!isDragging) return;

      if (gridList.current) {
        const total = gridList.current.children.length;
        const toUpdate: number[] = [];
        const selectionBox = getSelectionBox();

        for (let index = 0; index < total; index++) {
          const item = gridList.current.children[index];
          const bounds = item.getBoundingClientRect();

          const intersects =
            selectionBox.x <= bounds.right &&
            selectionBox.x + selectionBox.width >= bounds.left &&
            selectionBox.y <= bounds.bottom &&
            selectionBox.y + selectionBox.height >= bounds.top;
          if (intersects) {
            toUpdate.push(index);
          }
        }

        onSelection(toUpdate, isShiftKeyPressed);
      }
    }, [isDragging, getSelectionBox, isShiftKeyPressed]);

  const onMouseMoveCapture: React.MouseEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        if (!isMouseDown.current) return;
        const newPoint = {
          x: e.clientX,
          y: e.clientY,
        };

        if (!isDragging) {
          const distanceThreshold = 50;
          const isDraggingNow =
            Math.sqrt(
              (newPoint.x - initialPoint.current.x) ** 2 +
                (newPoint.y - initialPoint.current.y) ** 2,
            ) > distanceThreshold;

          if (isDraggingNow) {
            setIsDragging(true);
          } else {
            return;
          }
        }

        currentPoint.current.x = newPoint.x;
        currentPoint.current.y = newPoint.y;

        if (selectionBox.current && tileRef.current) {
          const box = getSelectionBox();

          const unknownConstantX = 8;
          const unknownConstantY = 10;

          const tile = tileRef.current.getBoundingClientRect()!;
          const x = box.x - tile.x + unknownConstantX;
          const y = box.y - tile.y + unknownConstantY;

          selectionBox.current.style.transform = `translate(${x}px, ${y}px)`;
          selectionBox.current.style.width = `${box.width}px`;
          selectionBox.current.style.height = `${box.height}px`;
        }
      },
      [isDragging, getSelectionBox],
    );

  const containerProps = useMemo(() => {
    return enabled
      ? {
          onMouseDownCapture,
          onMouseUpCapture,
          onMouseMoveCapture,
        }
      : {};
  }, [enabled, onMouseDownCapture, onMouseUpCapture, onMouseMoveCapture]);

  const selectionBoxComponent = (
    <>
      <div ref={tileRef} />
      <div
        ref={selectionBox}
        className={twMerge(
          "absolute top-0 left-0 bg-gray-200 border border-gray-300 z-50 pointer-events-none",
          isDragging ? "opacity-50" : "opacity-0",
        )}
      />
    </>
  );

  return {
    isDragging,
    selectionBox: selectionBoxComponent,
    refs: {
      gridList,
    },
    containerProps,
  };
}
