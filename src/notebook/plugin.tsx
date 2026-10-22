import { useCallback, useEffect, useId, useState, useMemo } from "react";
import { useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { IIIFBrowserPlugin } from "../browser/plugins";
import { BrowserToolbarButton } from "../browser/BrowserToolbarButton";
import { NotebookIcon } from "../icons/NotebookIcon";
import { PlusIcon } from "../icons/PlusIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";
import { CollectionItemList } from "../resources/CollectionItemList";
import {
  notebookCollection,
  loadNotebookCollection,
  noteUrl,
} from "./collections";
import {
  HomepageResourceRow,
  HomepageResourceCard,
  useContainerColumns,
} from "../routes/Homepage";
import { notebookSelection } from "./selection";
import { findCanvasParent } from "../utilities/find-canvas-parent";
import { NotebookResourceBrowser } from "./ResourceBrowser";
import {
  useCurrentRoute,
  useBrowserEmitter,
  useHistory,
  useIsPageLoading,
  useLocation,
  useOmnisearchStore,
  useResolve,
  useSearchParams,
  useSelectedItems,
} from "../context";
import type { SearchIndexItem } from "../stores/omnisearch-store";
import { IIIFNotebook, type IIIFNotebookProps } from "./Notebook";
import { registerNotebookBrowser } from "./navigation";
import {
  isNotebookUrl,
  noteResources,
  noteText,
  notebookResourceUrls,
  type NotebookResource,
} from "./resources";
import {
  currentNote,
  getNotebook,
  notesForProject,
  type NotebookStore,
  type NotebookNote,
} from "./store";

export interface NotebookPluginOptions extends IIIFNotebookProps {
  /** Show a Notes icon in the browser toolbar. Defaults to true. */
  showToolbarButton?: boolean;
  /** Show resource thumbnails on the homepage. Defaults to true; false uses rows. */
  showThumbnails?: boolean;
  /** Delegate note opening to the host instead of navigating to iiif://notes. */
  onOpenNote?(noteId: string): void;
}
type IntegrationProps = {
  options: NotebookPluginOptions;
  notebook: NotebookStore;
  preview: StoreApi<{ resource: NotebookResource | null }>;
};
/** Memoize per notebook/project. No Tiptap code is imported by the core browser. */
export function notebookPlugin(
  options: NotebookPluginOptions = {},
): IIIFBrowserPlugin {
  const notebook =
    typeof options.notebook === "string" || !options.notebook
      ? getNotebook(options.notebook)
      : options.notebook;
  const preview = createStore(() => ({
    resource: null as NotebookResource | null,
  }));
  const props = { options, notebook, preview };
  return {
    id: `notebook:${crypto.randomUUID()}`,
    header: <NotebookBridge {...props} />,
    homepage: <NotebookSources {...props} />,
    pages: { "/notes": <NotebookPage {...props} /> },
  };
}
function useNotebookNavigation({
  options,
  notebook,
  preview,
}: IntegrationProps) {
  const resolve = useResolve();
  const vault = useVault();
  const openNote = useCallback(
    (id?: string, collection = false) => {
      const noteId =
        id ?? currentNote(notebook.getState(), options.projectId)?.id;
      if (noteId) notebook.getState().openNote(noteId);
      if (options.onOpenNote && noteId && !collection)
        options.onOpenNote(noteId);
      else void resolve(noteUrl(noteId, collection));
    },
    [resolve, notebook, options],
  );
  const openResource = useCallback(
    (resource: NotebookResource) => {
      if (options.onOpenResource) return options.onOpenResource(resource);
      const target =
        resource.type === "ContentState" ? resource.targets?.[0] : resource;
      if (!target) return;
      if (target.type === "Image") {
        preview.setState({ resource: target });
        return;
      }
      const searchParams = new URLSearchParams();
      if (target.xywh) searchParams.set("xywh", target.xywh);
      const info = new URL(target.id);
      if (target.type === "ImageService")
        info.pathname = `${info.pathname.replace(/\/info.json$|\/$/g, "")}/info.json`;
      void resolve(
        target.type === "ImageService"
          ? (target.infoUrl ?? info.toString())
          : target.id,
        {
          parent: target.parent ?? findCanvasParent(target.id, vault),
          searchParams,
        },
      );
    },
    [resolve, options.onOpenResource, preview, vault],
  );
  return { openNote, openResource };
}
function NotebookPage(props: IntegrationProps) {
  const { openResource, openNote } = useNotebookNavigation(props);
  const vault = useVault();
  const [params] = useSearchParams();
  const history = useHistory();
  const state = useStore(props.notebook);
  const notes = notesForProject(state, props.options.projectId);
  const requestedId = params.get("note");
  const note =
    notes.find((note) => note.id === requestedId) ??
    currentNote(state, props.options.projectId);
  const collection = params.get("view") === "collection";
  useEffect(() => {
    if (!note) {
      if (collection && requestedId) history.replace("/notes?view=collection");
      return;
    }
    if (collection && !requestedId) return;
    props.notebook.getState().openNote(note.id);
    if (requestedId !== note.id)
      history.replace(
        noteUrl(note.id, collection).replace("iiif://notes", "/notes"),
      );
  }, [note?.id, requestedId, collection, history, props.notebook]);
  const browserProps = useMemo(
    () => ({ ...props.options.browserProps, vault }),
    [props.options.browserProps, vault],
  );
  if (collection)
    return (
      <NotebookCollection
        notes={notes}
        noteId={requestedId ?? undefined}
        onEdit={() => openNote(note?.id)}
      />
    );
  return (
    <IIIFNotebook
      {...props.options}
      notebook={props.notebook}
      noteId={note?.id}
      onNoteChange={openNote}
      browserProps={browserProps}
      height={props.options.height ?? "100%"}
      onOpenResource={openResource}
      renderNoteActions={(context) => (
        <>
          <button type="button" onClick={() => openNote(context.note.id, true)}>
            View as collection
          </button>
          {props.options.renderNoteActions?.(context)}
        </>
      )}
    />
  );
}
function NotebookCollection({
  notes,
  noteId,
  onEdit,
}: {
  notes: NotebookNote[];
  noteId?: string;
  onEdit(): void;
}) {
  const vault = useVault();
  const emitter = useBrowserEmitter();
  const id = noteUrl(noteId, true);
  // The underlying notes array is stable across selection and view updates.
  const content = JSON.stringify(notebookCollection(notes));
  useEffect(() => {
    const collection = JSON.parse(content);
    loadNotebookCollection(vault, collection);
    emitter.emit("collection.change", { id, type: "Collection" });
    return () => emitter.emit("collection.change", null);
  }, [vault, emitter, content, id]);
  return (
    <section className="h-full overflow-auto" aria-label="Note collection">
      <div className="px-5 pt-4 flex justify-end">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={onEdit}
        >
          {noteId ? "Edit note" : "View notes"}
        </button>
      </div>
      <CollectionItemList id={id} />
    </section>
  );
}
function NotebookSources(props: IntegrationProps) {
  const state = useStore(props.notebook);
  const { openNote, openResource } = useNotebookNavigation(props);
  const columns = useContainerColumns();
  const resolve = useResolve();
  const resources = new Map<string, NotebookResource>();
  const urls = new Set<string>();
  for (const note of notesForProject(state, props.options.projectId)) {
    for (const resource of noteResources(note.content)) {
      const aliases = notebookResourceUrls(resource);
      if (
        aliases.some((url) => urls.has(url)) ||
        resources.has(resource.source)
      )
        continue;
      aliases.forEach((url) => urls.add(url));
      resources.set(resource.source, resource);
    }
  }
  return (
    <section aria-label="From your notes">
      <div className="flex items-center gap-2 mb-3">
        <NotebookIcon className="text-lg shrink-0" />
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          <button
            type="button"
            className="hover:text-blue-600"
            onClick={() => resolve(noteUrl(undefined, true))}
          >
            From your notes
          </button>
        </h2>
        <button
          type="button"
          className="ml-auto text-sm text-blue-600 hover:underline"
          onClick={() => resolve(noteUrl(undefined, true))}
        >
          View all
        </button>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => openNote()}
        >
          View notes
        </button>
      </div>
      <div
        className={
          props.options.showThumbnails === false
            ? "flex flex-col gap-1"
            : "grid gap-1"
        }
        style={
          props.options.showThumbnails === false
            ? undefined
            : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
        }
      >
        {[...resources.values()]
          .slice(0, props.options.showThumbnails === false ? 6 : columns)
          .map((resource) => {
            const Card =
              props.options.showThumbnails === false
                ? HomepageResourceRow
                : HomepageResourceCard;
            return (
              <Card
                key={resource.source}
                url={resource.id}
                label={resource.label}
                type={resource.type}
                thumbnail={
                  resource.thumbnail ||
                  resource.image ||
                  resource.items?.[0]?.thumbnail
                }
                onOpen={() => openResource(resource)}
              />
            );
          })}
      </div>
      {!resources.size && (
        <p className="text-sm text-gray-400 px-2">
          Resources you save in your notes will appear here.
        </p>
      )}
    </section>
  );
}
function NotebookBridge(props: IntegrationProps) {
  const { options, notebook, preview } = props;
  const { openNote, openResource } = useNotebookNavigation(props);
  const state = useStore(notebook);
  const previewResource = useStore(preview, (value) => value.resource);
  const location = useLocation();
  const index = useOmnisearchStore();
  const route = useCurrentRoute();
  const loading = useIsPageLoading();
  const [params] = useSearchParams();
  const selected = useSelectedItems().filter((resource) =>
    isNotebookUrl(resource.id),
  );
  const vault = useVault();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setMessage(""), [location.key]);
  const key = useId();
  useEffect(
    () => registerNotebookBrowser(notebook, openResource, options.projectId),
    [notebook, openResource, options.projectId],
  );
  useEffect(() => {
    const items: SearchIndexItem[] = [];
    for (const note of notesForProject(state, options.projectId)) {
      items.push({
        id: `${key}:note:${note.id}`,
        type: "action",
        source: "custom",
        label: note.title || "Untitled note",
        keywords: [noteText(note.content), "notebook"],
        subLabel: "Notebook note",
        icon: <NotebookIcon className="text-2xl" />,
        actionLabel: "Open note",
        showWhenEmpty: true,
        action: () => openNote(note.id),
      });
      for (const resource of noteResources(note.content)) {
        items.push({
          id: `${key}:${note.id}:${resource.source}`,
          type: "action",
          source: "custom",
          label: `${resource.label} · ${note.title}`,
          resourceUrls: notebookResourceUrls(resource),
          showWhenEmpty: true,
          icon: <NotebookIcon className="text-2xl" />,
          keywords: [resource.id, resource.source, "notebook", resource.type],
          subLabel: `${resource.type} from your notebook`,
          actionLabel: "Open resource",
          action: () => openResource(resource),
        });
      }
    }
    index.getState().setSupplementalItems(key, items);
    return () => index.getState().setSupplementalItems(key, []);
  }, [state.notes, index, key, options.projectId, openNote, openResource]);
  const currentId = params.get("canvas") || params.get("id");
  const currentUrls = [
    currentId,
    params.get("id"),
    route.url,
    route.resource,
  ].filter(isNotebookUrl);
  const projectNotes = notesForProject(state, options.projectId);
  const activeNote = currentNote(state, options.projectId);
  const savedNote = [activeNote, ...projectNotes].find(
    (note) =>
      note &&
      noteResources(note.content).some((resource) =>
        notebookResourceUrls(resource).some((url) => currentUrls.includes(url)),
      ),
  );
  const save = async () => {
    if (saving || loading || options.readOnly) return;
    setSaving(true);
    setMessage("");
    try {
      const refs = selected.length
        ? selected
        : currentId
          ? [
              {
                id: currentId,
                type: params.get("canvas")
                  ? "Canvas"
                  : route.metadata?.type || "Manifest",
                parent: params.get("canvas")
                  ? { id: params.get("id")!, type: "Manifest" }
                  : undefined,
              },
            ]
          : [];
      let noteId = currentNote(notebook.getState(), options.projectId)?.id;
      for (const ref of refs) {
        const resource = await notebookSelection(
          { ...ref, parent: ref.parent ?? findCanvasParent(ref.id, vault) },
          vault,
        );
        noteId = notebook
          .getState()
          .appendResource(resource, { noteId, projectId: options.projectId });
      }
      const title =
        notebook.getState().notes.find((note) => note.id === noteId)?.title ||
        "Untitled note";
      setMessage(`Added to ${title}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add this resource.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="iiif-notebook__browser-controls">
      {options.showToolbarButton !== false && (
        <BrowserToolbarButton
          aria-label="View notes"
          isDisabled={location.pathname === "/notes"}
          onPress={() => openNote()}
        >
          <NotebookIcon />
        </BrowserToolbarButton>
      )}
      {location.pathname !== "/notes" &&
        (isNotebookUrl(currentId) || selected.length > 0) &&
        (savedNote ? (
          <button
            type="button"
            className="iiif-notebook__add"
            onClick={() => openNote(savedNote.id)}
            title={`Open ${savedNote.title || "Untitled note"}`}
          >
            <NotebookIcon /> View in notes
          </button>
        ) : (
          !options.readOnly && (
            <button
              type="button"
              className="iiif-notebook__add"
              disabled={saving || loading}
              title={`Append a link to ${currentNote(state, options.projectId)?.title || "a new note"}`}
              onClick={() => void save()}
            >
              <PlusIcon aria-hidden="true" />{" "}
              {saving ? "Adding…" : "Add to note"}
            </button>
          )
        ))}
      {location.pathname === "/notes" && activeNote && (
        <BrowserToolbarButton
          aria-label={
            params.get("view") === "collection"
              ? "Edit note"
              : "View note as collection"
          }
          onPress={() =>
            openNote(activeNote.id, params.get("view") !== "collection")
          }
        >
          <PortalResourceIcon
            type={
              params.get("view") === "collection" ? "Manifest" : "Collection"
            }
          />
        </BrowserToolbarButton>
      )}
      {message && (
        <span className="iiif-notebook__save-status" role="status">
          {message}
        </span>
      )}
      <NotebookResourceBrowser
        resource={previewResource}
        onClose={() => preview.setState({ resource: null })}
        browserProps={options.browserProps}
      />
    </div>
  );
}
