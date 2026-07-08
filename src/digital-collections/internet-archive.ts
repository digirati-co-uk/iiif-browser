import type { DigitalCollection } from "./types";

function getInternetArchiveManifestUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "archive.org") {
      return null;
    }

    const identifier = parsed.pathname.match(/^\/details\/([^/?#]+)/)?.[1];
    if (!identifier) {
      return null;
    }

    return `https://iiif.archive.org/iiif/${identifier}/manifest.json`;
  } catch {
    return null;
  }
}

export const internetArchiveDigitalCollection: DigitalCollection = {
  name: "Internet Archive",
  urlPrefix: "https://archive.org/details/",
  homepage: {
    id: "https://archive.org/",
    title: "Internet Archive",
  },

  supported(url: string) {
    return Boolean(getInternetArchiveManifestUrl(url));
  },

  async toIIIF(url: string) {
    const manifestUrl = getInternetArchiveManifestUrl(url);

    return manifestUrl
      ? {
          id: manifestUrl,
          type: "Manifest",
        }
      : null;
  },
};
