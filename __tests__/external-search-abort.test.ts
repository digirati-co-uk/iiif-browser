import { describe, expect, it, vi } from "vitest";
import { canApplyExternalSearchResponse } from "../src/hooks/use-external-search";
import type { V2ExternalSearchAdapter } from "../src/search/types";
import { createTypesenseAdapter } from "../src/search/typesense-adapter";

describe("external search abort", () => {
  it("forwards an AbortSignal into adapter search options", async () => {
    const probeAdapter: V2ExternalSearchAdapter = {
      id: "probe",
      async search(_query, options) {
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return [];
      },
    };

    await probeAdapter.search("hello", {
      filters: {},
      limit: 5,
      signal: new AbortController().signal,
    });
  });

  it("ignores stale or aborted responses", () => {
    const active = new AbortController();

    expect(canApplyExternalSearchResponse(active.signal, 2, 2)).toBe(true);
    expect(canApplyExternalSearchResponse(active.signal, 1, 2)).toBe(false);

    active.abort();

    expect(canApplyExternalSearchResponse(active.signal, 2, 2)).toBe(false);
  });

  it("forwards adapter signal to fetch and resolves aborted calls with no warnings", async () => {
    const adapter = createTypesenseAdapter({
      host: "search.example.org",
      apiKey: "test-key",
      collection: "iiif_resources",
    });

    let capturedSignal: AbortSignal | undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const warnSpy = vi.spyOn(console, "warn");

    fetchSpy.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Request aborted", "AbortError"));
        });
      });
    });
    warnSpy.mockImplementation(() => {});

    try {
      const controller = new AbortController();
      const searchPromise = adapter.search("opera", {
        filters: {},
        limit: 10,
        signal: controller.signal,
      });
      controller.abort();
      const results = await searchPromise;

      expect(capturedSignal).toBe(controller.signal);
      expect(results).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
