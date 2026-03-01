import { describe, expect, it } from "vitest";
import { isDomainAllowed } from "../src/v2/browser/BrowserLink";
import { sanitizeExternalSummaryHtml, searchResultToIndexItem } from "../src/v2/search/combine";
import type { V2SearchResult } from "../src/v2/search/types";

describe("external search safety", () => {
  it("sanitizes external summary HTML safely", () => {
    const maliciousSummary = '<mark>hit</mark><img src=x onerror="alert(1)"><script>alert(1)</script>';
    const sanitized = sanitizeExternalSummaryHtml(maliciousSummary);

    expect(sanitized).toContain("<mark>hit</mark>");
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).toContain("&lt;img");
    expect(sanitized).toContain("&lt;script&gt;");
  });

  it("maps external search results with sanitized labels", () => {
    const result: V2SearchResult = {
      id: "abc123",
      label: "Result label",
      summary: "<mark>match</mark><svg onload=alert(1)>x</svg>",
      kind: "external",
      resourceId: "https://example.org/manifest/1",
      resourceType: "manifest",
    };

    const indexItem = searchResultToIndexItem(result);
    expect(indexItem.subLabel).toBe("<mark>match</mark>&lt;svg onload=alert(1)&gt;x&lt;/svg&gt;");
  });

  it("validates and normalises allowed domains", () => {
    const allowed = ["example.org", "https://iiif.wellcome.org/path"];

    expect(isDomainAllowed("https://example.org/manifest/1", allowed)).toBe(true);
    expect(isDomainAllowed("https://sub.example.org/manifest/1", allowed)).toBe(true);
    expect(isDomainAllowed("https://iiif.wellcome.org/resource", allowed)).toBe(true);

    expect(isDomainAllowed("https://example.org.evil.test/manifest/1", allowed)).toBe(false);
    expect(isDomainAllowed("javascript:alert(1)", allowed)).toBe(false);
    expect(isDomainAllowed("not-a-url", allowed)).toBe(false);
  });
});
