import { startTransition } from "react";
import { Button } from "react-aria-components";
import { useAtlasStore } from "react-iiif-vault";
import { useStore } from "zustand";

export function CropAnnotationControls() {
  const store = useAtlasStore();
  const changeMode = useStore(store, (state) => state.changeMode);
  const mode = useStore(store, (state) => state.mode);
  const completeRequest = useStore(store, (state) => state.completeRequest);
  const tool = useStore(store, (state) => state.tool);

  const save = () => {
    startTransition(() => {
      completeRequest();
    });
  };

  if (!tool.enabled) {
    return null;
  }

  return (
    <div className="svg-tools-container animate-fadeIn">
      {mode !== "sketch" && (
        <Button
          className="svg-tools-button"
          onPress={() => {
            changeMode("sketch");
          }}
        >
          Edit
        </Button>
      )}

      <Button className="svg-tools-button" onPress={save}>
        Save
      </Button>
    </div>
  );
}
