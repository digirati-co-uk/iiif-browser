import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createTypesenseAdapter } from "../src/v2/search/typesense-adapter";

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("search config staleness and fallback ids", () => {
  it("memoises search config based on its direct input", async () => {
    const contextSource = await readRepoFile("src/v2/context.tsx");
    expect(contextSource).toMatch(/normalizeV2SearchConfig\(searchConfig\),\s*\[searchConfig\]/m);

    const modalSource = await readRepoFile("src/v2/components/OmnisearchModal.tsx");
    expect(modalSource).toMatch(/createExternalSearchAdapter\(searchConfig\),\s*\[searchConfig\]/m);
  });

  it("uses deterministic fallback IDs across repeated responses", async () => {
    const adapter = createTypesenseAdapter({
      host: "search.example.org",
      apiKey: "test-key",
      collection: "iiif_resources",
    });

    const payload = JSON.stringify({
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
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(payload, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    try {
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

      expect(first).toHaveLength(2);
      expect(second).toHaveLength(2);
      expect(first[0]?.id).toBe("resource:https://example.org/manifest/1");
      expect(first[1]?.id).toBe("resource:https://example.org/manifest/2");
      expect(first.map((r) => r.id).join("|")).toBe(second.map((r) => r.id).join("|"));
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("warns on invalid hit payloads and drops invalid identifiers", async () => {
    const adapter = createTypesenseAdapter({
      host: "search.example.org",
      apiKey: "test-key",
      collection: "iiif_resources",
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
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
      ),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const results = await adapter.search("missing", {
        filters: {},
        limit: 10,
        signal: new AbortController().signal,
      });

      expect(results).toHaveLength(0);
      expect(warnSpy.mock.calls.some((entry) => String(entry[0]).includes("Typesense hit mapping error"))).toBe(true);
    } finally {
      fetchSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
