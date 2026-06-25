import type { Collection } from "@iiif/presentation-3";
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

function htmlToText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteLeedsUrl(href: string): string {
  return new URL(href.replace(/&amp;/g, "&"), leedsDigitalCollection.urlPrefix)
    .href;
}

function manifestUrlFromThumbnail(thumbnailUrl: string): string | null {
  try {
    const parsed = new URL(thumbnailUrl.replace(/&amp;/g, "&"));
    if (parsed.hostname !== "iiif.library.leeds.ac.uk") {
      return null;
    }

    const match = parsed.pathname.match(/^\/thumbs\/([^/_./]+)/);
    if (!match?.[1]) {
      return null;
    }

    return `https://iiif.library.leeds.ac.uk/presentation/cc/${match[1]}`;
  } catch {
    return null;
  }
}

function extractSearchResultCardsWithDOM(html: string) {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const items = Array.from(document.querySelectorAll(".card-flat"))
    .map((card) => {
      const hasIIIFBadge = Boolean(
        card.querySelector(
          'img[src="/imu/img/iiif.png"], img[src*="/imu/img/iiif.png"]',
        ),
      );
      if (!hasIIIFBadge) {
        return null;
      }

      const thumbnail = Array.from(card.querySelectorAll("img"))
        .map((image) => image.getAttribute("src") || "")
        .find((src) =>
          src.startsWith("https://iiif.library.leeds.ac.uk/thumbs/"),
        );
      if (!thumbnail) {
        return null;
      }

      const manifestUrl = manifestUrlFromThumbnail(thumbnail);
      if (!manifestUrl) {
        return null;
      }

      const content = card.querySelector(".card-content");
      const label = (
        content?.childNodes[0]?.textContent ||
        content?.textContent ||
        "Untitled"
      ).trim();

      return {
        id: manifestUrl,
        type: "Manifest" as const,
        label: { en: [label || "Untitled"] },
        thumbnail: [
          {
            id: thumbnail,
            type: "Image" as const,
            format: "image/jpeg",
          },
        ],
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const next = document.querySelector('a[rel="next"]')?.getAttribute("href");
  const previous = document
    .querySelector('a[rel="prev"], a[rel="previous"]')
    ?.getAttribute("href");

  return {
    items,
    next: next ? toAbsoluteLeedsUrl(next) : undefined,
    previous: previous ? toAbsoluteLeedsUrl(previous) : undefined,
  };
}

function extractSearchResultCardsWithRegex(html: string) {
  const cardMatches = html.matchAll(
    /<div class="card-flat card-stacked-sm skin-box-white skin-bd-b">([\s\S]*?)(?=<div class="col-xs-6 col-sm-3">|<\/div><\/div><\/div><nav>)/g,
  );
  const items = Array.from(cardMatches)
    .map(([, card]) => {
      if (!card?.includes("/imu/img/iiif.png")) {
        return null;
      }

      const thumbnail = card.match(
        /https:\/\/iiif\.library\.leeds\.ac\.uk\/thumbs\/[^"')\s]+/i,
      )?.[0];
      if (!thumbnail) {
        return null;
      }

      const manifestUrl = manifestUrlFromThumbnail(thumbnail);
      if (!manifestUrl) {
        return null;
      }

      const content = card.match(
        /<div class="card-content equalize-inner"[^>]*>([\s\S]*?)<p>/i,
      )?.[1];

      return {
        id: manifestUrl,
        type: "Manifest" as const,
        label: { en: [content ? htmlToText(content) : "Untitled"] },
        thumbnail: [
          {
            id: thumbnail.replace(/&amp;/g, "&"),
            type: "Image" as const,
            format: "image/jpeg",
          },
        ],
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const next = html.match(
    /<a\b(?=[^>]*\brel=["']next["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
  )?.[1];
  const previous = html.match(
    /<a\b(?=[^>]*\brel=["'](?:prev|previous)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
  )?.[1];

  return {
    items,
    next: next ? toAbsoluteLeedsUrl(next) : undefined,
    previous: previous ? toAbsoluteLeedsUrl(previous) : undefined,
  };
}

function createVirtualSearchCollection(
  url: string,
  html: string,
): Collection | null {
  const searchResults =
    extractSearchResultCardsWithDOM(html) ||
    extractSearchResultCardsWithRegex(html);

  if (searchResults.items.length === 0) {
    return null;
  }

  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: url,
    type: "Collection",
    label: { en: ["Leeds Digital Collections search results"] },
    homepage: [
      {
        id: url,
        type: "Text",
        label: { en: ["Leeds Digital Collections search results"] },
        format: "text/html",
      },
    ],
    items: searchResults.items,
    ...(searchResults.next
      ? { next: { id: searchResults.next, type: "Collection" } }
      : {}),
    ...(searchResults.previous
      ? { previous: { id: searchResults.previous, type: "Collection" } }
      : {}),
  } as unknown as Collection;
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
        (parsed.pathname === "/special-collections-explore" ||
          parsed.pathname.startsWith("/special-collections-explore/"))
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

    const html = await response.text();
    const manifestUrl = extractManifestUrl(html);

    if (!manifestUrl) {
      const virtualCollection = createVirtualSearchCollection(url, html);

      return virtualCollection
        ? {
            id: virtualCollection.id,
            type: "Collection",
            resource: virtualCollection,
          }
        : null;
    }

    return {
      id: manifestUrl,
      type: "Manifest",
    };
  },
};

export const leedsDigitalCollections = leedsDigitalCollection;
