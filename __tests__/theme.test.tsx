// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  ensureContrast,
  parseColor,
  readableTextOn,
  WHITE,
  type RGB,
} from "../src/theme/colors";
import { ThemeProvider, useBrowserTheme } from "../src/theme/context";
import {
  createThemeAttributes,
  createThemeVariables,
  DARK_SURFACE,
  resolveAccent,
  resolveThemeMode,
} from "../src/theme/theme";

const channels = (value: string) =>
  value.split(" ").map(Number) as unknown as RGB;

const ACCENTS = [
  "#2563eb", // default blue
  "#4c9c53", // Theseus green
  "#0d9488",
  "#e50015",
  "#ffd075", // pale yellow
  "#f5f5f5", // near white
  "#0b2a6f", // navy
  "#111111", // near black
  "#8b5cf6",
];

describe("parseColor", () => {
  it("accepts hex, rgb() and channel lists", () => {
    expect(parseColor("#0d9488")).toEqual([13, 148, 136]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("rgb(13 148 136)")).toEqual([13, 148, 136]);
    expect(parseColor("rgb(13, 148, 136)")).toEqual([13, 148, 136]);
    expect(parseColor("13 148 136")).toEqual([13, 148, 136]);
    expect(parseColor("13,148,136")).toEqual([13, 148, 136]);
  });

  it("rejects invalid colours so the default accent is used", () => {
    expect(parseColor("")).toBeNull();
    expect(parseColor("teal")).toBeNull();
    expect(parseColor("300 0 0")).toBeNull();
    expect(createThemeVariables("light", "not-a-colour")).toEqual({});
  });
});

describe("accessible accent text", () => {
  it("prefers white when it passes AA and otherwise picks the higher contrast", () => {
    expect(readableTextOn([37, 99, 235])).toEqual([255, 255, 255]);
    expect(readableTextOn([255, 208, 117])).toEqual([0, 0, 0]);
    expect(readableTextOn([76, 156, 83])).toEqual([0, 0, 0]);
  });

  it.each(ACCENTS)(
    "%s: button label has AA contrast on the fill and hover in both modes",
    (accent) => {
      for (const mode of ["light", "dark"] as const) {
        const { fill, fillHover, text } = resolveAccent(mode, accent);
        expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(text, fillHover)).toBeGreaterThanOrEqual(4.5);
        // Exposed variables stay consistent with the resolved colours.
        const variables = createThemeVariables(mode, accent);
        if (variables["--ib-accent-text"])
          expect(channels(variables["--ib-accent-text"])).toEqual(text);
      }
    },
  );

  it.each(ACCENTS)("%s: fill stands out from the surface (3:1)", (accent) => {
    expect(
      contrastRatio(resolveAccent("light", accent).fill, WHITE),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(resolveAccent("dark", accent).fill, DARK_SURFACE),
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(ACCENTS)(
    "%s: accent text (blue-600) is readable on the surface and its tints",
    (accent) => {
      const light = createThemeVariables("light", accent);
      const dark = createThemeVariables("dark", accent);
      const lightText = channels(light["--ib-blue-600"] ?? "37 99 235");
      const darkText = channels(dark["--ib-blue-600"]!);
      expect(contrastRatio(lightText, WHITE)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(darkText, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5);
      for (const tint of ["--ib-blue-50", "--ib-blue-100"]) {
        if (light[tint])
          expect(
            contrastRatio(lightText, channels(light[tint]!)),
          ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(darkText, channels(dark[tint]!)),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("ensureContrast leaves passing colours alone and moves failing ones", () => {
    const blue: RGB = [37, 99, 235];
    expect(ensureContrast(blue, WHITE, 3, [0, 0, 0])).toEqual(blue);
    const pale: RGB = [255, 208, 117];
    expect(
      contrastRatio(ensureContrast(pale, WHITE, 3, [0, 0, 0]), WHITE),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("dark palette", () => {
  const dark = createThemeVariables("dark");
  const surfaces = ["--ib-white", "--ib-gray-50", "--ib-gray-100"];

  it("uses the tinted Theseus surface rather than black", () => {
    expect(dark["--ib-white"]).toBe("34 33 39");
    expect(dark["--ib-viewer"]).toBe("17 16 20");
    const [r, g, b] = channels(dark["--ib-white"]!);
    expect(b).toBeGreaterThan(r!);
    expect(b).toBeGreaterThan(g!);
  });

  it("keeps the text shades readable on every surface", () => {
    for (const scale of ["gray", "slate"]) {
      for (const shade of [500, 600, 700, 800, 900]) {
        for (const surface of surfaces) {
          expect(
            contrastRatio(
              channels(dark[`--ib-${scale}-${shade}`]!),
              channels(dark[surface]!),
            ),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      // gray-400 is used for placeholders/muted icons.
      expect(
        contrastRatio(
          channels(dark[`--ib-${scale}-400`]!),
          channels(dark["--ib-white"]!),
        ),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps status colours readable (badge/error text on its tint)", () => {
    expect(
      contrastRatio(
        channels(dark["--ib-orange-700"]!),
        channels(dark["--ib-orange-50"]!),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        channels(dark["--ib-amber-900"]!),
        channels(dark["--ib-amber-50"]!),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        channels(dark["--ib-red-700"]!),
        channels(dark["--ib-white"]!),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    for (const badge of ["indigo", "teal", "violet"]) {
      expect(
        contrastRatio(
          channels(dark[`--ib-${badge}-fg`]!),
          channels(dark[`--ib-${badge}-bg`]!),
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("theme attributes", () => {
  it("sets nothing for the default light theme", () => {
    expect(createThemeVariables("light")).toEqual({});
    expect(createThemeVariables("light", "#2563eb")).toEqual({});
    expect(createThemeAttributes("light")["data-ib-theme"]).toBe("light");
  });

  it("applies a custom accent in light mode without touching neutrals", () => {
    const variables = createThemeVariables("light", "#0d9488");
    expect(variables["--ib-accent"]).toBeDefined();
    expect(variables["--ib-white"]).toBeUndefined();
  });

  it("marks dark mode for the native colour scheme", () => {
    const attributes = createThemeAttributes("dark");
    expect(attributes["data-ib-theme"]).toBe("dark");
    expect((attributes.style as any).colorScheme).toBe("dark");
  });

  it("resolves system preference", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });
});

describe("ThemeProvider", () => {
  function render(element: ReturnType<typeof createElement>) {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(element));
    return { host, root };
  }

  function Probe({
    onValue,
  }: {
    onValue(value: ReturnType<typeof useBrowserTheme>): void;
  }) {
    onValue(useBrowserTheme());
    return null;
  }

  it("is uncontrolled, light by default and remembers the toggle", () => {
    window.localStorage.clear();
    let value!: ReturnType<typeof useBrowserTheme>;
    const { root } = render(
      createElement(
        ThemeProvider as any,
        { preferenceKey: "t1" },
        createElement(Probe, { onValue: (v) => (value = v) }),
      ),
    );
    expect(value.mode).toBe("light");
    expect(value.canToggle).toBe(true);
    act(() => value.toggle());
    expect(value.mode).toBe("dark");
    expect(window.localStorage.getItem("iiif-browser:theme:v1:t1")).toBe(
      "dark",
    );
    act(() => root.unmount());

    let restored!: ReturnType<typeof useBrowserTheme>;
    const second = render(
      createElement(
        ThemeProvider as any,
        { preferenceKey: "t1" },
        createElement(Probe, { onValue: (v) => (restored = v) }),
      ),
    );
    expect(restored.mode).toBe("dark");
    act(() => second.root.unmount());
  });

  it("lets the host own the theme", () => {
    window.localStorage.clear();
    let value!: ReturnType<typeof useBrowserTheme>;
    const changes: string[] = [];
    const { root } = render(
      createElement(
        ThemeProvider as any,
        { theme: "dark" },
        createElement(Probe, { onValue: (v) => (value = v) }),
      ),
    );
    expect(value.mode).toBe("dark");
    expect(value.canToggle).toBe(false);
    act(() => root.unmount());

    const controlled = render(
      createElement(
        ThemeProvider as any,
        {
          theme: "dark",
          onThemeChange: (theme: string) => changes.push(theme),
        },
        createElement(Probe, { onValue: (v) => (value = v) }),
      ),
    );
    expect(value.canToggle).toBe(true);
    act(() => value.toggle());
    expect(changes).toEqual(["light"]);
    expect(value.mode).toBe("dark"); // host has not updated the prop
    expect(window.localStorage.length).toBe(0);
    act(() => controlled.root.unmount());
  });

  it("nested providers inherit the surrounding theme and accent", () => {
    let inner!: ReturnType<typeof useBrowserTheme>;
    const { root } = render(
      createElement(
        ThemeProvider as any,
        { theme: "dark", accentColor: "#0d9488" },
        createElement(
          ThemeProvider as any,
          {},
          createElement(Probe, { onValue: (v) => (inner = v) }),
        ),
      ),
    );
    expect(inner.mode).toBe("dark");
    expect(inner.accentColor).toBe("#0d9488");
    expect(inner.canToggle).toBe(false);
    act(() => root.unmount());
  });
});
