import container from "@tailwindcss/container-queries";

/** @type {import('tailwindcss').Config} */
export default {
  // important: ".iiif-browser",
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [container],
};
