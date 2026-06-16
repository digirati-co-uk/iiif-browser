import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import TimeAgo from "react-timeago";
import { useClearHistory, useLinearHistory, useResolve } from "../context";
import { HistoryIcon } from "../icons/HistoryIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

const TYPE_LABELS: Record<string, string> = {
  Manifest: "Manifest",
  Collection: "Collection",
  ImageService1: "Image Service",
  ImageService2: "Image Service",
  ImageService3: "Image Service",
};

const TYPE_COLORS: Record<string, string> = {
  Manifest: "bg-pink-50 text-pink-700 border-pink-200",
  Collection: "bg-blue-50 text-blue-700 border-blue-200",
  ImageService1: "bg-orange-50 text-orange-700 border-orange-200",
  ImageService2: "bg-orange-50 text-orange-700 border-orange-200",
  ImageService3: "bg-orange-50 text-orange-700 border-orange-200",
};

export function HistoryPage() {
  const history = useLinearHistory();
  const clearHistory = useClearHistory();
  const resolve = useResolve();

  const items = history.filter(
    (item) =>
      item.url &&
      !item.url.startsWith("iiif://") &&
      !item.route.startsWith("/loading"),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <h1 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <HistoryIcon className="text-base text-gray-400" />
          History
          {items.length > 0 && (
            <span className="text-xs font-normal text-gray-400 ml-1">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          )}
        </h1>
        {items.length > 0 && (
          <Button
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
            onPress={clearHistory}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <HistoryIcon className="text-4xl text-gray-200" />
            <p className="text-sm text-gray-400">No history yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((item, index) => {
              const type = item.metadata?.type;
              const typeLabel = type ? (TYPE_LABELS[type] ?? type) : null;
              const typeColor = type
                ? (TYPE_COLORS[type] ??
                  "bg-gray-50 text-gray-500 border-gray-200")
                : null;

              return (
                <li key={index}>
                  <button
                    type="button"
                    className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors group"
                    onClick={() => resolve(item.url)}
                  >
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      <PortalResourceIcon
                        type={(type || "manifest").toLowerCase()}
                        className="text-xl"
                      />
                    </div>

                    {/* Label + URL */}
                    <div className="flex-1 min-w-0">
                      {item.metadata?.label ? (
                        <LocaleString className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate block">
                          {item.metadata.label}
                        </LocaleString>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 truncate block">
                          {item.url}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 truncate block mt-0.5">
                        {item.url}
                      </span>
                    </div>

                    {/* Meta: type badge + time */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5 ml-2">
                      {typeLabel && typeColor && (
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded border ${typeColor}`}
                        >
                          {typeLabel}
                        </span>
                      )}
                      {item.timestamp && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          <TimeAgo date={item.timestamp} />
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
