import { useMemo } from "react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { HistoryListItem } from "../components/HistoryListItem";
import { useHistory, useHistoryIndex, useHistoryList } from "../context";
import { ArrowBackIcon } from "../icons/ArrowBackIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";

export function BrowserBackButton() {
  const history = useHistory();
  const historyList = useHistoryList();
  const historyIndex = useHistoryIndex();

  const backHistoryList = useMemo(() => {
    // Example:
    // list: [a, b, c, d]
    // index: 2
    // To show:
    // [b, a]

    const list = historyList.slice(0, historyIndex);
    return list.reverse();
  }, [historyList, historyIndex]);

  return (
    <MenuTrigger trigger="longPress">
      <BrowserToolbarButton
        aria-label="Go Back"
        isDisabled={backHistoryList.length <= 0}
        onPress={() => {
          history.back();
        }}
      >
        <ArrowBackIcon />
      </BrowserToolbarButton>
      <Popover
        placement="bottom start"
        className={twMerge(
          "bg-white drop-shadow-lg shadow-slate-600 p-1 rounded text-sm max-w-96 text-slate-600",
          backHistoryList.length <= 0 ? "hidden" : "",
        )}
      >
        <Menu className="flex flex-col gap-1 outline-none">
          {backHistoryList.map((item, index) => {
            return (
              <MenuItem
                key={index}
                onAction={() => history.go(-(index + 1))}
                className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
              >
                <HistoryListItem historyItem={item} />
              </MenuItem>
            );
          })}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
