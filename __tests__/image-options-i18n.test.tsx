// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { BrowserI18nProvider, type BrowserI18n } from "../src/i18n";
import {
  ImageOptions,
  type Draft,
  type ImageInfoCache,
} from "../src/editor/image-options";
import { parseIIIFImageUrl } from "../src/mdxeditor/image-api";

it("translates dynamic image dimensions without changing the draft or output URL", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const service = "https://images.example.org/image";
  const cache: ImageInfoCache = new Map([
    [
      service,
      Promise.resolve({
        id: service,
        type: "ImageService3",
        protocol: "http://iiif.io/api/image",
        profile: "level2",
        width: 2400,
        height: 1800,
        sizes: [{ width: 800, height: 600 }],
      }),
    ],
  ]);
  const draft: Draft = {
    request: parseIIIFImageUrl(`${service}/full/640,/0/default.jpg`)!,
    label: "Teitl Cymraeg",
  };
  const update = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const translate: BrowserI18n["translate"] = (key, fallback, values) => {
    const labels: Record<string, string> = {
      maximumSize: "Maximaal ({{width}} × {{height}})",
      preferredSize: "Voorkeur: {{width}} × {{height}}",
      width: "Breedte {{width}} px",
    };
    return (labels[key] ?? fallback).replace(/\{\{(\w+)\}\}/g, (_, key) =>
      typeof values?.[key] === "number"
        ? new Intl.NumberFormat("nl").format(values[key])
        : String(values?.[key] ?? ""),
    );
  };
  const render = (i18n?: BrowserI18n) =>
    act(async () =>
      root.render(
        <BrowserI18nProvider i18n={i18n}>
          <ImageOptions
            draft={draft}
            setDraft={update}
            cache={cache}
            onCancel={() => {}}
            imageAction={null}
            canvasAction={null}
          />
        </BrowserI18nProvider>,
      ),
    );
  try {
    await render();
    const image = container.querySelector("img")!;
    const url = image.getAttribute("src");
    await render({ locale: "nl", translate });
    expect(container.textContent).toContain("Maximaal (2.400 × 1.800)");
    expect(container.textContent).toContain("Voorkeur: 800 × 600");
    expect(container.textContent).toContain("Breedte 640 px");
    expect(container.querySelector("img")).toBe(image);
    expect(image.getAttribute("src")).toBe(url);
    expect(update).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
