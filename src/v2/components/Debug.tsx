import { useEffect, useLayoutEffect, useState } from "react";
import { Button, Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { createPortal } from "react-dom";
import { LocaleString } from "react-iiif-vault";
import {
  useAllOutputs,
  useAvailableOutputs,
  useBrowserEmitter,
  useClearHistory,
  useHistory,
  useHistoryIndex,
  useHistoryList,
  useLastUrl,
  useLinearHistory,
  useResolve,
  useSelectedItems,
} from "../context";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

function useDebugElement(id: string) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const debugHistoryElement = document.getElementById(id);
    if (!debugHistoryElement) return;
    setElement(debugHistoryElement as HTMLDivElement);
  }, [id]);

  return element;
}

export function Debug() {
  const debugHistoryElement = useDebugElement("iiif-browser__debug-history");
  const debugSelectedElement = useDebugElement("iiif-browser__debug-selected");

  return (
    <>
      {debugHistoryElement &&
        createPortal(<DebugHistory />, debugHistoryElement)}
      {debugSelectedElement &&
        createPortal(<DebugSelected />, debugSelectedElement)}
    </>
  );
}

function DebugSelected() {
  const selectedItems = useSelectedItems();
  const availableOutputs = useAvailableOutputs();
  const allOutputs = useAllOutputs();

  return (
    <div className="w-full min-w-96 max-w-lg bg-white rounded-xl p-2 drop-shadow-lg m-4 overflow-hidden">
      <div className="flex gap-4 p-2">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold">Debug selected items</div>
        </div>
      </div>
      <div className="mb-8 p-2">
        {selectedItems.map((item) => {
          const { id, type } = item;
          return (
            <div key={id} className="flex gap-2">
              <PortalResourceIcon type={type} />
              <div className="text-sm text-gray-500">{type}</div>
              <div className="text-sm text-gray-500">{id}</div>
            </div>
          );
        })}
        {selectedItems.length === 0 && (
          <div className="text-sm text-gray-500">No selected items</div>
        )}
      </div>
      <h3 className="text-md font-bold">Debug available outputs</h3>
      <pre className="text-sm text-gray-500">
        {JSON.stringify(availableOutputs, null, 2)}
      </pre>
      <h3 className="text-md font-bold">Debug all outputs</h3>
      <pre className="text-sm text-gray-500">
        {JSON.stringify(allOutputs, null, 2)}
      </pre>
      <h3 className="text-md font-bold">Debug selected items</h3>
      <pre className="text-sm text-gray-500">
        {JSON.stringify(selectedItems, null, 2)}
      </pre>
    </div>
  );
}

function DebugHistory() {
  const lastUrl = useLastUrl();
  const linearHistory = useLinearHistory();
  const historyList = useHistoryList();
  const historyIndex = useHistoryIndex();
  const history = useHistory();
  const resolve = useResolve();
  const clearHistory = useClearHistory();
  const emitter = useBrowserEmitter();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    return emitter.on("history.change", (event) => {
      setEvents((ev) => [{ type: "history.change", data: event }, ...ev]);
    });
  }, [emitter]);

  return (
    <div className="w-full min-w-96 max-w-lg bg-white rounded-xl p-2 drop-shadow-lg m-4">
      <div className="flex gap-4 p-2">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold">Debug History</div>
          <div className="text-xs text-gray-500">Index: {historyIndex}</div>
          <div className="text-xs text-gray-500">Last URL: {lastUrl}</div>
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
      <Tabs>
        <TabList>
          <Tab id="history">History</Tab>
          <Tab id="linear-history">Linear History</Tab>
        </TabList>
        <TabPanel id="history">
          {historyList.map((item, index) => (
            <Button
              // This doesn't work 100% of the time :(
              onPress={() => history.go(index - historyIndex)}
              key={index}
              className={`flex gap-4 w-full rounded text-start p-2 ${index === historyIndex ? "bg-gray-300" : ""}`}
            >
              <div className="truncate overflow-ellipsis" title={item.route}>
                {item.metadata?.label ? (
                  <>
                    <LocaleString className="font-semibold text-sm">
                      {item.metadata?.label}
                    </LocaleString>
                    <br />
                  </>
                ) : null}{" "}
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
              <pre key={events.length - index} className="whitespace-pre-wrap">
                {event.type}/{event.data.source} - {JSON.stringify(event.data)}
              </pre>
            ))}
          </div>
        </TabPanel>
        <TabPanel id="linear-history">
          {linearHistory.map((item, index) => (
            <Button
              // This doesn't work 100% of the time :(
              key={index}
              onPress={() => resolve(item.url)}
              className={`flex gap-4 flex-col text-start hover:bg-blue-100 justify-start w-full rounded p-2`}
            >
              <div className="truncate overflow-ellipsis" title={item.route}>
                {item.metadata?.label ? (
                  <>
                    <LocaleString className="font-semibold text-sm">
                      {item.metadata?.label}
                    </LocaleString>
                    <br />
                  </>
                ) : null}{" "}
                {item.url}
              </div>
              {item.parent && (
                <span className="truncate overflow-ellipsis">
                  {item.parent.id} ({item.parent.type})
                </span>
              )}
            </Button>
          ))}
        </TabPanel>
      </Tabs>
    </div>
  );
}
