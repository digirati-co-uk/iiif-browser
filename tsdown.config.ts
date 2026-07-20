import cssPlugin from "esbuild-plugin-react18-css";
import postcssImport from "postcss-import";
import postcss from "rollup-plugin-postcss";
import { defineConfig } from "tsdown";

const external = ["@iiif/parser", "@iiif/helpers", "@mdxeditor/editor"];
const styles = (extract: string) => [
  postcss({ plugins: [postcssImport()], extract }),
];

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: {
      index: "./src/bundle.ts",
      "digital-collections": "./src/digital-collections/index.ts",
    },
    target: ["es2020"],
    format: ["esm", "cjs"],
    esbuildPlugins: [cssPlugin()],
    platform: "browser",
    minify: false,
    external,
    plugins: styles("index.css"),
  },
  {
    clean: false,
    dts: true,
    entry: {
      mdxeditor: "./src/mdxeditor/index.tsx",
      "mdxeditor-snippet": "./src/mdxeditor-snippet/index.ts",
    },
    target: ["es2020"],
    format: ["esm", "cjs"],
    esbuildPlugins: [cssPlugin()],
    platform: "browser",
    minify: false,
    external,
    plugins: styles("mdx-plugins.css"),
  },
]);
