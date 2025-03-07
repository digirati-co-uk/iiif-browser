import { useLocation } from "react-router-dom";
import { useResolve } from "../context";
import { HomeIcon } from "../icons/HomeIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserHomeButton() {
  const resolve = useResolve();
  const location = useLocation();
  return (
    <BrowserToolbarButton
      isDisabled={location.pathname === "/"}
      onPress={() => resolve("iiif://home")}
    >
      <HomeIcon />
    </BrowserToolbarButton>
  );
}
