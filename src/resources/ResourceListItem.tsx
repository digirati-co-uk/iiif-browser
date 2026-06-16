import { getValue } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import { useMemo } from "react";
import { Button, GridListItem } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { BrowserLink } from "../browser/BrowserLink";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

export function ResourceListItem({
  resource,
  large = false,
  parent,
}: {
  resource: {
    id: string;
    type: string;
    label: null | InternationalString;
    behavior?: string[];
  };
  parent?: { id: string; type: string };
  large?: boolean;
}) {
  const reference = useMemo(
    () => ({ id: resource.id, type: resource.type, parent }),
    [resource.id, resource.type, parent],
  );
  return (
    <BrowserLink
      aria-label={resource.label ? getValue(resource.label) : "Resource"}
      as={GridListItem}
      isReactAria
      resource={reference}
      parent={parent}
    >
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
            `${canNavigate ? " hover:bg-blue-100" : " opacity-50"}` +
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
          {showNavigationArrow && canNavigate ? (
            <Button
              aria-label="Navigate to resource"
              onPress={navigate}
              className="ml-auto bg-gray-500/10 p-2"
            >
              <ArrowForwardIcon />
            </Button>
          ) : null}
          {renderDotsMenu()}
        </div>
      )}
    </BrowserLink>
  );
}
