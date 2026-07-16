import cssPlugin from "esbuild-plugin-react18-css";
import postcssImport from "postcss-import";
import postcss from "rollup-plugin-postcss";
import { defineConfig } from "tsdown";

export default defineConfig((_ctx) => {
  return {
    dts: true,

    entry: {
      index: "./src/bundle.ts",
      "digital-collections": "./src/digital-collections/index.ts",
      mdxeditor: "./src/mdxeditor/index.tsx",
      "mdxeditor-snippet": "./src/mdxeditor-snippet/index.ts",
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
      "@mdxeditor/editor",
    ],
    plugins: [
      postcss({
        plugins: [postcssImport()],
        extract: "index.css",
      }),
    ],
  };
});
