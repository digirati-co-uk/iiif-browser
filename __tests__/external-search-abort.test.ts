import { canApplyExternalSearchResponse } from "../src/v2/hooks/use-external-search";
import { createTypesenseAdapter } from "../src/v2/search/typesense-adapter";
import type { V2ExternalSearchAdapter } from "../src/v2/search/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

await (async () => {
  // Contract-level check: adapters receive AbortSignal in options.
  const probeAdapter: V2ExternalSearchAdapter = {
    id: "probe",
    async search(_query, options) {
      assert(options.signal instanceof AbortSignal, "Expected AbortSignal on adapter options");
      return [];
    },
  };

  await probeAdapter.search("hello", {
    filters: {},
    limit: 5,
    signal: new AbortController().signal,
  });
})();

// Stale/aborted-response gate used by the hook.
{
  const active = new AbortController();

  assert(
    canApplyExternalSearchResponse(active.signal, 2, 2),
    "Expected latest active request to be applicable",
  );
  assert(
    !canApplyExternalSearchResponse(active.signal, 1, 2),
    "Expected stale request IDs to be ignored",
  );

  active.abort();

  assert(
    !canApplyExternalSearchResponse(active.signal, 2, 2),
    "Expected aborted requests to be ignored",
  );
}

await (async () => {
  // Adapter-level check: signal is forwarded to fetch and aborted requests
  // resolve safely without warning noise.
  const adapter = createTypesenseAdapter({
    host: "search.example.org",
    apiKey: "test-key",
    collection: "iiif_resources",
  });

  let capturedSignal: AbortSignal | undefined;
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnMessages: unknown[] = [];

  try {
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args);
    };

    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortError = new Error("Request aborted") as Error & { name: string };
          abortError.name = "AbortError";
          reject(abortError);
        });
      });
    }) as typeof fetch;

    const controller = new AbortController();
    const searchPromise = adapter.search("opera", {
      filters: {},
      limit: 10,
      signal: controller.signal,
    });

    controller.abort();

    const results = await searchPromise;

    assert(capturedSignal === controller.signal, "Expected fetch to receive adapter AbortSignal");
    assert(Array.isArray(results) && results.length === 0, "Expected aborted search to resolve as empty results");
    assert(warnMessages.length === 0, "Expected aborted search to avoid warning logs");
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
})();
