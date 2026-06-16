import { Vault } from "@iiif/helpers";
import {
  type BrowserLinkConfig,
  getBrowserLinkResource,
} from "../src/browser/BrowserLink";
import {
  canNavigateItem,
  canSelectItem,
  normalizeResourceType,
} from "../src/stores/output-store";
import { describe, expect, it } from "vitest";

function createConfig(overrides: Partial<BrowserLinkConfig> = {}): BrowserLinkConfig {
  return {
    allowNavigationToBuiltInPages: true,
    onlyAllowedDomains: false,
    canSelectOnlyAllowedDomains: false,
    allowedDomains: [],
    disallowedResources: [],
    markedResources: [],
    multiSelect: false,
    canCropImage: false,
    alwaysShowNavigationArrow: true,
    clickToSelect: false,
    doubleClickToNavigate: false,
    clickToNavigate: true,
    canNavigateToCollection: true,
    canNavigateToManifest: true,
    canNavigateToCanvas: true,
    canSelectCollection: true,
    canSelectManifest: true,
    canSelectCanvas: true,
    canSelectImageService: true,
    customCanNavigate: null,
    customCanSelect: null,
    ...overrides,
  };
}

const vault = new Vault();

describe("search resource identity", () => {
  it("normalizes resource types", () => {
    expect(normalizeResourceType("manifest")).toBe("Manifest");
    expect(normalizeResourceType("collection")).toBe("Collection");
    expect(normalizeResourceType("canvas")).toBe("Canvas");
  });

  it("respects manifest navigation allow-listing", () => {
    const manifestBlocked = createConfig({ canNavigateToManifest: false });
    expect(
      canNavigateItem(
        { id: "https://example.org/manifest/1", type: "manifest" },
        manifestBlocked,
        vault,
      ),
    ).toBe(false);

    const manifestAllowed = createConfig({ canNavigateToManifest: true });
    expect(
      canNavigateItem(
        { id: "https://example.org/manifest/1", type: "manifest" },
        manifestAllowed,
        vault,
      ),
    ).toBe(true);
  });

  it("respects canvas selection allow-listing", () => {
    const canvasBlocked = createConfig({ canSelectCanvas: false });
    expect(
      canSelectItem(
        { id: "https://example.org/canvas/1", type: "canvas" },
        canvasBlocked,
        vault,
      ),
    ).toBe(false);

    const canvasAllowed = createConfig({ canSelectCanvas: true });
    expect(
      canSelectItem(
        { id: "https://example.org/canvas/1", type: "canvas" },
        canvasAllowed,
        vault,
      ),
    ).toBe(true);
  });

  it("preserves embedded parent identity and applies overrides", () => {
    const embeddedParent = getBrowserLinkResource({
      id: "https://example.org/canvas/1",
      type: "Canvas",
      parent: { id: "https://example.org/manifest/1", type: "Manifest" },
    });
    expect(embeddedParent.parent?.id).toBe("https://example.org/manifest/1");

    const overrideParent = getBrowserLinkResource(
      {
        id: "https://example.org/canvas/1",
        type: "Canvas",
        parent: { id: "https://example.org/manifest/1", type: "Manifest" },
      },
      { id: "https://example.org/manifest/2", type: "Manifest" },
    );
    expect(overrideParent.parent?.id).toBe("https://example.org/manifest/2");
  });
});
