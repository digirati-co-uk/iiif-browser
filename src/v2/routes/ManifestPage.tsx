import { useMemo, useEffect } from "react";
import { useVault, useManifest, ManifestContext, SimpleViewerProvider } from "react-iiif-vault";
import { useSearchParams } from "react-router-dom";
import { useHistory } from "../context";
import { ManifestCanvasViewer } from "../resources/ManifestCanvasViewer";
import { ManifestItemList } from "../resources/ManifestItemList";

export function ManifestPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const canvas = searchParams.get("canvas") as string;
  const vault = useVault();
  const history = useHistory();
  const viewSource = searchParams.get("view-source") === "true";
  const manifest = useManifest({ id });
  const source = useMemo(() => {
    if (!viewSource || !manifest) return null;
    return vault.toPresentation3(manifest as any);
  }, [vault, manifest, viewSource]);

  useEffect(() => {
    if (!manifest) {
      history.replace(`/loading?id=${encodeURIComponent(id)}`);
    }
  }, [manifest]);

  if (!manifest) return null;

  if (viewSource) {
    return (
      <pre className="p-4 m-4 border bg-gray-50 border-gray-100 overflow-scroll rounded-lg text-xs">
        {JSON.stringify(source, null, 2)}
      </pre>
    );
  }

  return (
    <ManifestContext manifest={manifest.id}>
      {canvas ? (
        <SimpleViewerProvider
          manifest={id}
          startCanvas={canvas}
          pagingEnabled={false}
        >
          <ManifestCanvasViewer />
        </SimpleViewerProvider>
      ) : (
        <ManifestItemList />
      )}
    </ManifestContext>
  );
}
