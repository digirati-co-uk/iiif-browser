import { useManifest } from "react-iiif-vault";
import { ResourceListItem } from "./ResourceListItem";

export function ManifestListSnippet() {
  const manifest = useManifest();

  if (!manifest) return null;

  return <ResourceListItem resource={manifest} />;
}
