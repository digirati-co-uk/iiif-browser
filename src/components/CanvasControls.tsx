import { useCallback } from "react";
import { Button, Toolbar } from "react-aria-components";
import {
  type AnnotationResponse,
  BoxSelector,
  useCanvas,
  useRequestAnnotation,
  useViewerPreset,
} from "react-iiif-vault";
import {
  useBrowserConfig,
  useCanvasOutputRotation,
  useCanvasOutputSelector,
  useLinkConfig,
  useMode,
  useRefineSelectedItem,
  useSetRotation,
  useUIConfig,
} from "../context";
import { CropIcon } from "../icons/CropIcon";
import { DeleteForeverIcon } from "../icons/DeleteForeverIcon";
import { HandIcon } from "../icons/HandIcon";
import { HomeIcon } from "../icons/HomeIcon";
import { MinusIcon } from "../icons/MinusIcon";
import { PlusIcon } from "../icons/PlusIcon";
import { ReloadIcon } from "../icons/ReloadIcon";
import { paste } from "../utilities/paste-util";
import { CropAnnotationControls } from "./CropAnnotationControls";

export function CanvasControls({ id }: { id?: string }) {
  const canvas = useCanvas();
  const preset = useViewerPreset();
  const { canCropImage } = useLinkConfig();
  const setRotation = useSetRotation();
  const { mode, setEditMode } = useMode();
  const rotation = useCanvasOutputRotation(canvas);
  const canvasOutputSelector = useCanvasOutputSelector(canvas);
  const refine = useRefineSelectedItem();
  const editMode = mode === "sketch";
  const canvasButton = paste();
  const t = useRequestAnnotation();

  const saveAnnotationResponse = useCallback(
    (resp: AnnotationResponse | null) => {
      if (!resp?.cancelled && resp?.boundingBox) {
        if (id) {
          refine(id, {
            type: "BoxSelector",
            spatial: resp.boundingBox,
          });
        } else if (canvas) {
          refine(canvas.id, {
            type: "BoxSelector",
            spatial: resp.boundingBox,
          });
        }
      }
      setEditMode(false);
    },
    [id, canvas, refine, setEditMode],
  );

  return (
    <Toolbar className="absolute bottom-0 flex gap-1 p-2 z-50">
      <Button
        className={canvasButton.c(
          "disabled:opacity-40 bg-white/80 hover:bg-white/100 text-black text-2xl flex gap-2 items-center px-2 py-1 rounded-sm",
        )}
        onPress={() => preset?.runtime.world.zoomTo(0.75)}
      >
        <PlusIcon />
      </Button>
      <Button
        className={canvasButton.v()}
        onPress={() => preset?.runtime.world.zoomTo(1 / 0.75)}
      >
        <MinusIcon />
      </Button>
      <Button
        className={canvasButton.v()}
        onPress={() => preset?.runtime.world.goHome()}
      >
        <HomeIcon />
      </Button>
      <Button
        className={canvasButton.v()}
        onPress={() => {
          setRotation(id || canvas?.id || "", (rotation + 90) % 360);
        }}
      >
        <ReloadIcon />
      </Button>

      {canCropImage ? (
        <>
          <Button
            className={canvasButton.v()}
            isDisabled={editMode && !canvasOutputSelector}
            onPress={() =>
              t
                .requestAnnotation({
                  type: "box",
                  selector: canvasOutputSelector?.spatial!,
                  annotationPopup: <CropAnnotationControls />,
                })
                .then(saveAnnotationResponse)
            }
          >
            {canvasOutputSelector ? (
              <span className="text-sm">
                {" "}
                {editMode ? "Confirm" : "Edit crop"}
              </span>
            ) : (
              <CropIcon />
            )}
          </Button>
          <Button
            className={canvasButton.v()}
            isDisabled={!editMode}
            onPress={() => setEditMode(false)}
          >
            <HandIcon />
          </Button>
          <Button
            className={canvasButton.v()}
            isDisabled={!canvasOutputSelector}
            onPress={() => {
              if (confirm("Remove crop?")) {
                if (id) {
                  refine(id, null);
                } else if (canvas) {
                  refine(canvas.id, null);
                }
              }
            }}
          >
            <DeleteForeverIcon />
          </Button>
        </>
      ) : null}
    </Toolbar>
  );
}
