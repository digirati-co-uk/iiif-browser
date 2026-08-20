import { renderToStaticMarkup } from "react-dom/server";
import { useCanvas, useThumbnail, useVault } from "react-iiif-vault";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasThumbnailImage } from "../src/components/CanvasThumbnailImage";

vi.mock("react-iiif-vault", () => ({
  useCanvas: vi.fn(),
  useThumbnail: vi.fn(),
  useVault: vi.fn(),
}));

vi.mock("../src/components/CanvasThumbnailFallback", () => ({
  CanvasThumbnailFallback: () => (
    <div data-testid="canvas-thumbnail-fallback" />
  ),
}));

describe("CanvasThumbnailImage", () => {
  beforeEach(() => {
    vi.mocked(useCanvas).mockReturnValue({
      id: "https://example.org/canvas/1",
    } as ReturnType<typeof useCanvas>);
    vi.mocked(useThumbnail).mockReturnValue(undefined);
    vi.mocked(useVault).mockReturnValue({} as ReturnType<typeof useVault>);
  });

  it("renders thumbnails and fallbacks immediately", () => {
    vi.mocked(useThumbnail).mockReturnValue({
      id: "https://example.org/thumbnail.jpg",
    } as ReturnType<typeof useThumbnail>);

    const thumbnail = renderToStaticMarkup(<CanvasThumbnailImage />);

    expect(thumbnail).toContain("<img");
    expect(thumbnail).toContain('src="https://example.org/thumbnail.jpg"');
    expect(thumbnail).toContain('loading="lazy"');
    expect(thumbnail).not.toContain("<span");

    vi.mocked(useThumbnail).mockReturnValue(undefined);
    const fallback = renderToStaticMarkup(<CanvasThumbnailImage />);

    expect(fallback).toContain('data-testid="canvas-thumbnail-fallback"');
    expect(fallback).not.toContain("<span");
  });
});
