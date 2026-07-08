import type { DigitalCollection } from "./types";

function getSmithsonianSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "library.si.edu") {
      return null;
    }

    return (
      parsed.pathname.match(/^\/digital-library\/book\/([^/?#]+)/)?.[1] || null
    );
  } catch {
    return null;
  }
}

function getArchiveManifestUrl(html: string): string | null {
  const identifier = html.match(
    /archive\.org\/(?:details|stream)\/([^"'/?#]+)/,
  )?.[1];

  return identifier
    ? `https://iiif.archive.org/iiif/${identifier}/manifest.json`
    : null;
}

function getInternetArchiveManifestUrl(identifier: string): string {
  return `https://iiif.archive.org/iiif/${identifier}/manifest.json`;
}

export const smithsonianLibrariesDigitalCollection: DigitalCollection = {
  name: "Smithsonian Libraries",
  urlPrefix: "https://library.si.edu/digital-library/book/",
  homepage: {
    id: "https://library.si.edu/digital-library",
    title: "Smithsonian Libraries",
  },

  supported(url: string) {
    return Boolean(getSmithsonianSlug(url));
  },

  async toIIIF(url: string, options) {
    const slug = getSmithsonianSlug(url);
    if (!slug) {
      return null;
    }

    try {
      const response = await fetch(url, options?.requestInitOptions);
      if (response.ok) {
        const manifestUrl = getArchiveManifestUrl(await response.text());
        if (manifestUrl) {
          return {
            id: manifestUrl,
            type: "Manifest",
          };
        }
      }
    } catch {
      // Fall back to the page slug below.
    }

    return {
      id: getInternetArchiveManifestUrl(slug),
      type: "Manifest",
    };
  },
};
