import { useBrowserI18n } from "../i18n";
import { useMemo } from "react";
import { Button, Menu, MenuItem, MenuTrigger } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { HistoryListItem } from "../components/HistoryListItem";
import { useHistory, useHistoryIndex, useHistoryList } from "../context";
import { ArrowBackIcon } from "../icons/ArrowBackIcon";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { BrowserToolbarButton } from "./BrowserToolbarButton";
import { ThemedPopover } from "../theme/Themed";

export function getForwardHistoryList(
  historyList: ReturnType<typeof useHistoryList>,
  historyIndex: number,
) {
  return historyList.slice(historyIndex + 1, historyIndex + 11);
}

export function BrowserForwardButton() {
  const { t } = useBrowserI18n();
  const history = useHistory();
  const historyList = useHistoryList();
  const historyIndex = useHistoryIndex();

  const forwardHistoryList = useMemo(() => {
    // Example:
    // list: [a, b, c, d, e]
    // index: 2
    // To show:
    // [d, e]

    return getForwardHistoryList(historyList, historyIndex);
  }, [historyList, historyIndex]);

  return (
    <MenuTrigger trigger="longPress">
      <BrowserToolbarButton
        aria-label={t("goForward", "Go Forward")}
        isDisabled={forwardHistoryList.length <= 0}
        onPress={() => {
          history.forward();
        }}
      >
        <ArrowForwardIcon />
      </BrowserToolbarButton>
      <ThemedPopover
        placement="bottom start"
        className={twMerge(
          "bg-white drop-shadow-lg shadow-slate-600 p-1 rounded text-sm max-w-96 text-slate-600",
          forwardHistoryList.length <= 0 ? "hidden" : "",
        )}
      >
        <Menu className="flex flex-col gap-1 outline-none">
          {forwardHistoryList.map((item, index) => {
            return (
              <MenuItem
                key={index}
                onAction={() => history.go(index + 1)}
                className="outline-none focus:bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded"
              >
                <HistoryListItem historyItem={item} />
              </MenuItem>
            );
          })}
        </Menu>
      </ThemedPopover>
    </MenuTrigger>
  );
}
