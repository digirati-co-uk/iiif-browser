import type { DigitalCollection } from "./types";

const manifestUrlPattern =
  /https:\/\/iiif\.library\.leeds\.ac\.uk\/presentation\/[^\s<>"']+/;

function extractManifestUrl(html: string): string | null {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(html, "text/html");
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const manifestParagraph = paragraphs.find((paragraph) =>
      /manifest:/i.test(paragraph.textContent || ""),
    );
    const manifestUrl =
      manifestParagraph?.textContent?.match(manifestUrlPattern)?.[0];

    if (manifestUrl) {
      return manifestUrl;
    }
  }

  return html.match(manifestUrlPattern)?.[0] || null;
}

export const leedsDigitalCollection: DigitalCollection = {
  name: "Leeds University Library Special Collections",
  urlPrefix: "https://explore.library.leeds.ac.uk/special-collections-explore/",
  homepage: {
    id: "https://explore.library.leeds.ac.uk/special-collections-explore/",
    title: "Leeds University Library Special Collections",
  },

  supported(url: string) {
    try {
      const parsed = new URL(url);

      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "explore.library.leeds.ac.uk" &&
        parsed.pathname.startsWith("/special-collections-explore/")
      );
    } catch {
      return false;
    }
  },

  async toIIIF(url: string, options) {
    if (!this.supported(url)) {
      return null;
    }

    const response = await fetch(url, options?.requestInitOptions);

    if (!response.ok) {
      return null;
    }

    const manifestUrl = extractManifestUrl(await response.text());

    if (!manifestUrl) {
      return null;
    }

    return {
      id: manifestUrl,
      type: "Manifest",
    };
  },
};

export const leedsDigitalCollections = leedsDigitalCollection;
