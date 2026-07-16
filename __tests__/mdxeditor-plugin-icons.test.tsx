import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IIIFPluginLogo } from "../src/icons/IIIFPluginLogos";

describe("MDXEditor plugin icons", () => {
  it("maps the stack and add config values to distinct marks", () => {
    const stack = renderToStaticMarkup(<IIIFPluginLogo icon="stack" />);
    expect(stack).toContain('width="1.3em"');
    expect(stack).toContain('height="1.3em"');
    expect(stack).toContain("<rect");
    expect(renderToStaticMarkup(<IIIFPluginLogo icon="add" />)).toContain(
      "<circle",
    );
  });
});
