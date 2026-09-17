# MDXEditor IIIF snippet plugin

This integration is separate from the Markdown/image plugin. It inserts MDX
components for Collections, Manifests, and Canvases while using the IIIF Browser
as the resource picker.

```tsx
import { MDXEditor, toolbarPlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "iiif-browser/mdx-plugins.css";
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

### Read-only rendering and drops

Standalone snippet components do not show resize controls by default. Set `resizable` explicitly to enable them outside an editor. MDXEditor previews enable resizing only while the editor is editable.

The plugin accepts Manifest and Canvas Content State drops from [IIIF Cookbook recipe 0599](https://iiif.io/api/cookbook/recipe/0599-drag-and-drop/). Canvas drops retain the parent Manifest. See [TIPTAP.md](./TIPTAP.md#iiif-drag-and-drop) for supported payloads and the optional Lexical peer.

## Virtual collections

Use the independent `iiifVirtualCollectionPlugin` and toolbar button from the
same `iiif-browser/mdxeditor-snippet` entry point:

```tsx
import {
  iiifVirtualCollectionPlugin,
  InsertIIIFVirtualCollection,
} from "iiif-browser/mdxeditor-snippet";

<MDXEditor
  markdown="Create a collection below."
  plugins={[
    iiifVirtualCollectionPlugin({ browserProps }),
    toolbarPlugin({ toolbarContents: () => <InsertIIIFVirtualCollection /> }),
  ]}
/>
```

The button inserts an empty `IIIFVirtualCollection`. Its inline editing controls
let you change the displayed title and add a collection or manifest through the
IIIF Browser. The collection snippet provides the preview and resource navigation.
The title, JSON-encoded `items` references, and dimensions are saved in MDX.
The plugin also accepts `defaultSize: { width, height }`.

For published MDX, `IIIFVirtualCollection` is exported from the same entry point
and renders without editing controls or a separate provider. Virtual collections
live in the document; no remote collection is created. Read-only editors hide the
title input and add button.
