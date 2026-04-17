import { useLayoutEffect } from "react";
import { SkipToContent } from "../components/SkipToContent";
import { useUIConfig } from "../context";
import { BrowserBackButton } from "./BrowserBackButton";
import { useBrowserContainer } from "./BrowserContainer";
import { BrowserContextMenu } from "./BrowserContextMenu";
import { BrowserForwardButton } from "./BrowserForwardButton";
import { BrowserHomeButton } from "./BrowserHomeButton";
import { BrowserReloadButton } from "./BrowserReloadButton";
import { BrowserUrlBox } from "./BrowserUrlBox";

export function BrowserHeader() {
  const {
    menuButton,
    backButton,
    bookmarkButton,
    reloadButton,
    forwardButton,
    homeButton,
    defaultPages,
    homeLink,
  } = useUIConfig();
  const container = useBrowserContainer();

  const iconCount = (
    (backButton ? 1 : 0) +
    (forwardButton ? 1 : 0) +
    (reloadButton ? 1 : 0) +
    (homeButton ? 1 : 0)
  );

  useLayoutEffect(() => {
    if (container) {
      container.style.setProperty('--ib-icon-count', `${iconCount}`);
    }
  }, [container, iconCount]);

  return (
    <div className="flex w-full items-center justify-between border-b shadow-sm gap-1 px-1">
      <SkipToContent />
      {(defaultPages.homepage || homeLink) && homeButton && (
        <BrowserHomeButton href={homeLink} />
      )}
      {backButton && <BrowserBackButton />}
      {forwardButton && <BrowserForwardButton />}
      {reloadButton && <BrowserReloadButton />}
      <BrowserUrlBox showBookmarkButton={false} />
      {menuButton && <BrowserContextMenu />}
    </div>
  );
}
