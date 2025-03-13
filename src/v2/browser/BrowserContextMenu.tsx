import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { useHistory, useLastUrl, useResolve, useUIConfig } from "../context";
import { MenuIcon } from "../icons/MenuIcon";

export function BrowserContextMenu() {
  const resolve = useResolve();
  const lastUrl = useLastUrl();
  const ui = useUIConfig();

  return (
    <MenuTrigger>
      <Button
        aria-label="Menu"
        className="flex-shrink-0 aria-expanded:bg-slate-200 outline-none focus:ring ring-blue-300 text-2xl rounded hover:bg-slate-100 p-1.5 m-1"
      >
        <MenuIcon />
      </Button>
      <Popover
        placement="bottom end"
        className="bg-white drop-shadow-lg shadow-slate-600 p-1 rounded text-sm w-36 text-slate-600"
      >
        <Menu className="flex flex-col gap-1 outline-none">
          <MenuItem
            onAction={() => resolve(lastUrl)}
            className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
          >
            Refresh
          </MenuItem>
          {ui.defaultPages.homepage ? (
            <MenuItem
              onAction={() => resolve("iiif://home")}
              className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
            >
              View Homepage
            </MenuItem>
          ) : null}
          {ui.defaultPages.history ? (
            <MenuItem
              onAction={() => resolve("iiif://history")}
              className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
            >
              View History
            </MenuItem>
          ) : null}
          {ui.defaultPages.viewSource ? (
            <MenuItem
              onAction={() => resolve(`view-source:${lastUrl}`)}
              isDisabled={
                lastUrl.startsWith("iiif://") ||
                lastUrl.startsWith("view-source:")
              }
              className="outline-none focus:bg-slate-100 hover:bg-slate-100 aria-disabled:opacity-30 px-3 py-1.5 rounded"
            >
              View Source
            </MenuItem>
          ) : null}
          {ui.defaultPages.about ? (
            <MenuItem
              onAction={() => resolve("iiif://about")}
              className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
            >
              About
            </MenuItem>
          ) : null}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
