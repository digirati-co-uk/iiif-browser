import { useEffect, useMemo, useState } from "react";
import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { useBrowserContainer } from "../browser/BrowserContainer";
import { useCanResolve, useLinearHistory, useResolve } from "../context";
import { HistoryIcon } from "../icons/HistoryIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

// Card thumbnail is ~150px wide; label adds ~30px. Keep total card height ≤200px.
const CARD_MIN_WIDTH = 150;

function useContainerColumns() {
  const container = useBrowserContainer();
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width - 48; // subtract padding
      setColumns(Math.max(2, Math.floor(width / CARD_MIN_WIDTH)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  return columns;
}

function ManifestCardThumbnail({
  url,
  cachedThumbnail,
}: {
  url: string;
  cachedThumbnail?: string;
}) {
  const [imgSrc] = useState(() => {
    // Prefer the cached thumbnail from history, then try iiifcdn.
    if (cachedThumbnail) return cachedThumbnail;
    const idHash = btoa(url);
    return `https://mt.iiifcdn.org/image/${idHash}/default.jpg`;
  });
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <PortalResourceIcon type="manifest" className="text-4xl opacity-20" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function ManifestCard({
  url,
  label,
  thumbnail,
}: {
  url: string;
  label: any;
  thumbnail?: string;
}) {
  const resolve = useResolve();
  const canResolve = useCanResolve();
  const canNavigate = canResolve({ id: url, type: "Manifest" });

  return (
    <button
      type="button"
      onClick={canNavigate ? () => resolve(url) : undefined}
      className={[
        "group rounded-md p-1 relative text-left w-full mb-4",
        canNavigate
          ? "cursor-pointer hover:bg-slate-200"
          : "opacity-50 cursor-default",
      ].join(" ")}
    >
      <div className="relative overflow-hidden rounded aspect-square bg-slate-50 group-hover:bg-slate-100">
        <ManifestCardThumbnail url={url} cachedThumbnail={thumbnail} />
      </div>
      <div className="text-center text-xs line-clamp-2 mt-1 h-8 leading-4">
        <LocaleString>{label}</LocaleString>
      </div>
    </button>
  );
}

function CollectionRow({ url, label }: { url: string; label: any }) {
  const resolve = useResolve();
  const canResolve = useCanResolve();
  const canNavigate = canResolve({ id: url, type: "Collection" });

  return (
    <button
      type="button"
      onClick={canNavigate ? () => resolve(url) : undefined}
      className={[
        "group flex items-center gap-3 w-full rounded-md px-2 py-2 text-left",
        canNavigate
          ? "cursor-pointer hover:bg-slate-200"
          : "opacity-50 cursor-default",
      ].join(" ")}
    >
      <PortalResourceIcon type="collection" className="shrink-0 text-xl" />
      <LocaleString className="flex-1 text-sm text-gray-800 truncate">
        {label}
      </LocaleString>
      <span className="shrink-0 text-xs text-gray-400">→</span>
    </button>
  );
}

export const Homepage = () => {
  const history = useLinearHistory();
  const resolve = useResolve();
  const columns = useContainerColumns();

  const { recentCollections, recentManifests } = useMemo(() => {
    const ids = new Set<string>();
    const collections = [];
    const manifests = [];

    for (const item of history) {
      if (ids.has(item.url)) continue;
      ids.add(item.url);
      if (item.metadata?.type === "Collection") collections.push(item);
      if (item.metadata?.type === "Manifest") manifests.push(item);
    }

    return {
      recentCollections: collections.slice(0, 6),
      recentManifests: manifests.slice(0, columns),
    };
  }, [history, columns]);

  const hasHistory = recentCollections.length > 0 || recentManifests.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-full">
        {!hasHistory ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="text-5xl opacity-20">
              <PortalResourceIcon type="manifest" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-700">
                IIIF Browser
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Paste a IIIF URL above to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {recentManifests.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <PortalResourceIcon
                    type="manifest"
                    className="text-lg shrink-0"
                  />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Recent Manifests
                  </h2>
                </div>
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {recentManifests.map((item) => (
                    <ManifestCard
                      key={item.url}
                      url={item.url}
                      label={item.metadata?.label}
                      thumbnail={item.thumbnail}
                    />
                  ))}
                </div>
              </section>
            )}

            {recentCollections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <PortalResourceIcon
                    type="collection"
                    className="text-lg shrink-0"
                  />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Recent Collections
                  </h2>
                </div>
                <div className="flex flex-col gap-1">
                  {recentCollections.map((item) => (
                    <CollectionRow
                      key={item.url}
                      url={item.url}
                      label={item.metadata?.label}
                    />
                  ))}
                </div>
              </section>
            )}

            {history.length > 4 && (
              <div className="pt-2 border-t border-gray-100">
                <Button
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors px-1 py-1 rounded"
                  onPress={() => resolve("iiif://history")}
                >
                  <HistoryIcon className="text-base" />
                  View full history
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
