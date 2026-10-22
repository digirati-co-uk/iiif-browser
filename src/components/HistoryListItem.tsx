import type {
  CollectionNormalized,
  ManifestNormalized,
} from "@iiif/parser/presentation-3-normalized/types";
import { LocaleString, useVaultSelector } from "react-iiif-vault";
import { fixedRoutes } from "../routes";
import type { HistoryItem } from "../stores/browser-store";

export function HistoryListItem({ historyItem }: { historyItem: HistoryItem }) {
  const fullResource = useVaultSelector(
    (_, v) => {
      if (!historyItem.resource) return null;
      return v.get(historyItem.resource) as
        | ManifestNormalized
        | CollectionNormalized;
    },
    [historyItem],
  );

  if (!historyItem.resource) {
    if (historyItem.route.startsWith("/loading")) {
      // Maybe we could show something?
      return null;
    }

    const foundFixedRoute = fixedRoutes.find(
      (route) => route.router === historyItem.url,
    );
    // Fixed route.
    return (
      <div>
        <div className="flex gap-3 items-center">
          <div className="truncate flex-1">
            {foundFixedRoute?.title ||
              (historyItem.url.startsWith("iiif://")
                ? historyItem.url
                    .slice(7)
                    .replace(/^./, (letter) => letter.toUpperCase())
                : "Unknown")}
          </div>
          <div className="flex-shrink-0 rounded text-sm px-2 py-0.5 text-gray-500">
            {foundFixedRoute?.router || historyItem.url}
          </div>
        </div>
      </div>
    );
  }

  if (!fullResource) {
    // No idea what to do here.
    return (
      <div className="flex gap-3 items-center">
        <div className="truncate flex-1">{historyItem.url}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-center">
      <LocaleString className="truncate flex-1">
        {fullResource.label}
      </LocaleString>
      <div className="flex-shrink-0 rounded text-sm px-2 py-0.5 border">
        {fullResource.type}
      </div>
    </div>
  );
}
