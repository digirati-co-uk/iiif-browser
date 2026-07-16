import { headingsPlugin, MDXEditor, toolbarPlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { useState } from "react";
import { InsertIIIFSnippet, iiifSnippetPlugin } from "./index";

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
