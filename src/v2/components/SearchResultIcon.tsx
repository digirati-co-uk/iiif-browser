import { HistoryIcon } from "../icons/HistoryIcon";
import { HomeIcon } from "../icons/HomeIcon";
import { InfoIcon } from "../icons/InfoIcon";
import { PageIcon } from "../icons/PageIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";
import type { SearchIndexItem } from "../stores/omnisearch-store";

export function SearchResultIcon({
  item,
  className,
}: { item: SearchIndexItem; className?: string }) {
  if (item.icon) {
    return item.icon;
  }

  if (item.source === "history") {
    return <HistoryIcon className={`text-2xl ${className}`} />;
  }

  if (item.type === "resource") {
    return (
      <PortalResourceIcon
        noFill
        className={`${className}`}
        type={item.resource.type}
      />
    );
  }

  if (item.id === "iiif://home") {
    return <HomeIcon className={`text-2xl ${className}`} />;
  }

  if (item.id === "iiif://about") {
    return <InfoIcon className={`text-2xl ${className}`} />;
  }

  if (item.id === "iiif://history") {
    return <HistoryIcon className={`text-2xl ${className}`} />;
  }

  return <PageIcon className={`text-2xl ${className}`} />;
}
