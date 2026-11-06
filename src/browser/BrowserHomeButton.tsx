import { useLastUrl, useResolve } from "../context";
import { HomeIcon } from "../icons/HomeIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserHomeButton({ href }: { href?: string }) {
  const resolve = useResolve();
  const lastUrl = useLastUrl();
  const homeUrl = href || "iiif://home";

  return (
    <BrowserToolbarButton
      isDisabled={homeUrl === lastUrl}
      onPress={() => resolve(homeUrl)}
      aria-label="Go Home"
    >
      <HomeIcon />
    </BrowserToolbarButton>
  );
}
