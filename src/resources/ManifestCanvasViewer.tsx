import { ModeContext, ModeProvider } from "@atlas-viewer/atlas";
import { useContext, useEffect, useId, useState } from "react";
import {
  CanvasPanel,
  SequenceThumbnails,
  useManifest,
  useSimpleViewer,
} from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { CanvasControls } from "../components/CanvasControls";
import { CanvasThumbnailFallback } from "../components/CanvasThumbnailFallback";
import { CurrentCanvasRefinement } from "../components/CurrentCanvasRefinement";
import { MediaControls } from "../components/MediaControls";
import {
  OutputContext,
  useCanvasOutputRotation,
  useCanvasOutputSelector,
  useLocation,
  useMode,
  useNavigate,
} from "../context";
import { ArrowBackIcon } from "../icons/ArrowBackIcon";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { MultiImageIcon } from "../icons/MultiImageIcon";

export function ManifestCanvasViewer() {
  const manifest = useManifest()!;
  const outputCtx = useContext(OutputContext);
  const {
    sequence,
    items,
    currentSequenceIndex,
    hasNext,
    hasPrevious,
    nextCanvas,
    previousCanvas,
  } = useSimpleViewer();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setEditMode } = useMode();
  const editMode = mode === "sketch";
  const [showThumbnails, setShowThumbnails] = useState(true);
  const thumbnailStripId = useId();

  const current = sequence[currentSequenceIndex];
  const canvas = items[current[0]];
  const currentCanvasSelector = useCanvasOutputSelector(canvas);
  const rotation = useCanvasOutputRotation(canvas);
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
      if (xywh) {
        search.set("xywh", xywh);
      }
      const nextSearch = search.toString();
      const currentSearch = location.search.replace(/^\?/, "");

      if (nextSearch === currentSearch) {
        return;
      }

      navigate(
        {
          search: nextSearch,
        },
        { replace: true },
      );
    }
  }, [canvas, location.search, manifest.id, navigate, xywh]);

  return (
    <div className="flex h-full flex-col">
      <div className="group relative flex w-full flex-1 min-h-0 flex-col">
        <ModeProvider mode={mode}>
          <CanvasPanel.Viewer height={"auto"} mode={mode}>
            <ModeContext.Provider value={mode}>
              <CanvasPanel.RenderCanvas
                strategies={["empty", "images", "media", "textual-content"]}
                renderViewerControls={() => <CanvasControls />}
                renderMediaControls={() => <MediaControls />}
                rotation={rotation}
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
        {sequence.length > 1 ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between p-3 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <button
              type="button"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-2xl text-gray-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={previousCanvas}
              disabled={!hasPrevious}
              aria-label="Previous page"
            >
              <ArrowBackIcon />
            </button>
            <button
              type="button"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-2xl text-gray-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={nextCanvas}
              disabled={!hasNext}
              aria-label="Next page"
            >
              <ArrowForwardIcon />
            </button>
          </div>
        ) : null}
      </div>
      {sequence.length > 1 ? (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            className="absolute right-2 -top-10 z-30 flex h-8 items-center gap-1 rounded-sm border border-gray-300 bg-white/95 px-2 text-sm text-gray-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setShowThumbnails((show) => !show)}
            aria-expanded={showThumbnails}
            aria-controls={thumbnailStripId}
          >
            <MultiImageIcon className="text-lg" />
            {showThumbnails ? "Hide thumbnails" : "Show thumbnails"}
          </button>
          <div
            id={thumbnailStripId}
            className={twMerge(
              "overflow-hidden border-t border-gray-200 bg-white transition-[max-height,opacity] duration-200 ease-in-out",
              showThumbnails ? "max-h-32 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="flex h-32 items-center">
              <SequenceThumbnails
                fallback={<CanvasThumbnailFallback />}
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
        </div>
      ) : null}
    </div>
  );
}
