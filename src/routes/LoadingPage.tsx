import { useLoadingPage } from "../context";

export function LoadingPage() {
  useLoadingPage();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">Loading...</h1>
      <p className="text-lg">Please wait while we load the data.</p>
    </div>
  );
}
