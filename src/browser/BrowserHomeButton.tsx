import { useBrowserI18n } from "../i18n";
import { useLastUrl, useResolve } from "../context";
import { HomeIcon } from "../icons/HomeIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserHomeButton({ href }: { href?: string }) {
 const { t } = useBrowserI18n();
  const resolve = useResolve();
  const lastUrl = useLastUrl();
  const homeUrl = href || "iiif://home";

  return (
    <BrowserToolbarButton
      isDisabled={homeUrl === lastUrl}
      onPress={() => resolve(homeUrl)}
      aria-label={t("goHome", "Go Home")}
    >
      <HomeIcon />
    </BrowserToolbarButton>
  );
}
