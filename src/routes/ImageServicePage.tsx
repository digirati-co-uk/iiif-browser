import { useContext, useEffect, useState } from "react";
import { ImageService } from "react-iiif-vault";
import { useSearchParams } from "react-router-dom";
import { CanvasControls } from "../components/CanvasControls";
import { CurrentCanvasRefinement } from "../components/CurrentCanvasRefinement";
import { OutputContext, useBrowserEmitter, useMode } from "../context";

export function ImageServicePage() {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("id");
  const outputCtx = useContext(OutputContext);
  const emitter = useBrowserEmitter();
  const { mode, setEditMode } = useMode();
  const editMode = mode === "sketch";

  useEffect(() => {
    if (serviceId) {
      emitter.emit("image-service.change", { id: serviceId });
    }
  }, [serviceId, emitter]);

  if (!serviceId) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="atlas-viewer-container flex w-full flex-1 h-full">
        <ImageService
          renderPreset={"default-preset"}
          src={serviceId}
          fluid
          mode={editMode ? "sketch" : "explore"}
          renderViewerControls={() => <CanvasControls />}
          className="flex-1"
          // @ts-ignore
          height={"auto"}
        >
          <OutputContext.Provider value={outputCtx}>
            <CurrentCanvasRefinement
              id={serviceId}
              editMode={editMode}
              setEditMode={setEditMode}
            />
          </OutputContext.Provider>
        </ImageService>
      </div>
    </div>
  );
}
