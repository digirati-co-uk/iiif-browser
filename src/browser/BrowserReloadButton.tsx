import { useSearchParams } from "react-router-dom";
import { useLoadResource } from "../context";
import { ReloadIcon } from "../icons/ReloadIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function getReloadRequest(searchParams: URLSearchParams) {
  const id = searchParams.get("id");
  if (!id) {
    return null;
  }

  return {
    id,
    viewSource: searchParams.get("view-source") === "true",
    searchParams: new URLSearchParams(searchParams),
  };
}

export function BrowserReloadButton() {
  const [searchParams] = useSearchParams();
  const reloadRequest = getReloadRequest(searchParams);
  const loadResource = useLoadResource();

  return (
    <BrowserToolbarButton
      aria-label="Reload resource"
      isDisabled={!reloadRequest}
      onPress={() => {
        if (!reloadRequest) {
          return;
        }
        loadResource(reloadRequest.id, {
          viewSource: reloadRequest.viewSource,
          searchParams: reloadRequest.searchParams,
        });
      }}
    >
      <ReloadIcon />
    </BrowserToolbarButton>
  );
}
