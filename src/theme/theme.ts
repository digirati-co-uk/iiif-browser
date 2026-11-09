import type { CSSProperties } from "react";
import {
  BLACK,
  type RGB,
  WHITE,
  ensureContrast,
  mix,
  parseColor,
  readableTextOn,
  toChannels,
} from "./colors";

/**
 * Theming works by overriding CSS variables that the Tailwind config (and the hand written
 * stylesheets) read with Tailwind's own colours as the fallback, e.g.
 * `rgb(var(--ib-gray-500, 107 114 128) / <alpha-value>)`. Light mode with the default accent
 * therefore sets nothing at all, and the dark palette and any custom accent are applied as inline
 * custom properties on the browser/notebook root (and on anything portalled out of it).
 */

export type ThemeMode = "light" | "dark";
/** `system` follows `prefers-color-scheme`. */
export type ThemePreference = ThemeMode | "system";

export const DEFAULT_ACCENT = "#2563eb";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
type Step = (typeof STEPS)[number];
type Scale = Record<Step, RGB>;

/**
 * The dark neutrals are the Theseus viewer palette: surfaces keep a slight blue/violet tint
 * instead of being pure black. `white` is the base surface, so anything that was `bg-white` in
 * the light theme sits on it.
 */
export const DARK_SURFACE: RGB = [34, 33, 39];

const DARK_NEUTRAL: Scale = {
  50: [42, 41, 48],
  100: [51, 50, 58],
  200: [61, 60, 69],
  300: [76, 75, 86],
  400: [138, 137, 150],
  500: [158, 157, 170],
  600: [180, 179, 192],
  700: [202, 201, 212],
  800: [222, 221, 230],
  900: [238, 237, 243],
};

const DARK_RED: Scale = {
  50: [88, 38, 34],
  100: [104, 44, 40],
  200: [125, 49, 44],
  300: [158, 66, 60],
  400: [214, 112, 106],
  500: [232, 140, 135],
  600: [238, 160, 155],
  700: [242, 180, 176],
  800: [246, 202, 199],
  900: [250, 222, 220],
};

const DARK_ORANGE: Scale = {
  50: [84, 58, 24],
  100: [96, 66, 26],
  200: [125, 90, 34],
  300: [150, 108, 42],
  400: [214, 160, 82],
  500: [226, 172, 96],
  600: [232, 190, 128],
  700: [240, 210, 160],
  800: [246, 226, 190],
  900: [250, 238, 215],
};

const DARK_AMBER: Scale = {
  50: [90, 67, 27],
  100: [104, 77, 30],
  200: [125, 94, 34],
  300: [135, 100, 38],
  400: [214, 168, 72],
  500: [226, 182, 90],
  600: [232, 196, 124],
  700: [240, 212, 150],
  800: [244, 224, 176],
  900: [248, 236, 204],
};

/** Resource-type badge colours with no Tailwind scale of their own: [background, foreground]. */
const DARK_BADGES: Record<string, [RGB, RGB]> = {
  indigo: [
    [48, 50, 92],
    [200, 205, 250],
  ],
  teal: [
    [31, 66, 66],
    [170, 226, 220],
  ],
  violet: [
    [62, 46, 98],
    [218, 200, 250],
  ],
};

function scaleVariables(
  name: string,
  scale: Scale,
  into: Record<string, string>,
) {
  for (const step of STEPS)
    into[`--ib-${name}-${step}`] = toChannels(scale[step]);
}

/** The accent ramp is exposed as Tailwind's `blue` scale, which is what the components use. */
function accentScale(mode: ThemeMode, accent: RGB): Scale {
  if (mode === "light") {
    // Readable on white and on the tinted 50-100 backgrounds (selected rows, hover states).
    const strong = ensureContrast(accent, mix(WHITE, accent, 0.16), 4.5, BLACK);
    const graphic = ensureContrast(accent, WHITE, 3, BLACK);
    return {
      50: mix(WHITE, accent, 0.08),
      100: mix(WHITE, accent, 0.16),
      200: mix(WHITE, accent, 0.3),
      300: mix(WHITE, accent, 0.5),
      400: mix(WHITE, accent, 0.72),
      500: graphic,
      600: strong,
      700: mix(strong, BLACK, 0.18),
      800: mix(strong, BLACK, 0.36),
      900: mix(strong, BLACK, 0.5),
    };
  }
  // Accent used as text/icons on dark surfaces: lighten until it is readable on the base surface
  // and on every tinted 50-200 background (which can be lighter or darker than the base).
  const tints = [0.16, 0.24, 0.34].map((amount) =>
    mix(DARK_SURFACE, accent, amount),
  );
  const light = [DARK_SURFACE, ...tints].reduce(
    (color, background) => ensureContrast(color, background, 4.5, WHITE),
    accent,
  );
  return {
    50: mix(DARK_SURFACE, accent, 0.16),
    100: mix(DARK_SURFACE, accent, 0.24),
    200: mix(DARK_SURFACE, accent, 0.34),
    300: light,
    400: light,
    500: light,
    600: light,
    700: mix(light, WHITE, 0.2),
    800: mix(light, WHITE, 0.45),
    900: mix(light, WHITE, 0.65),
  };
}

export interface AccentColors {
  /** Fill for buttons and other filled accent surfaces. */
  fill: RGB;
  fillHover: RGB;
  /** Readable text colour for use on `fill` and `fillHover`. */
  text: RGB;
}

/**
 * Resolve the filled-accent colours. The fill is nudged until it has 3:1 against the page surface
 * so a very pale (light mode) or very dark (dark mode) accent still reads as a control, and the
 * label colour is picked from the final fill so it always passes WCAG AA.
 */
export function resolveAccent(
  mode: ThemeMode,
  accentInput?: string | null,
): AccentColors {
  const accent = parseColor(accentInput) ?? parseColor(DEFAULT_ACCENT)!;
  const fill =
    mode === "dark"
      ? ensureContrast(accent, DARK_SURFACE, 3, WHITE)
      : ensureContrast(accent, WHITE, 3, BLACK);
  const text = readableTextOn(fill);
  // Hover moves away from the label colour's opposite so contrast with the label only improves.
  const fillHover =
    text === WHITE ? mix(fill, BLACK, 0.15) : mix(fill, WHITE, 0.2);
  return { fill, fillHover, text };
}

export function isCustomAccent(accent?: string | null) {
  const parsed = parseColor(accent);
  return Boolean(
    parsed && toChannels(parsed) !== toChannels(parseColor(DEFAULT_ACCENT)!),
  );
}

/** Inline CSS variables for a theme. Empty for the default light theme. */
export function createThemeVariables(
  mode: ThemeMode,
  accentInput?: string | null,
): Record<string, string> {
  const variables: Record<string, string> = {};
  const custom = isCustomAccent(accentInput);
  if (mode === "light" && !custom) return variables;

  const accent = parseColor(accentInput) ?? parseColor(DEFAULT_ACCENT)!;
  if (mode === "dark") {
    variables["--ib-white"] = toChannels(DARK_SURFACE);
    // Image viewer canvas: the Theseus "viewer" tone, a touch deeper than the page surface.
    variables["--ib-viewer"] = "17 16 20";
    variables["--ib-skeleton-highlight"] = "68 67 76";
    for (const [name, [background, foreground]] of Object.entries(
      DARK_BADGES,
    )) {
      variables[`--ib-${name}-bg`] = toChannels(background);
      variables[`--ib-${name}-fg`] = toChannels(foreground);
    }
    scaleVariables("gray", DARK_NEUTRAL, variables);
    scaleVariables("slate", DARK_NEUTRAL, variables);
    scaleVariables("red", DARK_RED, variables);
    scaleVariables("orange", DARK_ORANGE, variables);
    scaleVariables("amber", DARK_AMBER, variables);
  }
  scaleVariables("blue", accentScale(mode, accent), variables);
  const { fill, fillHover, text } = resolveAccent(mode, accentInput);
  variables["--ib-accent"] = toChannels(fill);
  variables["--ib-accent-hover"] = toChannels(fillHover);
  variables["--ib-accent-text"] = toChannels(text);
  return variables;
}

/** Props to spread on a themed root (and on elements portalled out of one). */
export function createThemeAttributes(
  mode: ThemeMode,
  accentInput?: string | null,
) {
  const style: Record<string, string> = createThemeVariables(mode, accentInput);
  if (mode === "dark") {
    style.colorScheme = "dark";
    // Hosts usually inherit a dark-on-light text colour; take the readable neutral instead.
    style.color = `rgb(${DARK_NEUTRAL[900].join(" ")})`;
  }
  return {
    "data-ib-theme": mode,
    style: style as CSSProperties,
  };
}

export function resolveThemeMode(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeMode {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
