import type { DigitalCollection } from "./types";

function getYaleManifestUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "collections.library.yale.edu") {
      return null;
    }

    const identifier = parsed.pathname.match(/^\/catalog\/(\d+)\/?/)?.[1];
    if (!identifier) {
      return null;
    }

    return `https://collections.library.yale.edu/manifests/${identifier}`;
  } catch {
    return null;
  }
}

export const yaleLibraryDigitalCollection: DigitalCollection = {
  name: "Yale Library",
  urlPrefix: "https://collections.library.yale.edu/catalog/",
  homepage: {
    id: "https://collections.library.yale.edu/",
    title: "Yale Library Digital Collections",
  },

  supported(url: string) {
    return Boolean(getYaleManifestUrl(url));
  },

  async toIIIF(url: string) {
    const manifestUrl = getYaleManifestUrl(url);

    return manifestUrl
      ? {
          id: manifestUrl,
          type: "Manifest",
        }
      : null;
  },
};
