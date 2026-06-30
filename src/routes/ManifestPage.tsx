import { useEffect, useMemo } from "react";
import {
  ManifestContext,
  SimpleViewerProvider,
  useManifest,
  useVault,
} from "react-iiif-vault";
import { ManifestMetadata } from "../components/ManifestMetadata";
import { useHistory, useSearchParams, useUIConfig } from "../context";
import { ManifestCanvasViewer } from "../resources/ManifestCanvasViewer";
import { ManifestItemList } from "../resources/ManifestItemList";

export function ManifestPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") as string;
  const canvas = searchParams.get("canvas") as string;
  const vault = useVault();
  const history = useHistory();
  const { showManifestMetadata } = useUIConfig();
  const viewSource = searchParams.get("view-source") === "true";
  const manifest = useManifest({ id });
  const presentationManifest = useMemo(
    () => (manifest ? vault.toPresentation3(manifest as any) : null),
    [vault, manifest],
  );
  const source = useMemo(() => {
    if (!viewSource || !presentationManifest) return null;
    return presentationManifest;
  }, [presentationManifest, viewSource]);

  useEffect(() => {
    if (!manifest) {
      history.replace(`/loading?${searchParams.toString()}`);
    }
  }, [searchParams, history.replace, manifest]);

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
      <div className="relative flex h-full min-h-0 flex-col">
        {showManifestMetadata ? (
          <ManifestMetadata manifest={presentationManifest} />
        ) : null}
        <div className="min-h-0 flex-1">
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
        </div>
      </div>
    </ManifestContext>
  );
}
