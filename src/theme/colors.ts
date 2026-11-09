/**
 * Small colour helpers used to derive an accessible theme from a single accent colour.
 * Channels are 0-255 and the WCAG 2 formulas are used for luminance and contrast.
 */

export type RGB = readonly [number, number, number];

const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

/**
 * Parse `#rgb`, `#rrggbb`, `rgb(r g b)`, `rgb(r, g, b)`, `r g b` or `r,g,b`.
 * Returns null when the value is not a colour so callers can fall back to the default accent.
 */
export function parseColor(input: string | null | undefined): RGB | null {
  if (!input) return null;
  const value = input.trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length === 3) {
      digits = digits
        .split("")
        .map((digit) => digit + digit)
        .join("");
    }
    return [
      Number.parseInt(digits.slice(0, 2), 16),
      Number.parseInt(digits.slice(2, 4), 16),
      Number.parseInt(digits.slice(4, 6), 16),
    ];
  }
  const channels =
    /^(?:rgb\()?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*\)?$/i.exec(value);
  if (channels) {
    const parsed = [channels[1], channels[2], channels[3]].map(Number);
    if (parsed.every((channel) => channel <= 255))
      return parsed as unknown as RGB;
  }
  return null;
}

/** Format as the space separated channels Tailwind expects for `rgb(var(--x) / <alpha-value>)`. */
export function toChannels(color: RGB): string {
  return `${clamp(color[0])} ${clamp(color[1])} ${clamp(color[2])}`;
}

export function toHex(color: RGB): string {
  return `#${color.map((channel) => clamp(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function luminance(color: RGB): number {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrastRatio(a: RGB, b: RGB): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Linear interpolation: 0 returns `from`, 1 returns `to`. */
export function mix(from: RGB, to: RGB, amount: number): RGB {
  return [
    clamp(from[0] + (to[0] - from[0]) * amount),
    clamp(from[1] + (to[1] - from[1]) * amount),
    clamp(from[2] + (to[2] - from[2]) * amount),
  ];
}

export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];

/**
 * Move `color` towards `target` until it has at least `minimum` contrast against `background`.
 * Returns the colour unchanged when it already passes, and the target colour when nothing passes.
 */
export function ensureContrast(
  color: RGB,
  background: RGB,
  minimum: number,
  target: RGB,
): RGB {
  if (contrastRatio(color, background) >= minimum) return color;
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(color, target, step / 100);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
}

/**
 * The most readable text colour for a filled background. White is preferred whenever it passes
 * WCAG AA for normal text so that typical brand colours keep the conventional white label.
 */
export function readableTextOn(background: RGB): RGB {
  if (contrastRatio(WHITE, background) >= 4.5) return WHITE;
  return contrastRatio(BLACK, background) > contrastRatio(WHITE, background)
    ? BLACK
    : WHITE;
}
