import { describe, expect, it, vi } from "vitest";
import {
  getIIIFResourceFromDigitalCollection,
  isSupportedDigitalCollectionPage,
  leedsDigitalCollection,
} from "../src/digital-collections";

const leedsUrl =
  "https://explore.library.leeds.ac.uk/special-collections-explore/372659/horae_beatae_mariae_virginis";
const manifestUrl = "https://iiif.library.leeds.ac.uk/presentation/cc/pfk4sgw8";

describe("Leeds digital collection", () => {
  it("supports Leeds Special Collections URLs", async () => {
    expect(leedsDigitalCollection.supported(leedsUrl)).toBe(true);
    await expect(isSupportedDigitalCollectionPage(leedsUrl)).resolves.toBe(
      true,
    );
    await expect(
      isSupportedDigitalCollectionPage(
        "https://example.org/special-collections-explore/372659",
      ),
    ).resolves.toBe(false);
    await expect(isSupportedDigitalCollectionPage("not a url")).resolves.toBe(
      false,
    );
  });

  it("extracts the Leeds IIIF manifest URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
          <p>
            <strong><a href="https://iiif.io/" target="_blank" title="Visit IIIF Website">
              <img src="/imu/img/iiif.png" />
            </a>
            Manifest:</strong>
            ${manifestUrl}
          </p>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        },
      ),
    );

    try {
      await expect(
        getIIIFResourceFromDigitalCollection(leedsUrl),
      ).resolves.toEqual({
        id: manifestUrl,
        type: "Manifest",
      });
      expect(fetchSpy).toHaveBeenCalledWith(leedsUrl, undefined);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("returns null for unsupported URLs without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      await expect(
        getIIIFResourceFromDigitalCollection("https://example.org/item/1"),
      ).resolves.toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
