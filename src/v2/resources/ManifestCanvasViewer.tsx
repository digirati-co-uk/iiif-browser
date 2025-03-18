import { useContext, useEffect, useState } from "react";
import {
  CanvasPanel,
  SequenceThumbnails,
  useManifest,
  useSimpleViewer,
} from "react-iiif-vault";
import { useNavigate } from "react-router-dom";
import { CurrentCanvasRefinement } from "../components/CurrentCanvasRefinement";
import { OutputContext, useCanvasOutputSelector } from "../context";

export function ManifestCanvasViewer() {
  const manifest = useManifest()!;
  const outputCtx = useContext(OutputContext);
  const { sequence, items, currentSequenceIndex } = useSimpleViewer();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);

  const current = sequence[currentSequenceIndex];
  const canvas = items[current[0]];
  const currentCanvasSelector = useCanvasOutputSelector(canvas);
  const xywh = currentCanvasSelector
    ? [
        ~~currentCanvasSelector.spatial.x,
        ~~currentCanvasSelector.spatial.y,
        ~~currentCanvasSelector.spatial.width,
        ~~currentCanvasSelector.spatial.height,
      ].join(",")
    : "";

  useEffect(() => {
    if (canvas) {
      const search = new URLSearchParams();
      search.set("id", manifest.id);
      search.set("canvas", canvas.id);
      if (currentCanvasSelector && (true as boolean)) {
        search.set("xywh", xywh);
      }

      navigate(
        {
          search: search.toString(),
        },
        { replace: true },
      );
    }
  }, [canvas, navigate, items, xywh]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-1 min-h-0">
        <CanvasPanel.Viewer
          height={"auto"}
          mode={editMode ? "sketch" : "explore"}
        >
          <CanvasPanel.RenderCanvas>
            <OutputContext.Provider value={outputCtx}>
              <CurrentCanvasRefinement
                editMode={editMode}
                setEditMode={setEditMode}
              />
            </OutputContext.Provider>
          </CanvasPanel.RenderCanvas>
        </CanvasPanel.Viewer>
      </div>
      <button onClick={() => setEditMode(!editMode)}>
        {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
      </button>
      <div className="flex-shrink-0 h-32 items-center flex">
        <SequenceThumbnails
          classes={{
            container: "flex gap-1 overflow-x-auto items-center px-[50%]",
            row: "flex gap-2 border border-gray-200 flex-none h-24 w-24 items-center justify-center rounded overflow-hidden p-1",
            img: "max-h-24 max-w-24 object-contain h-full w-full",
            selected: {
              row: "flex gap-2 border border-blue-400 flex-none bg-blue-100 h-24 w-24 items-center justify-center rounded overflow-hidden p-1",
            },
          }}
        />
      </div>
    </div>
  );
}
