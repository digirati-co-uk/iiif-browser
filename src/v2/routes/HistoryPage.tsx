import { Button, ListBox, ListBoxItem } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import TimeAgo from "react-timeago";
import { useClearHistory, useLinearHistory, useResolve } from "../context";
import { usePaginateArray } from "../hooks/use-paginate-array";
import { HistoryIcon } from "../icons/HistoryIcon";

export function HistoryPage() {
  const history = useLinearHistory();
  const clearHistory = useClearHistory();
  const resolve = useResolve();

  return (
    <>
      <div className="flex items-center justify-between sticky top-0 p-4 bg-white z-10">
        <h1 className="font-semibold text-lg flex items-center gap-3">
          <HistoryIcon className="text-2xl" />
          IIIF Browser History
        </h1>
        <Button
          className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
          onPress={clearHistory}
        >
          Clear history
        </Button>
      </div>
      <ListBox className="w-full p-2">
        {history.map((item, index) =>
          item.url === "iiif://history" ? null : (
            <ListBoxItem
              onAction={() => resolve(item.url)}
              key={index}
              className="flex items-center hover:bg-blue-100 p-2"
            >
              <div className="flex flex-col flex-1">
                {item.metadata?.label ? (
                  <LocaleString className="font-semibold">
                    {item.metadata?.label}
                  </LocaleString>
                ) : (
                  ""
                )}
                <div className="text-sm underline">{item.url}</div>
              </div>
              <div className="flex-shrink-0 text-xs opacity-50">
                {item.timestamp ? <TimeAgo date={item.timestamp} /> : ""}
              </div>
            </ListBoxItem>
          ),
        )}
      </ListBox>
    </>
  );
}
