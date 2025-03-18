import { BoxStyle, DrawBox } from "@atlas-viewer/atlas";
import {
  useCanvasOutputSelector,
  useOutputStore,
  useRefineSelectedItem,
} from "../context";
import { RegionHighlight } from "./RegionHighlight";
import { BoxSelector, useCanvas } from "react-iiif-vault";
import { useStore } from "zustand";
import { useCallback } from "react";

export function CurrentCanvasRefinement({
  highlightStyle,
  editMode,
  setEditMode,
}: {
  highlightStyle?: BoxStyle;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}) {
  const canvas = useCanvas();
  const refineSelectedItem = useRefineSelectedItem();
  const currentCanvasSelector = useCanvasOutputSelector(canvas);
  const setCurrentSelector = useCallback(
    (selector: BoxSelector) => {
      if (!canvas) return;
      refineSelectedItem(canvas.id, selector);
      // Add to URL?
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
