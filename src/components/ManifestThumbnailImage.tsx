import { useEffect, useState } from "react";
import { useManifest, useVault } from "react-iiif-vault";
import { useThumbnail } from "../hooks/use-thumbnail";
import { DocumentIcon } from "../v2/icons/DocumentIcon";
import { FolderIcon } from "./FolderIcon";
import { Spinner } from "./Spinner";

const blacklistFullLoadManifests = ["https://iiif.ub.uni-leipzig.de"];

export function ManifestThumbnailImage() {
  const vault = useVault();
  const manifest = useManifest();
  const thumbnail = useThumbnail(
    {
      width: 256,
      height: 256,
      maxWidth: 600,
      maxHeight: 600,
    },
    true,
  );
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    if (manifest && thumbnail.isLoaded && !thumbnail.thumbnail) {
      if (blacklistFullLoadManifests.find((id) => manifest.id.includes(id)))
        return;
      // blacklist.
      vault.load(manifest.id);
    }
  }, [thumbnail.isLoaded]);

  if (didFail || !thumbnail.thumbnail) {
    return (
      <div className="w-full h-full flex items-center justify-center text-3xl text-OnBaseText">
        <DocumentIcon width="50%" height="50%" />
      </div>
    );
  }

  if (!thumbnail.isLoaded) {
    return <Spinner />;
  }

  return (
    <img
      src={thumbnail.thumbnail?.id}
      alt=""
      className="w-full h-full object-contain"
      onError={() => setDidFail(true)}
    />
  );
}
