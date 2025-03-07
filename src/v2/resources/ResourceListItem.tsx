import type { InternationalString } from "@iiif/presentation-3";
import { useMemo } from "react";
import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { BrowserLink } from "../browser/BrowserLink";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

export function ResourceListItem({
  resource,
}: {
  resource: { id: string; type: string; label: null | InternationalString };
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
        navigate,
        renderCheckbox,
        renderDotsMenu,
      }) => (
        <div
          className={
            // biome-ignore lint/style/useTemplate: <explanation>
            `flex h-12 items-center gap-3 px-2 group` +
            `${canNavigate ? " hover:bg-blue-100" : "opacity-25"}` +
            `${isSelected ? " bg-blue-50" : ""}`
          }
        >
          {canSelect ? (
            <div
              aria-selected={isSelected}
              className="w-6 group-hover:opacity-100 opacity-10 aria-selected:opacity-100"
            >
              {renderCheckbox()}
            </div>
          ) : null}

          <PortalResourceIcon type={resource.type} external={!canNavigate} />

          <div className="overflow-hidden text-md truncate flex-1">
            <LocaleString>{resource.label}</LocaleString>
          </div>
          {doubleClickToNavigate ? (
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
