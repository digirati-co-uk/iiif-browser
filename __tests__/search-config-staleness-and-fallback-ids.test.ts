import { createTypesenseAdapter } from "../src/v2/search/typesense-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<any>;

async function readRepoFile(relativePath: string): Promise<string> {
  const fs = await dynamicImport("node:fs");
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// Regression checks for stale search config memoization dependencies.
{
  const contextSource = await readRepoFile("src/v2/context.tsx");
  assert(
    /normalizeV2SearchConfig\(searchConfig\),\s*\[searchConfig\]/m.test(contextSource),
    "Expected BrowserProvider normalizedSearchConfig memo to depend on searchConfig",
  );

  const modalSource = await readRepoFile("src/v2/components/OmnisearchModal.tsx");
  assert(
    /createExternalSearchAdapter\(searchConfig\),\s*\[searchConfig\]/m.test(modalSource),
    "Expected OmnisearchModal adapter memo to depend on searchConfig",
  );
}

await (async () => {
  // Deterministic fallback IDs for repeated responses when id fields are absent.
  const adapter = createTypesenseAdapter({
    host: "search.example.org",
    apiKey: "test-key",
    collection: "iiif_resources",
  });

  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          hits: [
            {
              document: {
                manifest_id: "https://example.org/manifest/1",
                label: "Manifest One",
              },
            },
            {
              document: {
                manifest_id: "https://example.org/manifest/2",
                label: "Manifest Two",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )) as typeof fetch;

    const first = await adapter.search("manifest", {
      filters: {},
      limit: 10,
      signal: new AbortController().signal,
    });
    const second = await adapter.search("manifest", {
      filters: {},
      limit: 10,
      signal: new AbortController().signal,
    });

    assert(first.length === 2, "Expected two mapped results");
    assert(second.length === 2, "Expected two mapped results on repeated call");
    assert(
      first[0]?.id === "resource:https://example.org/manifest/1",
      "Expected deterministic fallback id derived from resourceId",
    );
    assert(
      first[1]?.id === "resource:https://example.org/manifest/2",
      "Expected deterministic fallback id derived from resourceId for all hits",
    );
    assert(
      first.map((r) => r.id).join("|") === second.map((r) => r.id).join("|"),
      "Expected repeated identical responses to produce stable IDs",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
})();

await (async () => {
  // Invalid hits (missing both id and resourceId candidates) are rejected.
  const adapter = createTypesenseAdapter({
    host: "search.example.org",
    apiKey: "test-key",
    collection: "iiif_resources",
  });

  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnMessages: unknown[] = [];

  try {
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args);
    };
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          hits: [
            {
              document: {
                label: "Missing identifiers",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )) as typeof fetch;

    const results = await adapter.search("missing", {
      filters: {},
      limit: 10,
      signal: new AbortController().signal,
    });

    assert(results.length === 0, "Expected invalid hits to be dropped consistently");
    assert(
      warnMessages.some((entry) => String((entry as unknown[])[0]).includes("Typesense hit mapping error")),
      "Expected invalid hit mapping to emit a warning",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
})();
