import { useLocation } from "react-router-dom";
import { useLastUrl, useResolve } from "../context";
import { HomeIcon } from "../icons/HomeIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserHomeButton({ href }: { href: string }) {
  const resolve = useResolve();
  const location = useLocation();
  const lastUrl = useLastUrl();

  return (
    <BrowserToolbarButton
      isDisabled={href === lastUrl}
      onPress={() => resolve(href)}
      aria-label="Go Home"
    >
      <HomeIcon />
    </BrowserToolbarButton>
  );
}
