import type { BoxStyle } from "@atlas-viewer/atlas";
import { useMemo } from "react";
import { useCanvas } from "react-iiif-vault";
import { useCanvasOutputSelector, useMode } from "../context";
import { RegionHighlight } from "./RegionHighlight";

export function CurrentCanvasRefinement({
  id,
  highlightStyle,
}: {
  id?: string;
  highlightStyle?: BoxStyle;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}) {
  const inputCanvas = useCanvas();
  const mode = useMode();
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

  return (
    <>
      {currentCanvasSelector?.type === "BoxSelector" &&
      mode.mode === "explore" ? (
        <RegionHighlight
          region={{ ...currentCanvasSelector.spatial } as any}
          isEditing={false}
          onSave={() => {}}
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
