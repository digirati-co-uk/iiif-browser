# TipTap integration

The optional `iiif-browser/tiptap` entry point provides two TipTap 3 React node extensions. It does not import MDXEditor. The main browser entry point does not import either editor.

```sh
pnpm add iiif-browser @tiptap/core @tiptap/react @tiptap/pm @tiptap/starter-kit
```

```tsx
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  IIIFImage, IIIFSnippet, InsertIIIFImage, InsertIIIFSnippet,
} from 'iiif-browser/tiptap';
import 'iiif-browser/editor-plugins.css';

export function ArticleEditor() {
  const editor = useEditor({
    extensions: [StarterKit, IIIFImage, IIIFSnippet],
    content: '<p>Write an article…</p>',
  });
  return <>
    <InsertIIIFImage editor={editor} />
    <InsertIIIFSnippet editor={editor} />
    <EditorContent editor={editor} />
  </>;
}
```

- `IIIFImage.configure({ browserProps, image })` reuses the MDX Image API options: crop selection, width/height, rotation, quality, format, alternative text and service limits. Editable images offer settings and drag resizing. `image.resizeMultiplier` defaults to 2; use `false` to keep the image request unchanged when resizing its display.
- `IIIFSnippet.configure({ browserProps, defaultSize: { width: 640, height: 420 }, collectionNavigation: 'breadcrumbs' })` inserts interactive Collections, Manifests and Canvases. Resize dimensions persist in the node. Read-only viewers retain navigation and information controls but cannot resize.
- `editor.commands.insertIIIFImage({ src, alt, width, height })` and `editor.commands.insertIIIFSnippet({ resourceType: 'Canvas', manifestId, canvasId })` insert programmatically. `openIIIFImage()` and `openIIIFSnippet()` open the corresponding browser.
- The insertion buttons include their dialog. For custom toolbar buttons, mount `IIIFImageDialog` / `IIIFSnippetDialog` once alongside `EditorContent` and call the open commands. Image drops require the image dialog to be mounted.
- Save `editor.getJSON()` or `editor.getHTML()`. HTML carries `data-iiif-image` / `data-iiif-snippet` markers and the node attributes for reimport. Snippet HTML includes a source link as a static fallback; load it into an editor with `editable: false` for the interactive view.
- `editor.setEditable(false)` disables insertion, editing, drops and resize controls. Undo/redo uses TipTap's history extension (included in StarterKit).

## IIIF drag and drop

Both MDXEditor plugins and the TipTap extensions accept the `text/plain` JSON Annotation payload in [IIIF Cookbook recipe 0599](https://iiif.io/api/cookbook/recipe/0599-drag-and-drop/). Manifest and Collection targets are accepted; Canvas targets require a Manifest in `partOf`.

Snippet drops insert viewers at the drop location, retaining Canvas/Manifest identity. Image drops open the target in the image browser so the user can select a painting and its Image API options. If both TipTap extensions are installed, snippet drops take precedence. In MDXEditor, list `iiifSnippetPlugin()` before `iiifBrowserPlugin()` to prefer snippets when both are enabled.

Ordinary text, files, malformed JSON, non-HTTP(S) resources and unsupported Content State shapes are left to the editor's normal drop handlers. Region selectors, encoded Content State URLs and external Content State documents are not handled by this recipe integration.

The MDXEditor integrations additionally use the optional `lexical` peer matching MDXEditor's version (`^0.35.0` with MDXEditor 4). Install it alongside `@mdxeditor/editor` when using those entry points.

See **Integrations / TipTap** and the **Content State Drop** / **Read Only** MDXEditor stories in Storybook. The implementation follows TipTap's [custom node extension](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new) and [React node view](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react) APIs.

## Image layout and default size

New image selections use the editor's available content width as the initial Image API request width. If it cannot be measured, `IIIFImage.configure({ image: { defaultWidth: 640 } })` sets the fallback (640px by default). The same `image.defaultWidth` option is available to `iiifBrowserPlugin` in MDXEditor. Explicit `image.width` / `image.height` take precedence. Initial sizes respect service limits; level-0 services use a declared size, or full size when that is their only supported choice.

TipTap images keep their natural aspect ratio while resizing by default. In **Edit IIIF image → Display layout**, clear **Keep image aspect ratio** to resize both dimensions, then choose **Contain** (whole image, with spare space) or **Cover** (fill the frame, cropping the edges). These choices persist as `lockAspectRatio` and `objectFit` in JSON and HTML. **Edit IIIF snippet** opens the resource picker to replace a snippet while retaining its dimensions and collection navigation settings.

## Virtual collections

Register `IIIFVirtualCollection` and mount `InsertIIIFVirtualCollection` from
`iiif-browser/tiptap`:

```tsx
const editor = useEditor({
  extensions: [StarterKit, IIIFVirtualCollection.configure({ browserProps })],
});

<InsertIIIFVirtualCollection editor={editor} />
<EditorContent editor={editor} />
```

The toolbar inserts an empty collection. Edit its title and use **Add collection
or manifest** to select resources with the IIIF Browser. The existing collection
snippet displays the items, including navigation into child collections and
manifests. Title, resource references, and dimensions persist in editor JSON and
HTML; edits support undo/redo. Editing controls disappear in read-only mode.
You can also call `editor.commands.insertIIIFVirtualCollection()`.
No collection is created on a remote server.
