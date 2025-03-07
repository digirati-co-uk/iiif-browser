import { useSearchParams } from "react-router-dom";
import { useLoadResource } from "../context";
import { ReloadIcon } from "../icons/ReloadIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserReloadButton() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const loadResource = useLoadResource();

  return (
    <BrowserToolbarButton isDisabled={!id} onPress={() => loadResource(id)}>
      <ReloadIcon />
    </BrowserToolbarButton>
  );
}
