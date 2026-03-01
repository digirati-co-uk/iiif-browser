import { Vault } from "@iiif/helpers";
import {
  type BrowserLinkConfig,
  getBrowserLinkResource,
} from "../src/v2/browser/BrowserLink";
import {
  canNavigateItem,
  canSelectItem,
  normalizeResourceType,
} from "../src/v2/stores/output-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createConfig(
  overrides: Partial<BrowserLinkConfig> = {},
): BrowserLinkConfig {
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

{
  assert(
    normalizeResourceType("manifest") === "Manifest",
    "Expected manifest to normalize to Manifest",
  );
  assert(
    normalizeResourceType("collection") === "Collection",
    "Expected collection to normalize to Collection",
  );
  assert(
    normalizeResourceType("canvas") === "Canvas",
    "Expected canvas to normalize to Canvas",
  );
}

{
  const manifestBlocked = createConfig({ canNavigateToManifest: false });
  assert(
    !canNavigateItem(
      { id: "https://example.org/manifest/1", type: "manifest" },
      manifestBlocked,
      vault,
    ),
    "Expected manifest navigation to be blocked even when external type is lowercase",
  );

  const manifestAllowed = createConfig({ canNavigateToManifest: true });
  assert(
    canNavigateItem(
      { id: "https://example.org/manifest/1", type: "manifest" },
      manifestAllowed,
      vault,
    ),
    "Expected manifest navigation when manifest navigation is enabled",
  );
}

{
  const canvasBlocked = createConfig({ canSelectCanvas: false });
  assert(
    !canSelectItem(
      { id: "https://example.org/canvas/1", type: "canvas" },
      canvasBlocked,
      vault,
    ),
    "Expected canvas selection to be blocked even when external type is lowercase",
  );

  const canvasAllowed = createConfig({ canSelectCanvas: true });
  assert(
    canSelectItem(
      { id: "https://example.org/canvas/1", type: "canvas" },
      canvasAllowed,
      vault,
    ),
    "Expected canvas selection when canvas selection is enabled",
  );
}

{
  const embeddedParent = getBrowserLinkResource({
    id: "https://example.org/canvas/1",
    type: "Canvas",
    parent: { id: "https://example.org/manifest/1", type: "Manifest" },
  });
  assert(
    embeddedParent.parent?.id === "https://example.org/manifest/1",
    "Expected embedded parent identity to be preserved",
  );

  const overrideParent = getBrowserLinkResource(
    {
      id: "https://example.org/canvas/1",
      type: "Canvas",
      parent: { id: "https://example.org/manifest/1", type: "Manifest" },
    },
    { id: "https://example.org/manifest/2", type: "Manifest" },
  );
  assert(
    overrideParent.parent?.id === "https://example.org/manifest/2",
    "Expected explicit parent prop to override embedded parent identity",
  );
}

console.log("search-navigation-resource-identity tests passed");
