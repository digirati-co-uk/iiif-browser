import { useUIConfig } from "../context";
import { BrowserBackButton } from "./BrowserBackButton";
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
  } = useUIConfig();

  return (
    <div className="flex w-full items-center justify-between border-b shadow-sm gap-1 px-1">
      {defaultPages.homepage && homeButton && <BrowserHomeButton />}
      {backButton && <BrowserBackButton />}
      {forwardButton && <BrowserForwardButton />}
      {reloadButton && <BrowserReloadButton />}
      <BrowserUrlBox showBookmarkButton={bookmarkButton} />
      {menuButton && <BrowserContextMenu />}
    </div>
  );
}
