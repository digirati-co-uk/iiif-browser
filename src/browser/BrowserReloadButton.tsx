import { useBrowserI18n } from "../i18n";
import { useLoadResource, useSearchParams } from "../context";
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
  const { t } = useBrowserI18n();
  const [searchParams] = useSearchParams();
  const reloadRequest = getReloadRequest(searchParams);
  const loadResource = useLoadResource();

  return (
    <BrowserToolbarButton
      aria-label={t("reloadResource", "Reload resource")}
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
