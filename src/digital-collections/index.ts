import { biodiversityHeritageLibraryDigitalCollection } from "./biodiversity-heritage-library";
import { contentdmDigitalCollection } from "./contentdm";
import { internetArchiveDigitalCollection } from "./internet-archive";
import { leedsDigitalCollection } from "./leeds-ac-uk";
import { libraryOfCongressItemDigitalCollection } from "./library-of-congress-item";
import { libraryOfCongressResourceDigitalCollection } from "./library-of-congress-resource";
import { smithsonianLibrariesDigitalCollection } from "./smithsonian-libraries";
import type { DigitalCollection, DigitalCollectionResource } from "./types";
import { yaleLibraryDigitalCollection } from "./yale-library";

export { biodiversityHeritageLibraryDigitalCollection } from "./biodiversity-heritage-library";
export { contentdmDigitalCollection } from "./contentdm";
export { internetArchiveDigitalCollection } from "./internet-archive";
export { leedsDigitalCollection, leedsDigitalCollections } from "./leeds-ac-uk";
export { libraryOfCongressItemDigitalCollection } from "./library-of-congress-item";
export { libraryOfCongressResourceDigitalCollection } from "./library-of-congress-resource";
export { smithsonianLibrariesDigitalCollection } from "./smithsonian-libraries";
export type { DigitalCollection, DigitalCollectionResource } from "./types";
export { yaleLibraryDigitalCollection } from "./yale-library";

export const digitalCollections: DigitalCollection[] = [
  leedsDigitalCollection,
  contentdmDigitalCollection,
  internetArchiveDigitalCollection,
  libraryOfCongressItemDigitalCollection,
  libraryOfCongressResourceDigitalCollection,
  biodiversityHeritageLibraryDigitalCollection,
  smithsonianLibrariesDigitalCollection,
  yaleLibraryDigitalCollection,
];

export async function getIIIFResourceFromDigitalCollection(
  url: string,
  options?: { requestInitOptions?: RequestInit },
): Promise<DigitalCollectionResource | null> {
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
