// @vitest-environment jsdom
import { Vault } from "@iiif/helpers";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  BrowserI18nProvider,
  type BrowserI18n,
  useBrowserI18n,
} from "../src/i18n";
import {
  BrowserProvider,
  useBrowserStoreContext,
  useOmnisearchStore,
  useOutputStore,
} from "../src/context";
import { BrowserBackButton } from "../src/browser/BrowserBackButton";
import { BrowserOutputActions } from "../src/browser/BrowserOuputActions";
import { HistoryPage } from "../src/routes/HistoryPage";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
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
const dutch: BrowserI18n = {
  locale: "nl",
  direction: "ltr",
  translate: (key, fallback, values) => {
    const labels: Record<string, string> = {
      goBack: "Terug",
      history: "Geschiedenis",
      historyCount: "{{value}} vermelding",
    };
    return (labels[key] ?? fallback).replace(/\{\{(\w+)\}\}/g, (_, key) =>
      String(values?.[key] ?? ""),
    );
  },
  formatRelativeTime: () => "zojuist",
};

it("changes UI language and search labels without replacing history, selection or authored labels", async () => {
  const vault = new Vault();
  await vault.loadManifest("https://example.org/m", {
    id: "https://example.org/m",
    type: "Manifest",
    label: { cy: ["Teitl Cymraeg"] },
    items: [],
  });
  const before = JSON.stringify(vault.getState());
  let browser!: ReturnType<typeof useBrowserStoreContext>;
  let search!: ReturnType<typeof useOmnisearchStore>;
  let outputs!: ReturnType<typeof useOutputStore>;
  function Probe() {
    browser = useBrowserStoreContext();
    search = useOmnisearchStore();
    outputs = useOutputStore();
    return (
      <>
        <BrowserBackButton />
        <BrowserOutputActions />
        <HistoryPage />
      </>
    );
  }
  const config = {
    saveToLocalStorage: false,
    restoreFromLocalStorage: true,
    initialHistory: [
      {
        route: "/manifest",
        url: "https://example.org/m",
        resource: "https://example.org/m",
        timestamp: new Date().toISOString(),
        metadata: { type: "Manifest", label: { cy: ["Teitl Cymraeg"] } },
      },
    ],
  };
  const callerOutput = [
    {
      label: "Caller label",
      type: "callback" as const,
      format: { type: "url" as const },
      supportedTypes: ["Manifest" as const],
      cb: vi.fn(),
    },
  ];
  const render = (i18n?: BrowserI18n) =>
    act(async () =>
      root.render(
        <BrowserI18nProvider i18n={i18n}>
          <BrowserProvider
            vault={vault}
            browserConfig={config}
            outputConfig={callerOutput}
          >
            <Probe />
          </BrowserProvider>
        </BrowserI18nProvider>,
      ),
    );
  await render();
  await act(async () =>
    outputs
      .getState()
      .replaceSelectedItems([
        { id: "https://example.org/m", type: "Manifest" },
      ]),
  );
  const history = browser.getState().history;
  const selected = outputs.getState().selectedItems;
  expect(container.querySelector('[aria-label="Go Back"]')).not.toBeNull();
  await render(dutch);
  expect(container.querySelector('[aria-label="Terug"]')).not.toBeNull();
  expect(container.textContent).toContain("1 vermelding");
  expect(container.textContent).toContain("zojuist");
  expect(container.textContent).toContain("Teitl Cymraeg");
  expect(container.textContent).toContain("Caller label");
  expect(browser.getState().history).toBe(history);
  expect(outputs.getState().selectedItems).toBe(selected);
  expect(JSON.stringify(vault.getState())).toBe(before);
  await act(async () => search.getState().open("Geschiedenis"));
  expect(
    search.getState().results?.some((item) => item.id === "iiif://history"),
  ).toBe(true);
  await render({ locale: "en" });
  expect(search.getState().query).toBe("Geschiedenis");
  expect(
    search.getState().results?.some((item) => item.id === "iiif://history"),
  ).toBe(false);
});

it("inherits translation context while keeping sibling instances independent", async () => {
  function Probe() {
    const { t } = useBrowserI18n();
    return <span>{t("goBack", "Go Back")}</span>;
  }
  await act(async () =>
    root.render(
      <>
        <BrowserI18nProvider i18n={dutch}>
          <BrowserI18nProvider>
            <Probe />
          </BrowserI18nProvider>
        </BrowserI18nProvider>
        <Probe />
      </>,
    ),
  );
  expect(container.textContent).toBe("TerugGo Back");
});
