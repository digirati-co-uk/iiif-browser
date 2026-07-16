import {
  BoldItalicUnderlineToggles,
  headingsPlugin,
  MDXEditor,
  toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { useState } from "react";
import { InsertIIIFBrowser, iiifBrowserPlugin } from "./index";

export default { title: "Integrations/MDXEditor" };

const collection = "https://view.nls.uk/collections/top.json";

export const ImageApiImage = () => {
  const initialMarkdown =
    "# IIIF article\n\nPlace the cursor here and insert an image.\n";
  const [markdown, setMarkdown] = useState(initialMarkdown);

  return (
    <>
      <MDXEditor
        markdown={initialMarkdown}
        onChange={setMarkdown}
        plugins={[
          headingsPlugin(),
          iiifBrowserPlugin({
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
              navigation: {
                canSelectCollection: false,
                canSelectManifest: false,
                canSelectCanvas: true,
              },
            },
            image: { width: 1200 },
          }),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <BoldItalicUnderlineToggles />
                <InsertIIIFBrowser />
              </>
            ),
          }),
        ]}
      />
      <pre data-testid="markdown-output">{markdown}</pre>
    </>
  );
};

export const WithCanvasSnippet = () => (
  <MDXEditor
    markdown={"Select either insertion action in the IIIF Browser.\n"}
    plugins={[
      iiifBrowserPlugin({
        canvasSnippet: true,
        dialog: {
          title: "Choose an illustration",
          className: "iiif-browser-mdx-dialog",
        },
        browserProps: {
          ui: { buttonClassName: "bg-emerald-700 hover:bg-emerald-800" },
          navigation: { canSelectCollection: false, canSelectManifest: false },
        },
      }),
      toolbarPlugin({
        toolbarContents: () => (
          <InsertIIIFBrowser label="Choose IIIF content" />
        ),
      }),
    ]}
  />
);
