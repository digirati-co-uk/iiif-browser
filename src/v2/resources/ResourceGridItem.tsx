import type { InternationalString } from "@iiif/presentation-3";
import { type ReactNode, useMemo } from "react";
import { Button } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { BrowserLink } from "../browser/BrowserLink";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";

export function ResourceGridItem({
  resource,
  parent,
  thumbnail,
  hideLabel,
}: {
  resource: {
    id: string;
    type: string;
    label: null | InternationalString;
    behavior?: string[];
  };
  hideLabel?: boolean;
  thumbnail?: ReactNode;
  parent?: { id: string; type: string };
}) {
  const reference = useMemo(
    () => ({ id: resource.id, type: resource.type, parent }),
    [resource.id, resource.type, parent],
  );
  return (
    <BrowserLink
      ignoreAlwaysShowNavigationArrow
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
            "rounded-md cursor-pointer hover:bg-slate-200 p-1 group relative" +
            `${canNavigate ? " hover:bg-blue-200" : "opacity-25"}` +
            `${isSelected ? " bg-blue-50" : ""}` +
            `${hideLabel ? "" : " mb-4"}`
          }
        >
          <div className="relative overflow-hidden rounded aspect-square bg-slate-50 group-hover:bg-slate-100">
            {thumbnail}

            {canSelect ? (
              <div
                aria-selected={isSelected}
                className={
                  // biome-ignore lint/style/useTemplate: <explanation>
                  "w-8 h-8 rounded aria-selected:opacity-100 flex-shrink-0 flex z-20 absolute bottom-0 start-1" +
                  `${doubleClickToNavigate ? " group-hover:opacity-100 opacity-10" : " opacity-50 hover:opacity-100"}`
                }
              >
                {renderCheckbox()}
              </div>
            ) : null}

            <div className="flex items-center gap-2 absolute top-1 right-1">
              {renderDotsMenu()}
              {showNavigationArrow && canNavigate ? (
                <Button
                  onPress={navigate}
                  className="ml-auto bg-gray-300/50 p-2 rounded hover:bg-gray-300/100"
                >
                  <ArrowForwardIcon />
                </Button>
              ) : null}
            </div>
          </div>

          <div
            className={`text-center overflow-hidden text-xs line-clamp-2 ${hideLabel ? "sr-only" : ""}`}
          >
            <LocaleString>{resource.label}</LocaleString>
          </div>
        </div>
      )}
    </BrowserLink>
  );
}
