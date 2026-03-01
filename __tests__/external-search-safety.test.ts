import { isDomainAllowed } from "../src/v2/browser/BrowserLink";
import {
  sanitizeExternalSummaryHtml,
  searchResultToIndexItem,
} from "../src/v2/search/combine";
import type { V2SearchResult } from "../src/v2/search/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

{
  const maliciousSummary =
    '<mark>hit</mark><img src=x onerror="alert(1)"><script>alert(1)</script>';
  const sanitized = sanitizeExternalSummaryHtml(maliciousSummary);

  assert(
    sanitized.includes("<mark>hit</mark>"),
    "Expected safe <mark> tags to be preserved",
  );
  assert(
    !sanitized.includes("<img"),
    "Expected disallowed <img> tag to be escaped",
  );
  assert(
    !sanitized.includes("<script"),
    "Expected disallowed <script> tag to be escaped",
  );
  assert(
    sanitized.includes("&lt;img") && sanitized.includes("&lt;script&gt;"),
    "Expected escaped disallowed tags to remain visible as text",
  );
}

{
  const result: V2SearchResult = {
    id: "abc123",
    label: "Result label",
    summary: "<mark>match</mark><svg onload=alert(1)>x</svg>",
    kind: "external",
    resourceId: "https://example.org/manifest/1",
    resourceType: "manifest",
  };

  const indexItem = searchResultToIndexItem(result);
  assert(
    indexItem.subLabel === "<mark>match</mark>&lt;svg onload=alert(1)&gt;x&lt;/svg&gt;",
    "Expected SearchIndexItem subLabel to contain only sanitized HTML",
  );
}

{
  const allowed = ["example.org", "https://iiif.wellcome.org/path"];

  assert(
    isDomainAllowed("https://example.org/manifest/1", allowed),
    "Expected exact hostname to be allowed",
  );
  assert(
    isDomainAllowed("https://sub.example.org/manifest/1", allowed),
    "Expected strict subdomain match to be allowed",
  );
  assert(
    isDomainAllowed("https://iiif.wellcome.org/resource", allowed),
    "Expected allowed domain entries with protocol/path to be normalized",
  );

  assert(
    !isDomainAllowed("https://example.org.evil.test/manifest/1", allowed),
    "Expected lookalike hostname prefix to be rejected",
  );
  assert(
    !isDomainAllowed("javascript:alert(1)", allowed),
    "Expected non-http protocol to be rejected",
  );
  assert(
    !isDomainAllowed("not-a-url", allowed),
    "Expected invalid URL input to be rejected",
  );
}

