import { leedsDigitalCollection } from "./leeds-ac-uk";
import type { DigitalCollection } from "./types";

export { leedsDigitalCollection, leedsDigitalCollections } from "./leeds-ac-uk";
export type { DigitalCollection } from "./types";

export const digitalCollections: DigitalCollection[] = [leedsDigitalCollection];

export async function getIIIFResourceFromDigitalCollection(
  url: string,
  options?: { requestInitOptions?: RequestInit },
): Promise<{ id: string; type: "Manifest" | "Collection" } | null> {
  for (const collection of digitalCollections) {
    if (await collection.supported(url)) {
      return collection.toIIIF(url, options);
    }
  }

  return null;
}

export async function isSupportedDigitalCollectionPage(
  url: string,
): Promise<boolean> {
  for (const collection of digitalCollections) {
    if (await collection.supported(url)) {
      return true;
    }
  }

  return false;
}
