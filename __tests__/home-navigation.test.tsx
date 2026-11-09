// @vitest-environment jsdom
import { Vault } from "@iiif/helpers";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserHomeButton } from "../src/browser/BrowserHomeButton";
import {
  BrowserProvider,
  useBrowserStoreContext,
  useResolve,
} from "../src/context";
import type { BrowserLinkConfig } from "../src/browser/BrowserLink";
import type { BrowserStoreConfig } from "../src/stores/browser-store";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let store: ReturnType<typeof useBrowserStoreContext>;
let resolve: ReturnType<typeof useResolve>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderBrowser({
  href,
  vault = new Vault(),
  linkConfig,
  browserConfig,
}: {
  href?: string;
  vault?: Vault;
  linkConfig?: Partial<BrowserLinkConfig>;
  browserConfig?: Partial<BrowserStoreConfig>;
} = {}) {
  function Probe() {
    store = useBrowserStoreContext();
    resolve = useResolve();
    return <BrowserHomeButton href={href} />;
  }
  await act(async () => {
    root.render(
      <BrowserProvider
        vault={vault}
        uiConfig={{ homeLink: href }}
        linkConfig={linkConfig}
        browserConfig={{
          saveToLocalStorage: false,
          restoreFromLocalStorage: false,
          initialHistory: [
            { route: "/about", url: "iiif://about", resource: null },
          ],
          customRoutes: { "iiif://notebooks": "/notebooks" },
          ...browserConfig,
        }}
      >
        <Probe />
      </BrowserProvider>,
    );
  });
}

async function pressHome() {
  await act(async () => container.querySelector("button")!.click());
}

describe("Home navigation without a current resource", () => {
  it("falls back to the built-in homepage when href is undefined", async () => {
    await renderBrowser();
    await pressHome();
    expect(store.getState().lastUrl).toBe("iiif://home");
    expect(store.getState().router.location.pathname).toBe("/");
    expect(container.querySelector("button")!.disabled).toBe(true);
  });

  it("preserves notebook custom routes, query parameters and Back/Forward", async () => {
    const href = "iiif://notebooks?notebook=first&view=collection";
    await renderBrowser({ href });
    await pressHome();
    expect(store.getState().router.location.pathname).toBe("/notebooks");
    expect(store.getState().router.location.search).toBe(
      "?notebook=first&view=collection",
    );
    expect(store.getState().lastUrl).toBe(href);
    expect(container.querySelector("button")!.disabled).toBe(true);
    await act(async () => store.getState().history.back());
    expect(store.getState().lastUrl).toBe("iiif://about");
    expect(container.querySelector("button")!.disabled).toBe(false);
    await act(async () => store.getState().history.forward());
    expect(store.getState().lastUrl).toBe(href);
  });

  it("opens an image-service home URL through the loading route", async () => {
    const href = "https://example.org/image/info.json";
    await renderBrowser({ href });
    await pressHome();
    expect(store.getState().router.location.pathname).toBe("/loading");
    expect(
      new URLSearchParams(store.getState().router.location.search).get("id"),
    ).toBe(href);
  });

  it.each(["Manifest", "Collection"])(
    "navigates a known %s home resource",
    async (type) => {
      const href = `https://example.org/${type.toLowerCase()}`;
      await renderBrowser({
        href,
        browserConfig: {
          seedCollections: [{ id: href, type, items: [] } as any],
        },
      });
      await pressHome();
      expect(store.getState().router.location.pathname).toBe(
        `/${type.toLowerCase()}`,
      );
      expect(store.getState().lastUrl).toBe(href);
    },
  );

  it.each([
    {
      href: "iiif://notebooks",
      linkConfig: { allowNavigationToBuiltInPages: false },
    },
    {
      href: "https://example.org/image/info.json",
      linkConfig: {
        disallowedResources: ["https://example.org/image/info.json"],
      },
    },
  ])(
    "continues enforcing navigation restrictions for $href",
    async (options) => {
      await renderBrowser(options);
      await pressHome();
      expect(store.getState().lastUrl).toBe("iiif://about");
    },
  );
});

describe("useResolve input validation", () => {
  it("ignores absent or malformed targets before looking them up in the Vault", async () => {
    const vault = new Vault();
    await renderBrowser({ vault });
    const get = vi.spyOn(vault, "get");
    await act(async () => {
      for (const input of [
        undefined,
        null,
        "",
        "   ",
        {},
        { id: undefined },
        { id: 123 },
      ]) {
        expect(() => resolve(input as any)).not.toThrow();
      }
    });
    expect(get).not.toHaveBeenCalled();
    expect(store.getState().lastUrl).toBe("iiif://about");
  });

  it("preserves object type normalization and parent/search options", async () => {
    const customCanNavigate = vi.fn(() => true);
    await renderBrowser({ linkConfig: { customCanNavigate } });
    const parent = { id: "https://example.org/manifest", type: "Manifest" };
    await act(async () =>
      resolve(
        { id: "https://example.org/canvas", type: "canvas" },
        { parent, searchParams: new URLSearchParams("xywh=1,2,3,4") },
      ),
    );
    expect(customCanNavigate).toHaveBeenCalledWith(
      { id: "https://example.org/canvas", type: "Canvas" },
      expect.anything(),
    );
    const params = new URLSearchParams(store.getState().router.location.search);
    expect(params.get("id")).toBe(parent.id);
    expect(params.get("canvas")).toBe("https://example.org/canvas");
    expect(params.get("xywh")).toBe("1,2,3,4");
  });
});
