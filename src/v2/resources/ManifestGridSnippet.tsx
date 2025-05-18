import { ManifestContext, useManifest } from "react-iiif-vault";
import { ManifestThumbnailImage } from "../../components/ManifestThumbnailImage";
import { CDNManifestThumbnail } from "../components/CDNManifestThumbnail";
import { ResourceGridItem } from "./ResourceGridItem";

export function ManifestGridSnippet() {
  const manifest = useManifest();
  const manifestHasThumbnail = manifest?.thumbnail.length;

  if (!manifest) return null;

  return (
    <ResourceGridItem
      resource={manifest}
      thumbnail={
        <ManifestContext manifest={manifest.id}>
          <CDNManifestThumbnail
            manifestId={manifest?.id || ""}
            className="w-full h-full object-contain"
            skip={!!manifestHasThumbnail}
          >
            <ManifestThumbnailImage />
          </CDNManifestThumbnail>
        </ManifestContext>
      }
    />
  );
}
