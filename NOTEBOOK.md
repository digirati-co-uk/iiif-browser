# Project notebooks

`iiif-browser/notebook` is an optional Tiptap 3 companion for embedded editors and IIIF Browser instances. Standalone examples are in **Storybook → Notebook → Standalone**. The example in **Integrations → Notebook → Manifest Editor** is a working external application: importing a notebook image creates a Canvas in its draft Manifest and completes that image’s checklist item.

```sh
pnpm add iiif-browser @tiptap/core @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-list
```

```tsx
import { useMemo, useState } from 'react';
import { IIIFBrowser } from 'iiif-browser';
import {
  IIIFNotebook, createNotebook, notebookPlugin,
  type NotebookAction,
} from 'iiif-browser/notebook';
import 'iiif-browser/dist/index.css';
import 'iiif-browser/editor-plugins.css';

export function ManifestEditor({ projectId }: { projectId: string }) {
  const [notebook] = useState(() => createNotebook({
    name: 'manifest-editor',
    // Scope this to the signed-in account/workspace in your application.
    storageKey: 'my-app:workspace-123:notes',
  }));
  const actions = useMemo<NotebookAction[]>(() => [{
    id: 'import-image',
    label: 'Add to manifest',
    types: ['ImageService', 'Image'],
    disabled: ctx => ctx.readOnly || ctx.checked,
    async run(ctx) {
      await importImageIntoYourManifest(ctx.resource);
      // Call only after the host operation succeeds. This targets the source's
      // task even if the user moved the caret while the import was running.
      ctx.setChecked(true);
    },
  }], []);
  const plugins = useMemo(() => [notebookPlugin({
    notebook, projectId, actions,
  })], [notebook, projectId, actions]);

  return <>
    <IIIFNotebook notebook={notebook} projectId={projectId} actions={actions} />
    <div style={{ height: 600 }}><IIIFBrowser plugins={plugins} /></div>
  </>;
}
```

`importImageIntoYourManifest` above is the host application's operation. The Storybook demo supplies a concrete implementation and displays the resulting draft JSON.

## Sharing and project context

- Pass the same `NotebookStore` to any number of notebook editors and browser plugins. Updates, saves and the active note are shared immediately in the same page.
- `getNotebook()` provides a global notebook; `getNotebook('name')` provides a named one. The `notebook` prop accepts either the store or its name. Named stores are created on first use and use local storage.
- `projectId` tags new notes and filters the editor, homepage cards and browser search to that project. Each project remembers its last opened note. No `projectId` shows personal, untagged notes. Existing notes keep their project when the surrounding application changes context.
- Clicking a resource opens an animated IIIF Browser modal at that resource. Hovering shows its preview; clicking the preview image (or title when no image is available) opens the same browser. `browserProps` accepts the complete `IIIFBrowserProps`, including `output`, `ui`, `navigation`, `history`, `search`, and `vault`. Defaults are Copy to clipboard and Open in Theseus. `onOpenResource(resource)` replaces the modal completely, letting a host swap panes or control its own browser. `ctx.open()` follows the same callback.
- `notebookPlugin({ onOpenNote(id) { ... } })` delegates note opening to your host sidebar. The default navigates to `iiif://notes` inside the browser. Memoize the plugin, especially when passing changing project context.
- Create a store per request when server rendering. The convenience registry is browser-only; `getNotebook()` does not share server request state.

## Writing, pasting and previews

The editor includes StarterKit formatting, headings, lists, undo/redo, nested checklists, and one **Insert IIIF link** action. Its browser inserts labelled Collection, Manifest, Canvas or Image service links; selecting a Canvas region offers **Insert crop**, preserving a Content State. Cropping a standalone Image service inserts its cropped Image API URL. Other choices live in the browser’s More actions menu. Existing image, snippet and virtual collection documents remain readable and editable. `browserProps` configures the link picker and resource browser (the picker supplies its own insertion outputs). `extensions` adds other Tiptap extensions; avoid duplicating the supplied ones.

Paste one link, a list, links within text, or checklist lines such as:

```text
[] https://example.org/iiif/image/info.json
- [ ] https://example.org/manifest.json
- [x] https://example.org/collection.json
```

Pasted links are inserted immediately, then fetch their resource. Only an initial paste whose link text is the URL receives the resource label; custom anchor text and later edits are preserved. Use **Edit label** in the popup to rename a link. Labels are stored separately from resource metadata and survive export and Text/Rich switching. Long inline labels truncate on a single line. Saved links defer loading until their first hover, focus or preview request; resolved metadata is cached in the note. Rich HTML paste retains formatting, and link marks become resource links. HTTP(S) URLs without credentials are accepted; ordinary pages stay links, and failed previews keep their source and offer retry. A preview times out after 15 seconds.

Image API image URLs automatically load their original `info.json`, preserving the crop, rotation and query parameters. Maximum-size requests start at a service-supported size around 640 pixels wide. The popup and rich image both offer an **Image size** selector using the service’s capabilities, plus a link to `info.json`. The existing **Edit IIIF image** dialog provides custom width, format, quality and rotation controls. Static image files remain ordinary images.

Collection previews show up to six square thumbnails in a three-column grid. Each tile opens its own Manifest (or child Collection); the title and remaining-count link open the collection. Missing thumbnails are resolved only for those six entries, and unavailable entries keep a labelled fallback.

Detection covers Presentation 2/3 Manifests and Collections, Image API `info.json`, Image API image requests, static image links, raw/encoded/remote Content State annotations, resource references and arrays, and viewer URLs containing `iiif-content`. All targets and the original Content State remain in the note. Canvas targets require a parent Manifest; `xywh` regions are preserved for host navigation and image previews. The browser does not implement every possible Content State selector; retain the original payload when using those in host actions.

Digital collection pages use **the same** `getIIIFResourceFromDigitalCollection` adapters as the browser, including Leeds, CONTENTdm, Internet Archive, Library of Congress, BHL, Smithsonian and Yale. `browserProps.history.requestInitOptions`, `beforeFetchUrl`, and preprocessing callbacks also apply to notebook detection. CORS and authentication requirements are the same as fetching these resources in the host application. Supply `resolveResource(source, signal)` for a proxy, custom catalogue, or application cache.

Hover a resource, or use its **⋯** button, for a preview with a clickable source URL and developer actions. **View → Text / Rich** switches the same resource between a compact link and the existing editable image/viewer plugins. Source metadata, checklist membership and widget settings are retained. Content State crops resolve the parent Manifest and map Canvas coordinates to image coordinates. Their rich view displays the actual crop with dimensions; clicking it opens the browser at that region. Original selectors and multi-target payloads remain in the note. Developer actions appear inside the link highlight by default; `inlineActions={false}` limits them to the preview.

## Layout and sidebar

The standalone notebook has no outer header. The sidebar contains New note (+), an options menu with JSON export, and search with highlighted matches and a clear button. Drag the divider, or focus it and use the arrow/Home/End keys, to resize between 160 and 400px (also capped at 45% of the workspace). The sidebar toggle preserves its width.

`height` defaults to 600px; `height="100%"` fills a parent with a defined height. `maxHeight`, `defaultSidebarWidth`, and `defaultSidebarCollapsed` control embedding. Notes and the sidebar scroll independently. Override `--notebook-scrollbar` on the notebook to customize the subtle scrollbar color. The toolbar includes left/center/right alignment, and Markdown headings, lists, quotes and code have explicit styles.

`renderNoteActions({ note, notebook, readOnly })` adds quick actions below each sidebar card. For example, a duplicate action can create a note and copy its `content` with `updateNote`. Deletion uses native browser confirmation and offers undo.

## Developer actions and custom UI

```tsx
<IIIFNotebook
  notebook={notebook}
  projectId={projectId}
  actions={actions}
  renderActions={ctx => ctx.isTask && (
    <button disabled={ctx.readOnly} onClick={() => ctx.setChecked(!ctx.checked)}>
      {ctx.checked ? 'Reopen task' : 'Mark reviewed'}
    </button>
  )}
  wrapResource={(content, ctx) => (
    <span className={ctx.checked ? 'reviewed' : 'source'}>{content}</span>
  )}
/>
```

Each action has `id`, `label`, optional resource `types`, `isVisible(ctx)`, `disabled(ctx)`, and an async-capable `run(ctx)`. The context contains:

| Field | Purpose |
| --- | --- |
| `resource` | Resolved identity, type, label, source URL, thumbnail/image, Canvas parent, Content State and targets |
| `note`, `projectId`, `notebook` | Current source note, project and store |
| `editor` | The Tiptap editor for custom editing operations |
| `location` | `tooltip` or `inline` |
| `readOnly`, `isTask`, `checked` | Current editor/task state |
| `setChecked(boolean = true)` | Complete/reopen the source’s task; returns false if no task, deleted, unmounted or read-only |
| `open()` | Open the resource through notebook navigation |

Actions show a busy state and report rejected promises. Completion is explicit: returning successfully does not automatically tick a task. Disable host mutations when `ctx.readOnly`; the notebook's own editing and completion controls already enforce read-only mode. Custom UI owns its own asynchronous status and error handling.

## Browser integration

The plugin registers **iiif://notes** as a normal browser page. The address bar, Back/Forward navigation, and restored browser history work as they do for other pages. Opening a resource from the notebook navigates the same browser; returning to Notes restores its last note, selection and scroll position.

The homepage starts with **From your notes**, showing distinct resources from the current project's notes and a **View notes** link. Thumbnail cards match recent Manifests; set `notebookPlugin({ showThumbnails: false })` for compact rows. Resources already in notes are omitted from recent sections and duplicate search results, with notebook links preferred. A notebook icon appears in the toolbar by default; set `showToolbarButton: false` to hide it while keeping the page and homepage link. `onOpenNote(noteId)` can still delegate note opening to a host application.

Notes and resources remain searchable in the existing omnibox alongside current-collection, history and configured external search results. Deleted notes and project changes update the index.

**Add to note** appends a labelled link to the project's last opened note, creating a note if needed. It saves selected resources, or the current Manifest/Collection/Canvas/Image Service. When the resource is already saved in the project, the button becomes **View in notes** and opens that note. Open another note first to change the destination. Canvas URLs pasted into the notebook use the browser's shared vault to recover their parent Manifest without fetching the Canvas identifier.

Note URLs include their identity (`iiif://notes?note=...`), so browser history restores the selected note. Standalone hosts can also control selection with `noteId` and `onNoteChange`.

Click **View all** or **From your notes** on the homepage to browse a local IIIF Collection of your notes (`iiif://notes?view=collection`). Each note is a child Collection containing its distinct Manifests and Collections; Canvas and Content State links contribute their parent Manifests, while images and Image services are excluded. These collections are added to the shared vault and use the browser's existing collection list/grid, pagination and navigation. **Edit note** returns to the editor. The homepage thumbnail preview stays limited to one row (compact mode shows at most six resources).

The **Notebook / Inside the browser / Workshop** story includes the full workshop note. **List on homepage** demonstrates the compact alternative to thumbnail cards; **Notes as collections** demonstrates the two collection levels, and **Add to note and search** checks saving and reopening a notebook resource.

## Tiptap link plugin

`IIIFLink` and `InsertIIIFLink` are exported from both `iiif-browser/tiptap` and `iiif-browser/notebook`. Install the extension with `StarterKit`, then render `<InsertIIIFLink editor={editor} browserProps={...} />`. It inserts ordinary labelled link marks in a plain editor, and native notebook resource nodes when `NotebookResourceLink` is installed. `editor.commands.insertIIIFLink(resource)` and `editor.commands.openIIIFLink()` provide programmatic access.

## Persistence and host storage

`createNotebook({ storageKey: false })` creates an in-memory notebook. Like browser history, it accepts `localStorageKey`, `restoreFromLocalStorage`, and `saveToLocalStorage`; both flags default to true. `storageKey` remains a shorthand, and `false` disables both. `initialNotes` seeds an empty store. `onChange(snapshot)` receives a serializable, versioned snapshot for host persistence; local storage remains the default. `NotebookNote.content` is Tiptap JSON, including widget attributes, resource metadata and checked state.

The active note, per-project search/sidebar state, and per-note selection/scroll survive component unmounts. Selection and scroll are saved when the editor unmounts or the page is hidden. Pass the same store when swapping panes, or recreate it with the same local storage key. `setWorkspaceView` and `setNoteView` are available for host control.

The store exposes `createNote`, `updateNote`, `deleteNote`, `openNote`, `appendResource` and `exportJSON`. `notesForProject`, `currentNote`, `noteResources`, and `searchNotebook` support sourcing information elsewhere in the application. The UI provides note search, deletion with undo, and JSON export. Storage failures are displayed; unreadable saved data is never overwritten with an empty notebook.

Local storage provides persistence and same-page store sharing. Cross-tab merging, multi-user collaboration, server conflict resolution and account lifecycle are host responsibilities. An external update to a note refreshes mounted editors; this is document replacement, not collaborative transaction merging. Keep `onChange` synchronous, or catch/report asynchronous host-save failures in your application.

For a custom Tiptap editor, combine `StarterKit` and `notebookExtensions(options)`, mount the existing insertion/dialog components, and wrap the editor in `NotebookEditorContext.Provider` with `{ notebook, note, ...options }`. `NotebookResourceLink`, `NotebookResourceBlock`, `NotebookPaste`, and `setNotebookResourceView` are also exported individually.

## Stories and verification

**Notebook → Standalone** contains Default (no actions), Blank Slate, Single Action, Multiple Actions, Custom Tags, Note Quick Actions, Read Only, Compact, Project Context, Search And Sidebar, Text And Rich, Formatting And Overflow, Existing Widgets, Content States, Paste Links, and Workshop (the supplied workshop Markdown and its labelled links). These render only the notebook; Project Context is the sole story with a project switcher. Story descriptions document customizations without adding host UI.

**Notebook → Browser integration** adds Link Picker, Controlled Browser, and Notebook In Modal. The modal example manually mounts `IIIFBrowser` in place of the notebook, then restores the notebook without opening a second overlay. `NotebookResourceBrowser`, `notebookResourceHistory` and `notebookBrowserOutputs` are exported for host use.

**Integrations → Notebook** keeps the external Manifest Editor and Import Failure examples, including shared browser search/cards, import-to-Canvas callbacks and task completion.

The live examples use [TU Delft Academic Heritage](https://heritage.tudelft.nl/iiif/collection.json) and its Bauernfeind prism Manifest, from the supplied [Theseus collection view](https://theseusviewer.org/?iiif-content=https://heritage.tudelft.nl/iiif//collection.json&collection=https://theseusviewer.org/collections.json). Automated core tests mock network responses; story previews and viewers fetch live images/resources.

Run `pnpm test --run`, `pnpm typecheck`, and `pnpm build`. After building,
`node scripts/check-notebook-package.mjs` checks that the published entries share
browser contexts and that the core entry does not import optional editor peers.
