import container from "@tailwindcss/container-queries";
import defaultColors from "tailwindcss/colors.js";

/**
 * Theme-able colour scales. Each shade reads `--ib-<scale>-<shade>` (space separated channels) and
 * falls back to Tailwind's own value, so nothing changes until the dark theme or a custom accent
 * sets the variables. See src/theme/theme.ts.
 *
 * `blue` is the accent ramp and `white` is the base surface. `black` and the other colours are left
 * alone so highlights and text laid over imagery keep their literal colours.
 */
function hexToChannels(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)).join(" ");
}

function themeable(name) {
  return Object.fromEntries(
    Object.entries(defaultColors[name]).map(([shade, hex]) => [
      shade,
      `rgb(var(--ib-${name}-${shade}, ${hexToChannels(hex)}) / <alpha-value>)`,
    ]),
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  important: ".iiif-browser",
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "rgb(var(--ib-white, 255 255 255) / <alpha-value>)",
        gray: themeable("gray"),
        slate: themeable("slate"),
        blue: themeable("blue"),
        red: themeable("red"),
        orange: themeable("orange"),
        amber: themeable("amber"),
        // Filled accent surfaces (buttons) and the label colour that is readable on them.
        accent: {
          DEFAULT: "rgb(var(--ib-accent, 37 99 235) / <alpha-value>)",
          hover: "rgb(var(--ib-accent-hover, 29 78 216) / <alpha-value>)",
          text: "rgb(var(--ib-accent-text, 255 255 255) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [container],
};
