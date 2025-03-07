import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "react-aria-components";
import { createPortal } from "react-dom";
import {
  useBrowserEmitter,
  useClearHistory,
  useHistory,
  useHistoryIndex,
  useHistoryList,
} from "../context";

export function Debug() {
  const [debugHistoryElement, setDebugHistoryElement] =
    useState<HTMLDivElement | null>(null);

  // iiif-browser__debug-history
  useLayoutEffect(() => {
    const debugHistoryElement = document.getElementById(
      "iiif-browser__debug-history",
    );
    if (!debugHistoryElement) return;
    setDebugHistoryElement(debugHistoryElement as HTMLDivElement);
  }, []);

  return (
    <>
      {debugHistoryElement &&
        createPortal(<DebugHistory />, debugHistoryElement)}
    </>
  );
}

function DebugHistory() {
  const historyList = useHistoryList();
  const historyIndex = useHistoryIndex();
  const history = useHistory();
  const clearHistory = useClearHistory();
  const emitter = useBrowserEmitter();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    return emitter.on("history.change", (event) => {
      setEvents((ev) => [{ type: "history.change", data: event }, ...ev]);
    });
  }, [emitter]);

  return (
    <div className="max-w-lg w-full bg-white rounded-xl p-2 drop-shadow-lg">
      <div className="flex gap-4 p-2">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold">Debug History</div>
          <div className="text-xs text-gray-500">Index: {historyIndex}</div>
          <div className="flex gap-1">
            <Button
              onPress={() => history.go(-1)}
              className="bg-blue-500 px-2 py-1 rounded text-white"
            >
              Back
            </Button>
            <Button
              onPress={() => history.go(1)}
              className="bg-blue-500 px-2 py-1 rounded text-white"
            >
              Forward
            </Button>
            <Button
              onPress={clearHistory}
              className="bg-blue-500 px-2 py-1 rounded text-white"
            >
              Clear history
            </Button>
          </div>
        </div>
      </div>
      {historyList.map((item, index) => (
        <Button
          // This doesn't work 100% of the time :(
          onPress={() => history.go(index - historyIndex)}
          key={index}
          className={`flex gap-4 w-full rounded p-2 ${index === historyIndex ? "bg-gray-300" : ""}`}
        >
          <div className="truncate overflow-ellipsis" title={item.route}>
            {item.url}
          </div>
          {item.parent && (
            <span className="truncate overflow-ellipsis">
              {item.parent.id} ({item.parent.type})
            </span>
          )}
          <span className="text-gray-500 flex-shrink-0 ml-auto">
            Index: {index} / go({index - historyIndex})
          </span>
        </Button>
      ))}
      <div className="whitespace-pre-wrap text-xs overflow-auto">
        <Button
          onPress={() => setEvents([])}
          className="bg-blue-500 px-2 py-1 rounded text-white"
        >
          Clear
        </Button>
        {events.map((event, index) => (
          <pre key={events.length - index}>
            {event.type}/{event.data.source} - {JSON.stringify(event.data)}
          </pre>
        ))}
      </div>
    </div>
  );
}
