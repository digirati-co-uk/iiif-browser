import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLoadResource } from "../context";

export function LoadingPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const viewSource = searchParams.get("view-source") === "true";
  const loadResource = useLoadResource();

  useEffect(() => {
    const abortController = new AbortController();
    if (id) {
      loadResource(id, { viewSource, abortController });
    }
    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">Loading...</h1>
      <p className="text-lg">Please wait while we load the data.</p>
    </div>
  );
}
