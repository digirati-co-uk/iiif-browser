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
        icon: "add",
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

export const EditExistingIIIFImage = () => {
  const initialMarkdown = `<img
  src="https://dg-view.nls.uk/iiif/2/7440%2F74408454.5/250,300,1200,900/625,/90/default.jpg"
  alt="An existing cropped IIIF image"
/>
`;
  const [markdown, setMarkdown] = useState(initialMarkdown);

  return (
    <>
      <p>
        Select the image, then use its settings button to edit the IIIF request.
      </p>
      <MDXEditor
        markdown={initialMarkdown}
        onChange={setMarkdown}
        plugins={[
          iiifBrowserPlugin({ image: { resizeMultiplier: 2 } }),
          toolbarPlugin({
            toolbarContents: () => <InsertIIIFBrowser />,
          }),
        ]}
      />
      <pre data-testid="markdown-output">{markdown}</pre>
    </>
  );
};
