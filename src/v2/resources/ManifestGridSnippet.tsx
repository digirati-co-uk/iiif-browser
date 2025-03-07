import { usePress } from "react-aria";
import { LocaleString, useManifest } from "react-iiif-vault";
import { ManifestThumbnailImage } from "../../components/ManifestThumbnailImage";
import { CDNManifestThumbnail } from "../components/CDNManifestThumbnail";
import { useResolve } from "../context";

export function ManifestGridSnippet() {
  const manifest = useManifest();
  const open = useResolve();
  const label = manifest?.label || "Untitled Manifest";
  const { pressProps } = usePress({
    onPress: () => {
      open(manifest!.id);
    },
  });

  const manifestHasThumbnail = manifest?.thumbnail.length;

  if (!manifest) return null;

  return (
    <div
      className="rounded-md cursor-pointer hover:bg-slate-200 p-1 group mb-4"
      {...pressProps}
    >
      <div className="mb-2 overflow-hidden rounded aspect-square bg-slate-50 group-hover:bg-slate-100">
        <CDNManifestThumbnail
          manifestId={manifest?.id || ""}
          className="w-full h-full object-contain"
          skip={!!manifestHasThumbnail}
        >
          <ManifestThumbnailImage />
        </CDNManifestThumbnail>
      </div>
      <div className="text-center overflow-hidden text-xs line-clamp-2">
        <LocaleString>{label}</LocaleString>
      </div>
    </div>
  );
}
