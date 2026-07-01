import type { DigitalCollection } from "./types";

function supportedBhlUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return (
      parsed.hostname === "www.biodiversitylibrary.org" &&
      /^\/(?:item|bibliography)\/\d+/.test(parsed.pathname)
    );
  } catch {
    return false;
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

export const biodiversityHeritageLibraryDigitalCollection: DigitalCollection = {
  name: "Biodiversity Heritage Library",
  urlPrefix: "https://www.biodiversitylibrary.org/",
  homepage: {
    id: "https://www.biodiversitylibrary.org/",
    title: "Biodiversity Heritage Library",
  },

  supported(url: string) {
    return supportedBhlUrl(url);
  },

  async toIIIF(url: string, options) {
    if (!supportedBhlUrl(url)) {
      return null;
    }

    try {
      const response = await fetch(url, options?.requestInitOptions);
      if (!response.ok) {
        return null;
      }

      const manifestUrl = getArchiveManifestUrl(await response.text());

      return manifestUrl
        ? {
            id: manifestUrl,
            type: "Manifest",
          }
        : null;
    } catch {
      return null;
    }
  },
};
