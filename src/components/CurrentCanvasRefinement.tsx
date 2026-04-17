import { type BoxStyle, DrawBox } from "@atlas-viewer/atlas";
import { useCallback, useMemo } from "react";
import { type BoxSelector, useCanvas } from "react-iiif-vault";
import { useStore } from "zustand";
import {
  useCanvasOutputSelector,
  useOutputStore,
  useRefineSelectedItem,
} from "../context";
import { RegionHighlight } from "./RegionHighlight";

export function CurrentCanvasRefinement({
  id,
  highlightStyle,
  editMode,
  setEditMode,
}: {
  id?: string;
  highlightStyle?: BoxStyle;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}) {
  const inputCanvas = useCanvas();
  const refineSelectedItem = useRefineSelectedItem();
  const canvas = useMemo(() => {
    if (id) {
      return { id };
    }
    if (inputCanvas) {
      return inputCanvas;
    }
    return null;
  }, [id, inputCanvas]);
  const currentCanvasSelector = useCanvasOutputSelector(canvas);
  const setCurrentSelector = useCallback(
    (selector: BoxSelector) => {
      if (canvas) {
        refineSelectedItem(canvas.id, selector);
        return;
      }
    },
    [canvas, refineSelectedItem],
  );

  return (
    <>
      {editMode && !currentCanvasSelector ? (
        <DrawBox
          onCreate={(bounds) => {
            if (canvas) {
              setCurrentSelector({
                type: "BoxSelector",
                spatial: bounds,
              });
              setEditMode(false);
            }
          }}
        />
      ) : null}

      {currentCanvasSelector?.type === "BoxSelector" ? (
        <RegionHighlight
          region={{ ...currentCanvasSelector.spatial } as any}
          isEditing={true}
          onSave={(bounds) =>
            setCurrentSelector({ type: "BoxSelector", spatial: bounds })
          }
          style={
            highlightStyle
              ? highlightStyle
              : {
                  outline: "2px solid #4E80EE",
                  background: "rgba(255, 255, 255, .1)",
                }
          }
          disableCardinalControls
          onClick={() => void 0}
        />
      ) : null}
    </>
  );
}
