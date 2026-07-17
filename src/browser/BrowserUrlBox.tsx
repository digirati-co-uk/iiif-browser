import { useMemo } from "react";
import { Button } from "react-aria-components";
import { useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { ManifestMetadata } from "../components/ManifestMetadata";
import { Omnisearch } from "../components/Omnisearch";
import {
  useIsPageLoading,
  useLocation,
  useSearchParams,
  useUIConfig,
} from "../context";
import { useRouteResource } from "../hooks/use-route-resource";
import { BookmarkIcon } from "../icons/BookmarkIcon";
import { LockIcon } from "../icons/LockIcon";

export function BrowserUrlBox({
  showBookmarkButton,
}: { showBookmarkButton?: boolean }) {
  const loading = useIsPageLoading();
  const { manifestInfoButton } = useUIConfig();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resource = useRouteResource();
  const vault = useVault();
  const manifest = useMemo(
    () =>
      manifestInfoButton &&
      location.pathname === "/manifest" &&
      searchParams.get("view-source") !== "true" &&
      resource?.type === "Manifest"
        ? vault.toPresentation3(resource as any)
        : null,
    [manifestInfoButton, location.pathname, resource, searchParams, vault],
  );

  return (
    <div
      className={twMerge(
        "flex-1 min-w-0 w-full relative my-2 bg-white rounded border border-slate-300 shadow-sm flex gap-1.5 py-1 px-2 items-center",
        // Loading state
        "transition-colors hover:bg-blue-50",
        "after:content-[''] after:bottom-0 after:absolute after:left-0 after:h-0.5 after:bg-gradient-to-r after:rounded-r-lg after:shadow-sm",
        "after:bg-transparent after:w-0 after:duration-1000 after:opacity-0 after:transition-none",
        loading &&
          "after:w-64 after:bg-blue-500 after:transition-all after:opacity-100",
      )}
    >
      <div className="text-md p-1 flex-shink-0">
        <LockIcon className="not-sr-only" />
      </div>
      <div className="flex-1 overflow-hidden min-w-32">
        <Omnisearch />
      </div>
      {showBookmarkButton && (
        <Button
          aria-label="Bookmark current resource"
          className={twMerge(
            "text-xl relative rounded text-slate-300 hover:text-slate-500 z-20 flex-shrink-0",
          )}
        >
          <BookmarkIcon />
        </Button>
      )}
      {manifest ? (
        <ManifestMetadata
          key={searchParams.get("id") || "manifest-information"}
          manifest={manifest}
        />
      ) : null}
    </div>
  );
}
