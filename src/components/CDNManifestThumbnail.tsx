import { useState } from "react";

const globalDidError = new Set<string>();

const allowList = [
  // National Library of Scotland
  "view.nls.uk",
  // Bodleian and Oxford College Libraries
  "iiif.bodleian.ox.ac.uk",
  // Leipzig
  "iiif.ub.uni-leipzig.de",
];

export function CDNManifestThumbnail({
  manifestId,
  children,
  skip,
  ...props
}: {
  manifestId: string;
  skip?: boolean;
  children: React.ReactNode;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(
    globalDidError.has(manifestId || ""),
  );
  const id = manifestId;
  if (!id) return children;

  const allowed = allowList.find((host) => id.includes(host));

  const idHash = btoa(id);
  const imageUrl = `https://mt.iiifcdn.org/image/${idHash}/default.jpg`;

  const onError = () => {
    setDidError(true);
    globalDidError.add(id);
  };

  if (didError || !allowed || skip) {
    return children;
  }

  // biome-ignore lint/a11y/useAltText: provided by user.
  return <img alt="" {...props} src={imageUrl} onError={onError} />;
}
