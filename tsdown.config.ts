import cssPlugin from "esbuild-plugin-react18-css";
import postcssImport from "postcss-import";
import postcss from "rollup-plugin-postcss";
import { type Options, defineConfig } from "tsdown";

export default defineConfig((ctx) => {
  return {
    dts: true,

    entry: {
      index: "./src/v2/bundle.ts",
      v1: "./src/index.ts",
    },
    target: ["es2020"],
    format: ["esm", "cjs"],
    esbuildPlugins: [cssPlugin()],
    platform: "browser",
    minify: false,
    external: [
      // -
      "@iiif/parser",
      "@iiif/helpers",
    ],
    plugins: [
      (postcss as any as typeof postcss.default)({
        plugins: [postcssImport()],
        extract: "index.css",
      }),
    ],
  };
});
