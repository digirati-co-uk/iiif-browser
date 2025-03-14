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
    homeLink,
  } = useUIConfig();

  return (
    <div className="flex w-full items-center justify-between border-b shadow-sm gap-1 px-1">
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
