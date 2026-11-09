import { useBrowserI18n } from "../i18n";
import { useCallback, useEffect, useRef } from "react";
import {
  Button,
  type ButtonProps,
  Group,
  Toolbar,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";
import {
  type AnnotationResponse,
  useCanvas,
  useRequestAnnotation,
  useViewerPreset,
} from "react-iiif-vault";
import {
  useCanvasOutputRotation,
  useCanvasOutputSelector,
  useLinkConfig,
  useMode,
  useRefineSelectedItem,
  useSetRotation,
} from "../context";
import { CropIcon } from "../icons/CropIcon";
import { DeleteForeverIcon } from "../icons/DeleteForeverIcon";
import { HomeIcon } from "../icons/HomeIcon";
import { MinusIcon } from "../icons/MinusIcon";
import { PlusIcon } from "../icons/PlusIcon";
import { ReloadIcon } from "../icons/ReloadIcon";
import { MultiImageIcon } from "../icons/MultiImageIcon";
import {
  resetViewerHome,
  rotateViewerTo,
} from "../utilities/viewer-navigation";
import { CanvasImageSourceSelect } from "./CanvasImageSourceSelect";
import { CropAnnotationControls } from "./CropAnnotationControls";

function ViewControl({ label, ...props }: ButtonProps & { label: string }) {
  return (
    <TooltipTrigger delay={500}>
      <Button {...props} aria-label={label} />
      <Tooltip
        placement="left"
        offset={8}
        className="iiif-browser-viewer-tooltip"
      >
        {label}
      </Tooltip>
    </TooltipTrigger>
  );
}

export function CanvasControls({
  id,
  thumbnails,
}: {
  id?: string;
  thumbnails?: { visible: boolean; controls: string; onToggle(): void };
}) {
  const { t: translate } = useBrowserI18n();
  const canvas = useCanvas();
  const preset = useViewerPreset();
  const { canCropImage } = useLinkConfig();
  const setRotation = useSetRotation();
  const { mode, setEditMode } = useMode();
  const subject = id ? { id } : canvas;
  const rotation = useCanvasOutputRotation(subject);
  const canvasOutputSelector = useCanvasOutputSelector(subject);
  const refine = useRefineSelectedItem();
  const editMode = mode === "sketch";
  const t = useRequestAnnotation();
  const cancelRequest = useRef(t.cancelRequest);
  cancelRequest.current = t.cancelRequest;

  const saveAnnotationResponse = useCallback(
    (resp: AnnotationResponse | null) => {
      if (!resp?.cancelled && resp?.boundingBox) {
        // Camera rotation preserves Canvas coordinates, including pointer input.
        const spatial = resp.boundingBox;
        if (id) {
          refine(id, {
            type: "BoxSelector",
            spatial,
          });
        } else if (canvas) {
          refine(canvas.id, {
            type: "BoxSelector",
            spatial,
          });
        }
      }
      setEditMode(false);
    },
    [id, canvas, refine, setEditMode],
  );

  useEffect(() => () => cancelRequest.current(), []);

  useEffect(() => {
    if (!preset) return;
    const enabled = preset.runtime.touchRotationEnabled;
    // Rotation is controlled by selection state, so exported state matches the view.
    preset.runtime.setTouchRotationEnabled(false);
    return () => preset.runtime.setTouchRotationEnabled(enabled);
  }, [preset]);

  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  useEffect(() => {
    if (!preset) return;
    rotateViewerTo(preset.runtime, rotation);
  }, [preset, rotation]);

  useEffect(() => {
    if (!preset) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        resetViewerHome(preset.runtime, rotationRef.current),
      );
    };
    fit();
    // Fit after Atlas processes the new size, including its initial default viewport.
    const observer = new ResizeObserver(fit);
    const surface = preset.canvas || preset.container;
    if (surface) observer.observe(surface);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [preset]);

  if (editMode) {
    return null;
  }

  const startCrop = () =>
    t
      .requestAnnotation({
        type: "box",
        ...(canvasOutputSelector
          ? { selector: canvasOutputSelector.spatial }
          : {}),
        ...(canvas
          ? {
              bounds: {
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height,
              },
            }
          : {}),
        annotationPopup: <CropAnnotationControls />,
      })
      .then(saveAnnotationResponse)
      .catch(() => setEditMode(false));

  return (
    <Toolbar aria-label="Viewer controls" className="ib-viewer-controls">
      <Group aria-label="Image tools" className="ib-viewer-controls__tools">
        <CanvasImageSourceSelect />
        {canCropImage && canvasOutputSelector ? (
          <>
            <Button
              className="ib-viewer-controls__edit"
              aria-label={translate("editCrop", "Edit crop")}
              onPress={startCrop}
            >
              <CropIcon />
              <span>{translate("editCrop", "Edit crop")}</span>
            </Button>
            <Button
              className="ib-viewer-controls__delete"
              aria-label={translate("removeCrop", "Remove crop")}
              onPress={() => {
                if (confirm("Remove crop?"))
                  refine(id || canvas?.id || "", null);
              }}
            >
              <DeleteForeverIcon />
            </Button>
          </>
        ) : null}
      </Group>
      <Group
        aria-label="Zoom and view controls"
        className="ib-viewer-controls__zoom"
      >
        <ViewControl
          data-secondary
          data-action="home"
          label={translate("resetView", "Reset view")}
          onPress={() =>
            preset && resetViewerHome(preset.runtime, rotation, false)
          }
        >
          <HomeIcon />
        </ViewControl>
        {thumbnails ? (
          <ViewControl
            data-secondary
            data-action="thumbnails"
            label={
              thumbnails.visible
                ? translate("hideThumbnails", "Hide thumbnails")
                : translate("showThumbnails", "Show thumbnails")
            }
            aria-expanded={thumbnails.visible}
            aria-controls={thumbnails.controls}
            onPress={thumbnails.onToggle}
          >
            <MultiImageIcon />
          </ViewControl>
        ) : null}
        {canCropImage && !canvasOutputSelector ? (
          <ViewControl
            data-secondary
            data-action="crop"
            label={translate("cropImage", "Crop image")}
            onPress={startCrop}
          >
            <CropIcon />
          </ViewControl>
        ) : null}
        <ViewControl
          data-secondary
          data-action="rotate"
          label="Rotate clockwise"
          onPress={() =>
            setRotation(id || canvas?.id || "", (rotation + 90) % 360)
          }
        >
          <ReloadIcon />
        </ViewControl>
        <ViewControl
          data-action="in"
          label={translate("zoomIn", "Zoom in")}
          onPress={() => preset?.runtime.world.zoomTo(0.5)}
        >
          <PlusIcon />
        </ViewControl>
        <ViewControl
          data-action="out"
          label={translate("zoomOut", "Zoom out")}
          onPress={() => preset?.runtime.world.zoomTo(1 / 0.5)}
        >
          <MinusIcon />
        </ViewControl>
      </Group>
    </Toolbar>
  );
}
