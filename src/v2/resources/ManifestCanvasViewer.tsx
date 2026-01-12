import { useContext, useEffect, useState } from "react";
import {
  CanvasPanel,
  SequenceThumbnails,
  useManifest,
  useSimpleViewer,
} from "react-iiif-vault";
import { useNavigate } from "react-router-dom";
import { CurrentCanvasRefinement } from "../components/CurrentCanvasRefinement";
import { OutputContext, useCanvasOutputSelector, useMode } from "../context";
import { CanvasControls } from "../components/CanvasControls";
import { ModeContext, ModeProvider } from "@atlas-viewer/atlas";
import { MediaControls } from "../components/MediaControls";

export function ManifestCanvasViewer() {
  const manifest = useManifest()!;
  const outputCtx = useContext(OutputContext);
  const { sequence, items, currentSequenceIndex } = useSimpleViewer();
  const navigate = useNavigate();
  const { mode, setEditMode } = useMode();
  const editMode = mode === "sketch";

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
        <ModeProvider mode={mode}>
          <CanvasPanel.Viewer height={"auto"} mode={mode}>
            <ModeContext.Provider value={mode}>
              <CanvasPanel.RenderCanvas
                strategies={["empty", "images", "media", "textual-content"]}
                renderViewerControls={() => <CanvasControls />}
                renderMediaControls={() => <MediaControls />}
              >
                  <OutputContext.Provider value={outputCtx}>
                    <CurrentCanvasRefinement
                      editMode={editMode}
                      setEditMode={setEditMode}
                    />
                  </OutputContext.Provider>
              </CanvasPanel.RenderCanvas>
            </ModeContext.Provider>
          </CanvasPanel.Viewer>
        </ModeProvider>
      </div>
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
