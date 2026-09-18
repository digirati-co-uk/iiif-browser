import cssPlugin from "esbuild-plugin-react18-css";
import postcssImport from "postcss-import";
import postcss from "rollup-plugin-postcss";
import { defineConfig } from "tsdown";

// Build together so browser plugins share the core browser's React contexts.
// Editor peers remain external and are only imported by their optional entries.
export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "./src/bundle.ts",
    "digital-collections": "./src/digital-collections/index.ts",
    notebook: "./src/notebook/index.ts",
    tiptap: "./src/tiptap/index.tsx",
    mdxeditor: "./src/mdxeditor/index.tsx",
    "mdxeditor-snippet": "./src/mdxeditor-snippet/index.ts",
  },
  target: ["es2020"],
  format: ["esm", "cjs"],
  esbuildPlugins: [cssPlugin()],
  platform: "browser",
  minify: false,
  external: [
    "@iiif/parser",
    "@iiif/helpers",
    "@mdxeditor/editor",
    "lexical",
    /^@tiptap\//,
  ],
  plugins: [postcss({ plugins: [postcssImport()], extract: "index.css" })],
});
