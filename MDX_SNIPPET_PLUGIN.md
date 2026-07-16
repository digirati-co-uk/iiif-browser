# MDXEditor IIIF snippet plugin

This integration is separate from the Markdown/image plugin. It inserts MDX
components for Collections, Manifests, and Canvases while using the IIIF Browser
as the resource picker.

```tsx
import { MDXEditor, toolbarPlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "iiif-browser/dist/index.css";
import {
  InsertIIIFSnippet,
  iiifSnippetPlugin,
} from "iiif-browser/mdxeditor-snippet";

<MDXEditor
  markdown="Choose IIIF content"
  plugins={[
    iiifSnippetPlugin(),
    toolbarPlugin({
      toolbarContents: () => <InsertIIIFSnippet />,
    }),
  ]}
/>
```

The default output is one of:

```mdx
<IIIFSnippetProvider collectionId="https://example.org/collection">
  <IIIFCollection width={640} height={420} collectionId="https://example.org/collection" />
</IIIFSnippetProvider>

<IIIFSnippetProvider manifestId="https://example.org/manifest">
  <IIIFManifest width={640} height={420} manifestId="https://example.org/manifest" />
</IIIFSnippetProvider>

<IIIFSnippetProvider manifestId="https://example.org/manifest" canvasId="https://example.org/canvas/1">
  <IIIFCanvas width={640} height={420} manifestId="https://example.org/manifest" canvasId="https://example.org/canvas/1" />
</IIIFSnippetProvider>
```

Selecting a resource inserts it immediately. Resize the resulting viewer in
MDXEditor; its final `width` and `height` are written back to the MDX when the
pointer is released. The toolbar defaults to the IIIF add mark; set
`icon: "stack"` on `iiifSnippetPlugin` to use the image-stack icon instead.

`IIIFSnippetProvider` creates a `react-iiif-vault` provider and loads the
Collection or Manifest before rendering its child. Set `provider: false` when a
custom component handles loading itself. Components can be replaced per
resource type:

```tsx
iiifSnippetPlugin({
  provider: false,
  components: {
    Manifest: {
      name: "ArticleManifest",
      source: "./article-components",
      props: { theme: "paper" },
    },
    Canvas: {
      name: "ArticleCanvas",
      source: "./article-components",
    },
  },
  defaultSize: { width: 720, height: 480 },
});
```

Set a component or provider `source` to `false` when the MDX runtime supplies
it through its component map instead of an import. The exported default
components are resizable and include a compact Canvas Panel viewer, Manifest or
Collection information in an accessible popover, a caption, and previous/next
Canvas controls. Paging controls appear on hover or keyboard focus and remain
visible on touch devices.

Collections first render as a responsive grid of square Manifest thumbnails
with two-line labels. Selecting a Manifest opens its deep-zoom viewer in place;
the Collection breadcrumb at the bottom returns to the grid. Set
`collectionNavigation: "button"` on the plugin to insert an over-image back
button instead.
