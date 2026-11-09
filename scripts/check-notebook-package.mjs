// Run after `pnpm build`: catches duplicated React contexts across package entries.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToString } = require("react-dom/server");
const { IIIFBrowser } = require("../dist/index.cjs");
const { createNotebook, notebookPlugin } = require("../dist/notebook.cjs");
const notebook = createNotebook({
  storageKey: false,
  initialNotes: [
    {
      id: "packaged-note",
      title: "Packaged notebook",
      projectId: "test",
      createdAt: "2026-09-18",
      updatedAt: "2026-09-18",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
  ],
});
const html = renderToString(
  React.createElement(IIIFBrowser, {
    plugins: [notebookPlugin({ notebook, projectId: "test" })],
  }),
);
assert.ok(html.includes("From your notes"));
assert.ok(html.includes("View notes"));

// Importing the core browser must not require either optional editor package.
const visited = new Set();
function inspect(file) {
  if (visited.has(file)) return;
  visited.add(file);
  for (const match of readFileSync(file, "utf8").matchAll(
    /(?:from\s*|import\s*)["']([^"']+)["']/g,
  )) {
    const id = match[1];
    assert.ok(
      !/^@(?:tiptap|mdxeditor)\//.test(id),
      `Editor peer imported by core: ${id}`,
    );
    if (id.startsWith(".") && id.endsWith(".js"))
      inspect(resolve(dirname(file), id));
  }
}
inspect(resolve(dirname(fileURLToPath(import.meta.url)), "../dist/index.js"));
console.log("Notebook package contexts and optional editor boundaries passed.");
