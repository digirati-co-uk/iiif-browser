import type { InternationalString } from "@iiif/presentation-3";
import { useMemo } from "react";
import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { BrowserLink } from "../browser/BrowserLink";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

export function ResourceListItem({
  resource,
  large = false,
}: {
  resource: {
    id: string;
    type: string;
    label: null | InternationalString;
    behavior?: string[];
  };
  large?: boolean;
}) {
  const reference = useMemo(
    () => ({ id: resource.id, type: resource.type }),
    [resource.id, resource.type],
  );
  return (
    <BrowserLink resource={reference}>
      {({
        canNavigate,
        canSelect,
        isMarked,
        isNavigating,
        isSelected,
        doubleClickToNavigate,
        showNavigationArrow,
        navigate,
        renderCheckbox,
        renderDotsMenu,
      }) => (
        <div
          className={
            // biome-ignore lint/style/useTemplate: <explanation>
            `flex h-12 items-center gap-3 px-2 group` +
            `${canNavigate ? " hover:bg-blue-100" : "opacity-25"}` +
            `${isSelected ? " bg-blue-50" : ""}` +
            `${large ? " py-8" : ""}`
          }
        >
          {canSelect ? (
            <div
              aria-selected={isSelected}
              className={
                // biome-ignore lint/style/useTemplate: <explanation>
                "w-8 aria-selected:opacity-100 flex-shrink-0 flex " +
                `${doubleClickToNavigate ? "group-hover:opacity-100 opacity-10" : "opacity-50 hover:opacity-100"}`
              }
            >
              {renderCheckbox()}
            </div>
          ) : null}

          <PortalResourceIcon
            type={resource.type}
            isFolder={(resource.behavior || []).includes("storage-collection")}
            external={!canNavigate}
          />

          <div className="flex flex-col min-w-0">
            <div className="overflow-hidden text-md truncate flex-1">
              <LocaleString>{resource.label}</LocaleString>
            </div>
            {large ? (
              <div className="overflow-hidden text-md truncate flex-1 text-sm text-black/50">
                {resource.id}
              </div>
            ) : null}
          </div>
          {showNavigationArrow ? (
            <Button onPress={navigate} className="ml-auto bg-gray-500/10 p-2">
              <ArrowForwardIcon />
            </Button>
          ) : null}
          {renderDotsMenu()}
        </div>
      )}
    </BrowserLink>
  );
}
