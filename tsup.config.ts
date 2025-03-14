import cssPlugin from "esbuild-plugin-react18-css";
import { type Options, defineConfig } from "tsup";

export default defineConfig((ctx) => {
  return {
    dts: true,

    entry: {
      index: "./src/v2/bundle.ts",
      v1: "./src/index.ts",
    },

    target: ["es2020"],
    format: ["esm", "cjs", "iife"],
    esbuildPlugins: [cssPlugin()],
    globalName: "IIIFBrowser",
    platform: "browser",
    minify: false,
    external: [
      // -
      "@iiif/parser",
      "@iiif/helpers",
    ],
  };
});
