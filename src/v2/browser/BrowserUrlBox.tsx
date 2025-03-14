import { Button } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { Omnisearch } from "../components/Omnisearch";
import { useIsPageLoading } from "../context";
import { BookmarkIcon } from "../icons/BookmarkIcon";
import { LockIcon } from "../icons/LockIcon";

export function BrowserUrlBox({
  showBookmarkButton,
}: { showBookmarkButton?: boolean }) {
  const loading = useIsPageLoading();

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
        <LockIcon />
      </div>
      <div className="flex-1 overflow-hidden min-w-32">
        <Omnisearch />
      </div>
      {showBookmarkButton && (
        <Button
          className={twMerge(
            "text-xl relative rounded text-slate-300 hover:text-slate-500 z-20 flex-shrink-0",
          )}
        >
          <BookmarkIcon />
        </Button>
      )}
    </div>
  );
}
