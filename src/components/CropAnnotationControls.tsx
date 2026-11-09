import { useBrowserI18n } from "../i18n";
import { startTransition, useCallback, useEffect } from "react";
import { Button } from "react-aria-components";
import { useAtlasStore } from "react-iiif-vault";
import { useStore } from "zustand";

export function CropAnnotationControls() {
  const { t } = useBrowserI18n();
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
          {t("edit", "Edit")}
        </Button>
      )}

      <Button
        className="rounded-sm bg-accent px-3 py-1.5 font-medium text-accent-text shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onPress={save}
      >
        {t("save", "Save")}
      </Button>
      <Button
        className="rounded-sm px-3 py-1.5 font-medium transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onPress={cancel}
      >
        {t("cancel", "Cancel")}
      </Button>
    </div>
  );
}
