import type { DigitalCollection } from "./types";

function getContentdmManifestUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return null;
    }

    const match = parsed.pathname.match(
      /\/digital\/collection\/([^/]+)\/id\/(\d+)/,
    );
    if (!match?.[1] || !match[2]) {
      return null;
    }

    return `${parsed.origin}/iiif/info/${match[1]}/${match[2]}/manifest.json`;
  } catch {
    return null;
  }
}

export const contentdmDigitalCollection: DigitalCollection = {
  name: "CONTENTdm",
  urlPrefix: "https://*.contentdm.oclc.org/digital/",
  homepage: {
    id: "https://www.oclc.org/en/contentdm.html",
    title: "CONTENTdm",
  },

  supported(url: string) {
    return Boolean(getContentdmManifestUrl(url));
  },

  async toIIIF(url: string) {
    const manifestUrl = getContentdmManifestUrl(url);

    return manifestUrl
      ? {
          id: manifestUrl,
          type: "Manifest",
        }
      : null;
  },
};
