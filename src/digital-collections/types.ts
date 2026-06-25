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
  ): Promise<{ id: string; type: "Manifest" | "Collection" } | null>;
};
