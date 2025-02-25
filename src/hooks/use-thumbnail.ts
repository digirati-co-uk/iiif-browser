import type {
  ImageCandidate,
  ImageCandidateRequest,
} from "@atlas-viewer/iiif-image-api";
import { createThumbnailHelper } from "@iiif/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCanvas,
  useImageServiceLoader,
  useManifest,
  useVault,
  useVaultEffect,
} from "react-iiif-vault";

export function useThumbnail(
  request: ImageCandidateRequest,
  dereference?: boolean,
  { canvasId, manifestId }: { canvasId?: string; manifestId?: string } = {},
) {
  const vault = useVault();
  const loader = useImageServiceLoader();
  const helper = useMemo(
    () => createThumbnailHelper(vault, { imageServiceLoader: loader }),
    [vault, loader],
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [thumbnail, setThumbnail] = useState<ImageCandidate | undefined>();
  const manifest = useManifest(manifestId ? { id: manifestId } : undefined);
  const canvas = useCanvas(canvasId ? { id: canvasId } : undefined);
  const subject = canvas ? canvas : manifest;
  const didUnmount = useRef(false);

  useEffect(() => {
    didUnmount.current = false;
    return () => {
      didUnmount.current = true;
    };
  }, []);

  if (!subject) {
    throw new Error("Must be called under a manifest or canvas context.");
  }

  useVaultEffect(
    (v) => {
      helper
        .getBestThumbnailAtSize(subject, request, dereference)
        .then((thumb) => {
          if (thumb.best && !didUnmount.current) {
            setThumbnail(thumb.best);
          }
          setIsLoaded(true);
        });
    },
    [subject],
  );

  return {
    thumbnail,
    isLoaded,
  };
}
