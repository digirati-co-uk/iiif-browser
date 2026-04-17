import { useSearchParams } from "react-router-dom";
import { useBrowserStoreContext, useLastUrl } from "../context";
import { useStore } from "zustand";

export function NotFoundPage() {
  const store = useBrowserStoreContext();
  const lastUrl = useLastUrl();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const id = searchParams.get("id");
  const resource = useStore(store, (s) => {
    return s.loaded[lastUrl];
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (resource?.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg">{resource.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
      {id && (
        <a
          href={`/collections/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline text-sm"
        >
          {id}
        </a>
      )}
    </div>
  );
};
