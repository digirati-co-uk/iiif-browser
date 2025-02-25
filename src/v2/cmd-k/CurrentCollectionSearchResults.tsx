import { getValue } from "@iiif/helpers";
import type { ManifestNormalized } from "@iiif/presentation-3-normalized";
import { Command, useCommandState } from "cmdk";
import MiniSearch from "minisearch";
import { useEffect, useMemo } from "react";
import { LocaleString, useVaultSelector } from "react-iiif-vault";
import { useMiniSearch } from "react-minisearch";
import { useResolve } from "../context";
import { useRouteResource } from "../hooks/use-route-resource";

const miniSearchOptions = {
  fields: ["keywords"],
  storeFields: ["id", "type", "label", "keywords"],
};

export function CurrentCollectionSearchResults() {
  const resource = useRouteResource();
  const searchQuery = useCommandState((state) => state.search);
  const items = useVaultSelector(
    (_, vault) => vault.get(resource?.items || []),
    [resource],
  );
  const open = useResolve();
  const itemsToIndex = useMemo(() => {
    if (!resource || resource.type !== "Collection") {
      return [];
    }
    return items.map((item: ManifestNormalized) => {
      return {
        id: item.id,
        type: item.type,
        label: item.label,
        keywords: `${getValue(item.label)} ${getValue(item.summary)}`,
      };
    });
  }, [items, resource]);

  useEffect(() => {
    search(searchQuery);
  }, [searchQuery]);

  const { search, searchResults } = useMiniSearch(
    itemsToIndex,
    miniSearchOptions,
  );

  console.log({ searchQuery, searchResults });

  if (!resource || searchQuery.length < 2 || resource.type !== "Collection") {
    return null;
  }

  console.log("results...");

  return (
    <>
      {searchResults?.map((result) => {
        return (
          <Command.Item
            id={result.id}
            className="flex items-center data-[selected=true]:bg-slate-100"
            key={result.id}
            keywords={[result.keywords]}
            onSelect={() => open(result.id)}
          >
            <LocaleString>{result.label}</LocaleString>
          </Command.Item>
        );
      })}
    </>
  );
}
