// @vitest-environment jsdom
import { Vault } from "@iiif/helpers";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { GridList } from "react-aria-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowserLink,
  type BrowserLinkConfig,
} from "../src/browser/BrowserLink";
import {
  BrowserProvider,
  useBrowserStoreContext,
  useOutputStore,
} from "../src/context";
import { ResourceGridItem } from "../src/resources/ResourceGridItem";
import { ResourceListItem } from "../src/resources/ResourceListItem";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let browser: ReturnType<typeof useBrowserStoreContext>;
let output: ReturnType<typeof useOutputStore>;
const resource = {
  id: "https://example.org/item",
  type: "Manifest",
  label: { en: ["Test resource"] },
};
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
async function render(
  config: Partial<BrowserLinkConfig> = {},
  kind: "plain" | "grid" | "list" = "plain",
  type = "Manifest",
) {
  const item = { ...resource, type };
  const vault = new Vault();
  vault.loadSync(item.id, { ...item, items: [] });
  function Probe() {
    browser = useBrowserStoreContext();
    output = useOutputStore();
    if (kind !== "plain")
      return (
        <GridList aria-label="Resources" selectionMode="multiple">
          {kind === "grid" ? (
            <ResourceGridItem resource={item} />
          ) : (
            <ResourceListItem resource={item} />
          )}
        </GridList>
      );
    return (
      <BrowserLink as="button" resource={item}>
        Open resource
      </BrowserLink>
    );
  }
  await act(async () =>
    root.render(
      <BrowserProvider
        vault={vault}
        linkConfig={config}
        browserConfig={{
          saveToLocalStorage: false,
          restoreFromLocalStorage: false,
          initialHistory: [
            { url: "iiif://about", route: "/about", resource: null },
          ],
        }}
      >
        <Probe />
      </BrowserProvider>,
    ),
  );
}
async function click(selector = "button") {
  await act(async () =>
    (container.querySelector(selector) as HTMLElement).click(),
  );
}

describe("BrowserLink navigation and selection", () => {
  it.each(["plain", "grid", "list"] as const)(
    "preserves modifier selection in %s links",
    async (kind) => {
      await render({ clickToSelect: true, multiSelect: true }, kind);
      const other = { id: "https://example.org/other", type: "Manifest" };
      await act(async () => output.getState().replaceSelectedItems([other]));
      await act(async () =>
        (
          container.querySelector(
            kind === "plain" ? "button" : '[role="row"]',
          ) as HTMLElement
        ).dispatchEvent(
          new MouseEvent("click", { bubbles: true, ctrlKey: true }),
        ),
      );
      expect(output.getState().selectedItems.map((item) => item.id)).toEqual([
        other.id,
        resource.id,
      ]);
    },
  );

  it.each(["grid", "list", "plain"] as const)(
    "keeps non-selectable collections navigable in %s selection mode",
    async (kind) => {
      await render(
        {
          clickToNavigate: false,
          clickToSelect: true,
          canSelectCollection: false,
        },
        kind,
        "Collection",
      );
      await click(kind === "plain" ? "button" : '[role="row"]');
      expect(browser.getState().router.location.pathname).toBe("/collection");
    },
  );

  it("browses before the first explicit selection, even with an automatic selection", async () => {
    await render();
    await act(async () =>
      output.setState({
        selectedItems: [resource],
        wasManuallySelected: false,
      }),
    );
    await click();
    expect(browser.getState().router.location.pathname).toBe("/manifest");
  });
  it("selects after the first explicit selection and returns to browsing after reset", async () => {
    await render();
    await act(async () =>
      output
        .getState()
        .replaceSelectedItems([
          { id: "https://example.org/other", type: "Manifest" },
        ]),
    );
    await click();
    expect(browser.getState().router.location.pathname).toBe("/about");
    expect(output.getState().selectedItems[0].id).toBe(resource.id);
    await act(async () => output.getState().resetSelection());
    await click();
    expect(browser.getState().router.location.pathname).toBe("/manifest");
  });
  it.each(["grid", "list", "plain"] as const)(
    "keeps non-selectable manifests navigable in %s selection mode",
    async (kind) => {
      await render(
        {
          clickToNavigate: false,
          clickToSelect: true,
          canSelectManifest: false,
        },
        kind,
      );
      await click(kind === "plain" ? "button" : '[role="row"]');
      expect(browser.getState().router.location.pathname).toBe("/manifest");
    },
  );
  it.each(["grid", "list"] as const)(
    "provides a working %s navigation arrow when single-click navigation is disabled",
    async (kind) => {
      await render(
        {
          clickToNavigate: false,
          clickToSelect: true,
          alwaysShowNavigationArrow: false,
        },
        kind,
      );
      await click('[role="row"]');
      expect(output.getState().selectedItems[0].id).toBe(resource.id);
      expect(browser.getState().router.location.pathname).toBe("/about");
      await click('button[aria-label="Navigate to resource"]');
      expect(browser.getState().router.location.pathname).toBe("/manifest");
    },
  );
  it("honors navigation restrictions for double-click and direct clicks", async () => {
    await render({
      clickToNavigate: false,
      clickToSelect: true,
      doubleClickToNavigate: true,
      canSelectManifest: false,
      canNavigateToManifest: false,
    });
    await click();
    await act(async () =>
      container
        .querySelector("button")!
        .dispatchEvent(new MouseEvent("dblclick", { bubbles: true })),
    );
    expect(browser.getState().router.location.pathname).toBe("/about");
    expect(output.getState().selectedItems).toEqual([]);
  });
  it("preserves explicit false click-to-select after a manual selection", async () => {
    await render({ clickToSelect: false });
    await act(async () => output.getState().replaceSelectedItems([resource]));
    await click();
    expect(browser.getState().router.location.pathname).toBe("/manifest");
  });
});
