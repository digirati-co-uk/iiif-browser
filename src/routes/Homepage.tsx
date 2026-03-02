import { useMemo } from "react";
import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { BrowserLink } from "../browser/BrowserLink";
import { useLinearHistory, useResolve } from "../context";
import { HistoryIcon } from "../icons/HistoryIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

export const Homepage = () => {
  const history = useLinearHistory();
  const resolve = useResolve();

  const { recentCollections, recentManifests } = useMemo(() => {
    const ids: string[] = [];
    const collections = [];
    const manifests = [];
    const allCollections = history.filter(
      (item) => item.metadata?.type === "Collection",
    );
    const allManifests = history.filter(
      (item) => item.metadata?.type === "Manifest",
    );

    for (const collection of allCollections) {
      if (!ids.includes(collection.url)) {
        ids.push(collection.url);
        collections.push(collection);
      }
    }
    for (const manifest of allManifests) {
      if (!ids.includes(manifest.url)) {
        ids.push(manifest.url);
        manifests.push(manifest);
      }
    }

    return {
      recentCollections: collections.slice(0, 10),
      recentManifests: manifests.slice(0, 10),
    };
  }, [history]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">IIIF Browser</h1>
      <p className="text-lg mb-12">
        Enter a URL in the bar above to explore IIIF resources.
      </p>
      {recentCollections.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold flex items-center gap-3 mb-2">
            <PortalResourceIcon type="collection" />
            Recent Collections
          </h2>
          {recentCollections.map((collection) => (
            <div key={collection.url}>
              <BrowserLink
                resource={{ id: collection.url, type: "Collection" }}
              >
                {({ canNavigate }) => (
                  <LocaleString
                    className={
                      canNavigate
                        ? "text-blue-500 hover:underline"
                        : "text-gray-500"
                    }
                  >
                    {collection.metadata?.label}
                  </LocaleString>
                )}
              </BrowserLink>
            </div>
          ))}
        </div>
      ) : null}
      {recentManifests.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold flex items-center gap-3 mb-2">
            <PortalResourceIcon type="manifest" />
            Recent Manifests
          </h2>
          {recentManifests.map((manifest) => (
            <div key={manifest.url}>
              <BrowserLink resource={{ id: manifest.url, type: "Manifest" }}>
                {({ canNavigate }) => (
                  <LocaleString
                    className={
                      canNavigate
                        ? "text-blue-500 hover:underline"
                        : "text-gray-500"
                    }
                  >
                    {manifest.metadata?.label}
                  </LocaleString>
                )}
              </BrowserLink>
            </div>
          ))}
        </div>
      ) : null}
      {history.length > 3 ? (
        <div className="py-8">
          <Button
            className="text-blue-500 flex items-center gap-2"
            onPress={() => resolve("iiif://history")}
          >
            <HistoryIcon />
            View history
          </Button>
        </div>
      ) : null}
    </div>
  );
};
