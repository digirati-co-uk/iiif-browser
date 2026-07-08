import type { DigitalCollection } from "./types";

type LocResourceJson = {
  segments?: Array<{
    number_lccn?: string[];
  }>;
};

function getLocResourceJsonUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.loc.gov" && parsed.hostname !== "loc.gov") {
      return null;
    }

    const resource = parsed.pathname.match(
      /^\/resource\/(?!sn\d)([^/?#]+)\/?/,
    )?.[1];
    if (!resource) {
      return null;
    }

    return `https://www.loc.gov/resource/${resource}/?fo=json`;
  } catch {
    return null;
  }
}

function getLocResourceManifestUrl(data: LocResourceJson): string | null {
  const lccn = data.segments?.[0]?.number_lccn?.[0];

  return lccn ? `https://www.loc.gov/item/${lccn}/manifest.json` : null;
}

export const libraryOfCongressResourceDigitalCollection: DigitalCollection = {
  name: "Library of Congress",
  urlPrefix: "https://www.loc.gov/resource/",
  homepage: {
    id: "https://www.loc.gov/",
    title: "Library of Congress",
  },

  supported(url: string) {
    return Boolean(getLocResourceJsonUrl(url));
  },

  async toIIIF(url: string, options) {
    const jsonUrl = getLocResourceJsonUrl(url);
    if (!jsonUrl) {
      return null;
    }

    try {
      const response = await fetch(jsonUrl, options?.requestInitOptions);
      if (!response.ok) {
        return null;
      }

      const manifestUrl = getLocResourceManifestUrl(await response.json());

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
