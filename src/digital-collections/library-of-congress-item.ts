import type { DigitalCollection } from "./types";

function getLocItemManifestUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.loc.gov" && parsed.hostname !== "loc.gov") {
      return null;
    }

    const itemPath = parsed.pathname.match(/^\/item\/([^/?#]+)\/?/)?.[1];
    if (!itemPath) {
      return null;
    }

    return `https://www.loc.gov/item/${itemPath}/manifest.json`;
  } catch {
    return null;
  }
}

export const libraryOfCongressItemDigitalCollection: DigitalCollection = {
  name: "Library of Congress",
  urlPrefix: "https://www.loc.gov/item/",
  homepage: {
    id: "https://www.loc.gov/",
    title: "Library of Congress",
  },

  supported(url: string) {
    return Boolean(getLocItemManifestUrl(url));
  },

  async toIIIF(url: string) {
    const manifestUrl = getLocItemManifestUrl(url);

    return manifestUrl
      ? {
          id: manifestUrl,
          type: "Manifest",
        }
      : null;
  },
};
