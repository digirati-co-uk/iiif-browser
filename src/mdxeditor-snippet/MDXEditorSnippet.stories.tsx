import { headingsPlugin, MDXEditor, toolbarPlugin } from "@mdxeditor/editor";
import {
  ContentStateDragSource,
  cookbookManifest,
} from "../editor/ContentStateDragSource";
import "@mdxeditor/editor/style.css";
import { useState } from "react";
import {
  InsertIIIFSnippet,
  InsertIIIFVirtualCollection,
  iiifSnippetPlugin,
  iiifVirtualCollectionPlugin,
} from "./index";

export default { title: "Integrations/MDXEditor IIIF snippets" };

const manifest = "https://view.nls.uk/manifest/7446/74464117/manifest.json";
const collection = "https://view.nls.uk/collections/7446/74466699.json";

export const SnippetEditor = () => {
  const initialMarkdown = `# The Forth Bridge in pictures

This selection from the National Library of Scotland documents the construction of the Forth Bridge between 1886 and 1887.

<IIIFSnippetProvider manifestId="${manifest}">
  <IIIFManifest width={640} height={420} manifestId="${manifest}" />
</IIIFSnippetProvider>

Resize the viewer to suit the article layout. Its dimensions are stored in the MDX, while the information control keeps the source metadata close at hand.`;
  const [markdown, setMarkdown] = useState(initialMarkdown);

  return (
    <>
      <MDXEditor
        markdown={initialMarkdown}
        onChange={setMarkdown}
        plugins={[
          headingsPlugin(),
          iiifSnippetPlugin({
            browserProps: {
              history: {
                initialHistory: [
                  {
                    url: manifest,
                    resource: manifest,
                    route: `/loading?id=${manifest}`,
                  },
                ],
                restoreFromLocalStorage: false,
                saveToLocalStorage: false,
              },
            },
          }),
          toolbarPlugin({
            toolbarContents: () => <InsertIIIFSnippet />,
          }),
        ]}
      />
      <MarkdownPreview markdown={markdown} />
    </>
  );
};

export const CollectionSnippet = () => {
  const initialMarkdown = `## Scottish bridge collections

Browse the digitised albums and engineering records in this collection.

<IIIFSnippetProvider collectionId="${collection}">
  <IIIFCollection width={720} height={460} collectionId="${collection}" />
</IIIFSnippetProvider>

Choose an album from the collection grid, then explore its canvases in the deep-zoom viewer.`;
  const [markdown, setMarkdown] = useState(initialMarkdown);

  return (
    <>
      <MDXEditor
        markdown={initialMarkdown}
        onChange={setMarkdown}
        plugins={[
          headingsPlugin(),
          iiifSnippetPlugin(),
          toolbarPlugin({
            toolbarContents: () => <InsertIIIFSnippet />,
          }),
        ]}
      />
      <MarkdownPreview markdown={markdown} />
    </>
  );
};

export const CollectionButtonNavigation = () => (
  <MDXEditor
    markdown={`## Collection button navigation

This variant keeps the return action over the Manifest viewer instead of in the caption.

<IIIFSnippetProvider collectionId="${collection}">
  <IIIFCollection navigation="button" width={720} height={460} collectionId="${collection}" />
</IIIFSnippetProvider>`}
    plugins={[
      headingsPlugin(),
      iiifSnippetPlugin({
        icon: "stack",
        collectionNavigation: "button",
      }),
      toolbarPlugin({
        toolbarContents: () => <InsertIIIFSnippet />,
      }),
    ]}
  />
);

export const InsertSnippet = () => (
  <MDXEditor
    markdown="Choose a Manifest, Collection, or Canvas from the toolbar."
    plugins={[
      iiifSnippetPlugin({
        browserProps: {
          history: {
            initialHistory: [
              {
                url: collection,
                resource: collection,
                route: `/loading?id=${collection}`,
              },
            ],
            restoreFromLocalStorage: false,
            saveToLocalStorage: false,
          },
        },
      }),
      toolbarPlugin({
        toolbarContents: () => <InsertIIIFSnippet />,
      }),
    ]}
  />
);

function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <section
      style={{
        marginTop: "1rem",
        overflow: "hidden",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        background: "#fff",
      }}
    >
      <h3
        style={{
          margin: 0,
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          font: "600 0.875rem/1.4 system-ui, sans-serif",
        }}
      >
        Markdown output
      </h3>
      <pre
        data-testid="markdown-output"
        style={{
          maxHeight: "20rem",
          margin: 0,
          padding: "1rem",
          overflow: "auto",
          background: "#f8fafc",
          fontSize: "0.75rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {markdown}
      </pre>
    </section>
  );
}

export const ContentStateDrop = () => {
  const [markdown, setMarkdown] = useState("Drop a cookbook resource here.\n");
  const [readOnly, setReadOnly] = useState(false);
  return (
    <>
      <ContentStateDragSource />
      <label>
        <input
          type="checkbox"
          checked={readOnly}
          onChange={(event) => setReadOnly(event.target.checked)}
        />{" "}
        Read only
      </label>
      <MDXEditor
        markdown="Drop a cookbook resource here.\n"
        readOnly={readOnly}
        onChange={setMarkdown}
        plugins={[iiifSnippetPlugin()]}
      />
      <pre data-testid="markdown-output">{markdown}</pre>
    </>
  );
};

export const ReadOnly = () => (
  <MDXEditor
    readOnly
    markdown={`<IIIFSnippetProvider manifestId="${cookbookManifest}"><IIIFManifest manifestId="${cookbookManifest}" /></IIIFSnippetProvider>`}
    plugins={[iiifSnippetPlugin()]}
  />
);

export const DropCanvas = {
  render: ContentStateDrop,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const { expect, fireEvent, userEvent, waitFor, within } = await import(
      "@storybook/test"
    );
    const { contentStatePayload } = await import(
      "../editor/ContentStateDragSource"
    );
    const canvas = within(canvasElement);
    const editor = canvasElement.querySelector('[contenteditable="true"]')!;
    await userEvent.click(editor);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", contentStatePayload(true));
    const bounds = editor.querySelector("p")!.getBoundingClientRect();
    fireEvent(
      editor,
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: bounds.left + 20,
        clientY: bounds.top + bounds.height / 2,
      }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("markdown-output")).toHaveTextContent(
        "IIIFCanvas",
      ),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "Read only" }));
    await waitFor(() =>
      expect(
        canvasElement.querySelector(".iiif-snippet[data-resizable]"),
      ).toBeNull(),
    );
  },
};

export const VirtualCollection = () => {
  const [markdown, setMarkdown] = useState(
    "Create a collection, give it a title, and add IIIF resources.",
  );
  const [readOnly, setReadOnly] = useState(false);
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={readOnly}
          onChange={(event) => setReadOnly(event.target.checked)}
        />{" "}
        Read only
      </label>
      <MDXEditor
        markdown={markdown}
        onChange={setMarkdown}
        readOnly={readOnly}
        plugins={[
          iiifVirtualCollectionPlugin(),
          toolbarPlugin({
            toolbarContents: () => <InsertIIIFVirtualCollection />,
          }),
        ]}
      />
      <MarkdownPreview markdown={markdown} />
    </>
  );
};
