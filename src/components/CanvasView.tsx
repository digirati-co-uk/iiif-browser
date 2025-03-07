import { useStore } from "zustand";
import {
  CanvasContext,
  CanvasPanel,
  ManifestContext,
  useCanvas,
  useManifest,
} from "react-iiif-vault";
import { useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { type BoxStyle, DrawBox, RegionHighlight } from "@atlas-viewer/atlas";
import { useExplorerStore } from "../IIIFBrowser.store";
import styles from "../styles/CanvasView.module.css";
// import { ViewControls } from "@manifest-editor/ui/ViewControls";
// import { MediaControls } from "@manifest-editor/ui/MediaControls";
import { startViewTransition } from "../utils";

interface CanvasInnerViewProps {
  highlightStyle?: BoxStyle;
  regionEnabled?: boolean;
}

export function CanvasViewInner({
  highlightStyle,
  regionEnabled,
}: CanvasInnerViewProps) {
  const manifest = useManifest();
  const canvas = useCanvas();
  const [editMode, setEditMode] = useState(false);
  const store = useExplorerStore();
  const setCurrentSelector = useStore(store, (s) => s.setCurrentSelector);
  const selected = useStore(store, (s) => s.selected);
  const replace = useStore(store, (s) => s.replace);
  const container = useRef<HTMLDivElement>(null);

  // "Edit mode" if CanvasRegion or ImageServiceRegion is supported
  // Need new state for the box?

  invariant(canvas);

  // useLayoutEffect(() => {
  //   if (container.current) {
  //     (container.current as any).style.viewTransitionName = canvas.id;
  //   }
  // }, [canvas.id]);

  const index = useMemo(() => {
    return manifest ? manifest.items.findIndex((c) => c.id === canvas.id) : -1;
  }, [canvas.id, manifest]);

  const next = useMemo(() => {
    return index !== -1 ? manifest?.items[index + 1] : undefined;
  }, [index, manifest]);
  const prev = useMemo(() => {
    return index !== -1 ? manifest?.items[index - 1] : undefined;
  }, [index, manifest]);

  return (
    <div className={styles.CanvasContainer} ref={container}>
      <CanvasPanel.Viewer
        key={canvas.id}
        // onCreated={(preset) => void (runtime.current = preset.runtime)}
        // renderPreset={config}
        mode={editMode ? "sketch" : "explore"}
      >
        <CanvasContext canvas={canvas.id}>
          <CanvasPanel.RenderCanvas
            strategies={["empty", "images", "media", "textual-content"]}
            // renderViewerControls={() => (
            //   <ViewControls
            //     editMode={editMode}
            //     enableNavigation={index !== -1}
            //     toggleEditMode={regionEnabled ? () => setEditMode((e) => !e) : undefined}
            //     onNext={next ? () => startViewTransition(() => replace(next)) : undefined}
            //     onPrevious={prev ? () => startViewTransition(() => replace(prev)) : undefined}
            //     clearSelection={() => setCurrentSelector(undefined)}
            //     style={{ fontSize: "0.85em" }}
            //   />
            // )}
            viewControlsDeps={[regionEnabled, editMode, index, next, prev]}
            // renderMediaControls={() => <MediaControls />}
            backgroundStyle={{ background: "#fff" }}
            alwaysShowBackground
            // onClickPaintingAnnotation={onClickPaintingAnnotation}
          >
            {editMode && !selected?.selector ? (
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

            {selected?.selector && selected?.selector.type === "BoxSelector" ? (
              <RegionHighlight
                region={{ ...selected?.selector.spatial } as any}
                isEditing={true}
                onSave={(bounds) =>
                  setCurrentSelector({ type: "BoxSelector", spatial: bounds })
                }
                style={
                  highlightStyle
                    ? highlightStyle
                    : {
                        border: "1px solid red",
                        background: "rgba(255, 255, 255, .1)",
                      }
                }
                disableCardinalControls
                onClick={() => void 0}
              />
            ) : null}

            {/*{!currentlyEditingAnnotation && resources.length*/}
            {/*  ? resources.map((resource) => <Highlight key={resource} id={resource} />)*/}
            {/*  : null}*/}
            {/*{currentlyEditingAnnotation && editMode ? (*/}
            {/*  <AnnotationContext annotation={currentlyEditingAnnotation}>*/}
            {/*    <AnnotationTargetEditor />*/}
            {/*  </AnnotationContext>*/}
            {/*) : null}*/}
          </CanvasPanel.RenderCanvas>
        </CanvasContext>
        {/*{rightPanel.current === "canvas-properties" && rightPanel.state.current === 5 && (*/}
        {/*  <Annotations canvasId={state.canvasId} />*/}
        {/*)}*/}
      </CanvasPanel.Viewer>
    </div>
  );
}

export function CanvasView(props: CanvasInnerViewProps) {
  const store = useExplorerStore();
  const selected = useStore(store, (s) => s.selected);
  const previous = useStore(store, (s) => {
    return s.history.length > 1 ? s.history[s.history.length - 2] : undefined;
  });

  if (!selected || selected.type !== "Canvas" || !selected.id) {
    return null;
  }

  const canvas = (
    <CanvasContext canvas={selected.id}>
      <CanvasViewInner {...props} />
    </CanvasContext>
  );

  if (previous && previous.type === "Manifest") {
    return <ManifestContext manifest={previous.id}>{canvas}</ManifestContext>;
  }

  return canvas;
}
