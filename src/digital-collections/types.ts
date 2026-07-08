import type { Collection, Manifest } from "@iiif/presentation-3";

export type DigitalCollectionResource = {
  id: string;
  type: "Manifest" | "Collection";
  resource?: Manifest | Collection;
};

export type DigitalCollection = {
  name: string;
  urlPrefix: string;
  homepage: {
    id: string;
    title: string;
  };
  supported(url: string): boolean | Promise<boolean>;
  toIIIF(
    url: string,
    options?: { requestInitOptions?: RequestInit },
  ): Promise<DigitalCollectionResource | null>;
};
