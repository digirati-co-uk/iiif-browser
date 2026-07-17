import { startTransition, useCallback, useEffect } from "react";
import { Button } from "react-aria-components";
import { useAtlasStore } from "react-iiif-vault";
import { useStore } from "zustand";

export function CropAnnotationControls() {
  const store = useAtlasStore();
  const changeMode = useStore(store, (state) => state.changeMode);
  const mode = useStore(store, (state) => state.mode);
  const completeRequest = useStore(store, (state) => state.completeRequest);
  const cancelRequest = useStore(store, (state) => state.cancelRequest);
  const tool = useStore(store, (state) => state.tool);

  const save = () => {
    startTransition(() => {
      completeRequest();
    });
  };
  const cancel = useCallback(() => {
    startTransition(() => {
      cancelRequest();
      changeMode("explore");
    });
  }, [cancelRequest, changeMode]);

  useEffect(() => {
    if (!tool.enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tool.enabled, cancel]);

  if (!tool.enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white/95 p-1 text-sm text-gray-900 shadow-lg backdrop-blur">
      {mode !== "sketch" && (
        <Button
          className="rounded-sm px-3 py-1.5 font-medium transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onPress={() => {
            changeMode("sketch");
          }}
        >
          Edit
        </Button>
      )}

      <Button
        className="rounded-sm bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onPress={save}
      >
        Save
      </Button>
      <Button
        className="rounded-sm px-3 py-1.5 font-medium transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onPress={cancel}
      >
        Cancel
      </Button>
    </div>
  );
}
