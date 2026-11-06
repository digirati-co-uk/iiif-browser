import { type PointerEvent, useEffect, useMemo, useRef } from "react";

/** The pointer must rest on a link this long before its preview appears. */
export const PREVIEW_OPEN_DELAY = 450;
/** Grace period for crossing the gap between a link and its preview. */
export const PREVIEW_CLOSE_DELAY = 280;

// Only one hover preview may be open at a time, across every notebook on the page.
let closeActivePreview: (() => void) | null = null;

interface HoverIntentOptions {
  isOpen: boolean;
  open(): void;
  close(): void;
  /** Keep the preview open while focus is inside it (keyboard users). */
  keepOpen?(): boolean;
  openDelay?: number;
  closeDelay?: number;
}

/**
 * "Hover intent" for link previews.
 *
 * Opening on `mouseenter` makes dense text unusable: every link the pointer
 * crosses throws a popup over the words underneath. Instead the preview opens
 * only once the pointer comes to rest on a link, never while a mouse button is
 * held (selecting text), and never for touch, which has the explicit preview
 * button instead.
 */
export function useHoverIntent(options: HoverIntentOptions) {
  const latest = useRef(options);
  latest.current = options;
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!options.isOpen) return;
    const close = () => latest.current.close();
    if (closeActivePreview && closeActivePreview !== close)
      closeActivePreview();
    closeActivePreview = close;
    return () => {
      if (closeActivePreview === close) closeActivePreview = null;
    };
  }, [options.isOpen]);

  return useMemo(() => {
    const ignores = (event: PointerEvent) =>
      event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.buttons !== 0;
    const scheduleOpen = () => {
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(
        () => latest.current.open(),
        latest.current.openDelay ?? PREVIEW_OPEN_DELAY,
      );
    };
    const scheduleClose = () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      if (!latest.current.isOpen) return;
      closeTimer.current = setTimeout(() => {
        if (!latest.current.keepOpen?.()) latest.current.close();
      }, latest.current.closeDelay ?? PREVIEW_CLOSE_DELAY);
    };
    const cancel = () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    };
    return {
      cancel,
      triggerProps: {
        onPointerEnter(event: PointerEvent) {
          if (ignores(event)) return;
          clearTimeout(closeTimer.current);
          if (!latest.current.isOpen) scheduleOpen();
        },
        onPointerMove(event: PointerEvent) {
          // Moving restarts the countdown: only a resting pointer opens it.
          if (ignores(event)) return clearTimeout(openTimer.current);
          clearTimeout(closeTimer.current);
          if (!latest.current.isOpen) scheduleOpen();
        },
        onPointerDown: cancel,
        onPointerLeave(event: PointerEvent) {
          if (event.pointerType === "touch") return;
          scheduleClose();
        },
      },
      popupProps: {
        onPointerEnter() {
          clearTimeout(closeTimer.current);
        },
        onPointerLeave(event: PointerEvent) {
          if (event.pointerType === "touch") return;
          scheduleClose();
        },
      },
    };
  }, []);
}
