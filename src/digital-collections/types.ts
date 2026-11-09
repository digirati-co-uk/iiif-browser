import type { Collection, Manifest } from "@iiif/parser/presentation-3/types";

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
