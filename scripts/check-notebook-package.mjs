// Run after `pnpm build`: catches duplicated React contexts across package entries.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const collabRequire = createRequire(require.resolve("prosemirror-collab"));
const tiptapRequire = createRequire(require.resolve("@tiptap/pm/state"));
assert.equal(
  collabRequire.resolve("prosemirror-state"),
  tiptapRequire.resolve("prosemirror-state"),
);

const { getNotebookSchema, applyNotebookSteps } = await import(
  "iiif-browser/notebook/document"
);
const schema = getNotebookSchema();
assert.ok(schema.nodes.notebookResourceBlock);
const content = schema.topNodeType.createAndFill().toJSON();
assert.equal(
  applyNotebookSteps(
    { schemaVersion: 1, version: 0, content },
    {
      version: 0,
      steps: [
        {
          stepType: "replace",
          from: 1,
          to: 1,
          slice: { content: [{ type: "text", text: "Worker-safe codec" }] },
        },
      ],
    },
  ).version,
  1,
);

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

function inspect(file, forbidden, visited = new Set()) {
  if (visited.has(file)) return;
  visited.add(file);
  for (const match of readFileSync(file, "utf8").matchAll(
    /(?:from\s*|import\s*)["']([^"']+)["']/g,
  )) {
    const id = match[1];
    assert.ok(!forbidden.test(id), `Unexpected dependency of ${file}: ${id}`);
    if (id.startsWith(".") && id.endsWith(".js"))
      inspect(resolve(dirname(file), id), forbidden, visited);
  }
}
const directory = dirname(fileURLToPath(import.meta.url));
inspect(resolve(directory, "../dist/index.js"), /^@(?:tiptap|mdxeditor)\//);
inspect(
  resolve(directory, "../dist/notebook-document.js"),
  /^(?:react(?:-dom)?(?:\/|$)|@tiptap\/react(?:\/|$)|@mdxeditor\/)|\.css$/,
);
console.log(
  "Notebook package contexts, headless codec and optional editor boundaries passed.",
);
