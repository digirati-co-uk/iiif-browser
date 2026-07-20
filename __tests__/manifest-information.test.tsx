import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManifestMetadata } from "../src/components/ManifestMetadata";
import { BrowserProvider, useUIConfig } from "../src/context";

function ConfigProbe() {
  const config = useUIConfig();
  return (
    <span>
      {String(config.manifestInfoButton)}:{String(config.showManifestMetadata)}
    </span>
  );
}

function renderConfig(
  uiConfig?: Parameters<typeof BrowserProvider>[0]["uiConfig"],
) {
  return renderToStaticMarkup(
    <BrowserProvider uiConfig={uiConfig}>
      <ConfigProbe />
    </BrowserProvider>,
  );
}

describe("manifest information", () => {
  it("normalizes the new config and deprecated alias", () => {
    expect(renderConfig()).toContain("true:true");
    expect(renderConfig({ manifestInfoButton: false })).toContain(
      "false:false",
    );
    expect(renderConfig({ showManifestMetadata: false })).toContain(
      "false:false",
    );
    expect(
      renderConfig({
        manifestInfoButton: true,
        showManifestMetadata: false,
      }),
    ).toContain("true:true");
  });

  it("only renders a button when manifest information is available", () => {
    expect(renderToStaticMarkup(<ManifestMetadata manifest={{}} />)).toBe("");
    expect(
      renderToStaticMarkup(
        <ManifestMetadata manifest={{ rights: "https://example.org/rights" }} />,
      ),
    ).toContain('aria-label="Show manifest information"');
  });
});
