import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("MDX plugin stylesheet", () => {
  it("includes scoped utilities and plugin rules without Tailwind reset styles", async () => {
    const [entry, utilities, config] = await Promise.all([
      source("src/mdx-plugins.css"),
      source("src/styles/lib.css"),
      source("tailwind.config.js"),
    ]);

    expect(entry).toContain('./mdxeditor/styles.css');
    expect(entry).toContain('./mdxeditor-snippet/styles.css');
    expect(utilities).toContain("@tailwind utilities");
    expect(utilities).not.toContain("@tailwind base");
    expect(utilities).not.toContain("@tailwind components");
    expect(config).toContain('important: ".iiif-browser"');
  });
});
