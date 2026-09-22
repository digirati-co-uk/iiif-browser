import "./styles.css";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { IIIFImageDialog, IIIFSnippetDialog } from "../tiptap";
import { InsertIIIFLink } from "../tiptap/link";
import { NotebookResourceBrowser } from "./ResourceBrowser";
import { PlusIcon } from "../icons/PlusIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { DeleteForeverIcon } from "../icons/DeleteForeverIcon";
import { NotebookIcon } from "./icons";
import {
  NotebookEditorContext,
  notebookExtensions,
  type NotebookEditorOptions,
} from "./extensions";
import { noteText, type NotebookResource } from "./resources";
import {
  currentNote,
  getNotebook,
  notesForProject,
  projectKey,
  type NotebookNote,
  type NotebookStore,
} from "./store";

export interface IIIFNotebookProps extends NotebookEditorOptions {
  notebook?: NotebookStore | string;
  projectId?: string;
  /** Controlled active note, for hosts with note-specific routes. */
  noteId?: string;
  onNoteChange?(noteId: string): void;
  readOnly?: boolean;
  className?: string;
  /** A bounded workspace; the note and sidebar scroll independently. */
  height?: CSSProperties["height"];
  maxHeight?: CSSProperties["maxHeight"];
  defaultSidebarWidth?: number;
  defaultSidebarCollapsed?: boolean;
  renderNoteActions?(context: {
    note: NotebookNote;
    notebook: NotebookStore;
    readOnly: boolean;
  }): ReactNode;
}
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: ReactNode[] = [];
  let start = 0;
  let index = text.toLowerCase().indexOf(query.toLowerCase());
  while (index !== -1) {
    parts.push(
      text.slice(start, index),
      <mark key={index}>{text.slice(index, index + query.length)}</mark>,
    );
    start = index + query.length;
    index = text.toLowerCase().indexOf(query.toLowerCase(), start);
  }
  return (
    <>
      {parts}
      {text.slice(start)}
    </>
  );
}
export function IIIFNotebook({
  notebook: input = "global",
  projectId,
  noteId,
  onNoteChange,
  readOnly = false,
  className = "",
  height = 600,
  maxHeight,
  defaultSidebarWidth = 240,
  defaultSidebarCollapsed = false,
  renderNoteActions,
  ...options
}: IIIFNotebookProps) {
  const notebook = typeof input === "string" ? getNotebook(input) : input;
  const state = useStore(notebook);
  const [preview, setPreview] = useState<NotebookResource | null>(null);
  const view = state.views[projectKey(projectId)];
  const query = view?.query ?? "";
  const collapsed = view?.sidebarCollapsed ?? defaultSidebarCollapsed;
  const sidebarWidth = Math.max(
    160,
    Math.min(400, view?.sidebarWidth ?? defaultSidebarWidth),
  );
  const setQuery = (query: string) =>
    state.setWorkspaceView(projectId, { query });
  const setCollapsed = (sidebarCollapsed: boolean) =>
    state.setWorkspaceView(projectId, { sidebarCollapsed });
  const setSidebarWidth = (sidebarWidth: number) =>
    state.setWorkspaceView(projectId, { sidebarWidth });
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [recovery, setRecovery] = useState<NotebookNote | null>(null);
  const notes = notesForProject(state, projectId);
  const note =
    notes.find((note) => note.id === noteId) ?? currentNote(state, projectId);
  const openNote = (id: string) => {
    state.openNote(id);
    onNoteChange?.(id);
  };
  const search = query.trim();
  const filtered = notes.filter((item) =>
    `${item.title} ${noteText(item.content)}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  useEffect(() => {
    setRecovery(null);
  }, [projectId, notebook]);
  const resize = (width: number) =>
    setSidebarWidth(Math.max(160, Math.min(400, width)));
  const exportNotebook = () => {
    const url = URL.createObjectURL(
      new Blob([state.exportJSON()], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "iiif-notebook.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const onOpenResource = (resource: NotebookResource) => {
    if (options.onOpenResource) options.onOpenResource(resource);
    else setPreview(resource);
  };
  return (
    <section
      className={`iiif-notebook iiif-notebook__editor ${className}`}
      style={{ height, maxHeight }}
      aria-label="IIIF notebook"
    >
      <NotebookResourceBrowser
        resource={preview}
        onClose={() => setPreview(null)}
        browserProps={options.browserProps}
      />
      {state.persistenceError && <p role="alert">{state.persistenceError}</p>}
      {recovery && (
        <p role="status" className="iiif-notebook__notice">
          Note deleted.{" "}
          <button
            type="button"
            onClick={() => {
              notebook.setState((value) => ({
                notes: [recovery, ...value.notes],
              }));
              openNote(recovery.id);
              setRecovery(null);
            }}
          >
            Undo deletion
          </button>
        </p>
      )}
      <div className="iiif-notebook__workspace">
        {!collapsed && (
          <>
            <aside
              className="iiif-notebook__sidebar"
              style={{ width: sidebarWidth }}
            >
              <div className="iiif-notebook__sidebar-controls">
                <button
                  type="button"
                  className="iiif-notebook__icon"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  onClick={() => setCollapsed(true)}
                >
                  <NotebookIcon name="sidebar" />
                </button>
                <span className="iiif-notebook__spacer" />
                {!readOnly && (
                  <button
                    type="button"
                    className="iiif-notebook__icon"
                    aria-label="New note"
                    title="New note"
                    onClick={() => {
                      openNote(state.createNote(projectId).id);
                      setQuery("");
                    }}
                  >
                    <PlusIcon aria-hidden="true" />
                  </button>
                )}
                <details className="iiif-notebook__menu">
                  <summary
                    className="iiif-notebook__icon"
                    aria-label="Notebook options"
                    title="Notebook options"
                  >
                    <NotebookIcon name="more" />
                  </summary>
                  <div>
                    <button
                      type="button"
                      onClick={(event) => {
                        exportNotebook();
                        event.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                      }}
                    >
                      Export notebook
                    </button>
                  </div>
                </details>
              </div>
              <div className="iiif-notebook__search">
                <SearchIcon aria-hidden="true" />
                <input
                  aria-label="Search notes"
                  placeholder="Search notes"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="iiif-notebook__icon"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <CloseIcon aria-hidden="true" />
                  </button>
                )}
              </div>
              <nav aria-label="Project notes">
                {filtered.map((item) => {
                  const text = noteText(item.content);
                  const match = search
                    ? text.toLowerCase().indexOf(search.toLowerCase())
                    : 0;
                  const start = Math.max(0, match - 28);
                  const snippet = `${start ? "…" : ""}${text.slice(start, start + Math.max(100, search.length + 28))}`;
                  return (
                    <div
                      className="iiif-notebook__note-card"
                      data-current={item.id === note?.id}
                      key={item.id}
                    >
                      <button
                        type="button"
                        aria-current={item.id === note?.id ? "page" : undefined}
                        onClick={() => openNote(item.id)}
                      >
                        <strong>
                          <Highlight
                            text={item.title || "Untitled note"}
                            query={search}
                          />
                        </strong>
                        <small>
                          <Highlight
                            text={snippet || "Start writing…"}
                            query={search}
                          />
                        </small>
                      </button>
                      {renderNoteActions && (
                        <div className="iiif-notebook__note-actions">
                          {renderNoteActions({
                            note: item,
                            notebook,
                            readOnly,
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!filtered.length && (
                  <p className="iiif-notebook__muted">
                    {search ? "No matching notes." : "No notes yet."}
                  </p>
                )}
              </nav>
            </aside>
            <div
              role="separator"
              aria-label="Resize notebook sidebar"
              aria-orientation="vertical"
              aria-valuemin={160}
              aria-valuemax={400}
              aria-valuenow={sidebarWidth}
              tabIndex={0}
              className="iiif-notebook__resize"
              onKeyDown={(event) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  resize(
                    event.key === "Home"
                      ? 160
                      : event.key === "End"
                        ? 400
                        : sidebarWidth + (event.key === "ArrowLeft" ? -16 : 16),
                  );
                }
              }}
              onPointerDown={(event) => {
                drag.current = { x: event.clientX, width: sidebarWidth };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (drag.current)
                  resize(drag.current.width + event.clientX - drag.current.x);
              }}
              onPointerUp={(event) => {
                drag.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
            />
          </>
        )}
        <main className="iiif-notebook__main">
          <div className="iiif-notebook__title-row">
            {collapsed && (
              <button
                type="button"
                className="iiif-notebook__icon"
                aria-label="Open sidebar"
                title="Open sidebar"
                onClick={() => setCollapsed(false)}
              >
                <NotebookIcon name="sidebar" />
              </button>
            )}
            {note && (
              <>
                <input
                  aria-label="Note title"
                  value={note.title}
                  readOnly={readOnly}
                  placeholder="Untitled note"
                  onChange={(event) =>
                    state.updateNote(note.id, { title: event.target.value })
                  }
                />
                {!readOnly && (
                  <button
                    type="button"
                    className="iiif-notebook__icon"
                    aria-label="Delete note"
                    title="Delete note"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${note.title || "Untitled note"}”?`,
                        )
                      ) {
                        setRecovery(note);
                        state.deleteNote(note.id);
                      }
                    }}
                  >
                    <DeleteForeverIcon aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>
          {note ? (
            <NoteEditor
              key={`${note.id}:${projectId ?? ""}`}
              {...options}
              onOpenResource={onOpenResource}
              notebook={notebook}
              note={note}
              readOnly={readOnly}
            />
          ) : (
            <div className="iiif-notebook__empty">
              <p>No note selected.</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => state.createNote(projectId)}
                >
                  Create a note
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
function NoteEditor({
  note,
  notebook,
  readOnly,
  ...options
}: NotebookEditorOptions & {
  note: NotebookNote;
  notebook: NotebookStore;
  readOnly: boolean;
}) {
  const savedView = useRef(notebook.getState().noteViews[note.id]);
  const viewport = useRef<HTMLDivElement>(null);
  const position = useRef({
    ...(savedView.current ?? { scrollTop: 0, anchor: 1, head: 1 }),
  });
  const changedView = useRef(false);
  const latest = useRef(note);
  latest.current = note;
  const ownContent = useRef(note.content);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      ...notebookExtensions(options),
    ],
    content: note.content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Note content",
        class: "iiif-notebook__prose",
      },
    },
    onSelectionUpdate: ({ editor }) => {
      if (editor.isFocused) {
        position.current = {
          ...position.current,
          anchor: editor.state.selection.anchor,
          head: editor.state.selection.head,
        };
        changedView.current = true;
      }
    },
    onUpdate: ({ editor }) => {
      ownContent.current = editor.getJSON();
      notebook
        .getState()
        .updateNote(latest.current.id, { content: ownContent.current });
    },
  });
  useEffect(() => {
    if (!editor) return;
    const frame = requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      const view = savedView.current;
      if (view) {
        const max = editor.state.doc.content.size;
        editor.commands.command(({ tr }) => {
          tr.setSelection(
            TextSelection.between(
              tr.doc.resolve(Math.min(view.anchor, max)),
              tr.doc.resolve(Math.min(view.head, max)),
            ),
          );
          return true;
        });
        if (viewport.current) viewport.current.scrollTop = view.scrollTop;
      }
    });
    const save = () => {
      if (changedView.current)
        notebook.getState().setNoteView(note.id, position.current);
    };
    window.addEventListener("pagehide", save);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [editor, notebook, note.id]);
  useEffect(() => {
    if (editor && editor.isEditable === readOnly)
      editor.setEditable(!readOnly, false);
  }, [editor, readOnly]);
  useEffect(() => {
    if (!editor || note.content === ownContent.current) return;
    let active = true;
    // React node views flush synchronously; apply outside the React effect.
    queueMicrotask(() => {
      if (
        !active ||
        editor.isDestroyed ||
        notebook.getState().notes.find((item) => item.id === note.id)
          ?.content !== note.content
      )
        return;
      ownContent.current = note.content;
      editor.commands.setContent(note.content, { emitUpdate: false });
    });
    return () => {
      active = false;
    };
  }, [editor, notebook, note.id, note.content]);
  useEditorState({ editor, selector: ({ editor }) => editor?.state });
  const tools = [
    [
      "Bold",
      "bold",
      () => editor?.chain().focus().toggleBold().run(),
      editor?.isActive("bold"),
    ],
    [
      "Italic",
      "italic",
      () => editor?.chain().focus().toggleItalic().run(),
      editor?.isActive("italic"),
    ],
    [
      "Heading",
      "heading",
      () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      editor?.isActive("heading"),
    ],
    [
      "Bullet list",
      "list",
      () => editor?.chain().focus().toggleBulletList().run(),
      editor?.isActive("bulletList"),
    ],
    [
      "Checklist",
      "checklist",
      () => editor?.chain().focus().toggleTaskList().run(),
      editor?.isActive("taskList"),
    ],
  ] as const;
  return (
    <NotebookEditorContext.Provider value={{ ...options, notebook, note }}>
      {editor && !readOnly && (
        <>
          <IIIFImageDialog editor={editor} />
          <IIIFSnippetDialog editor={editor} />
        </>
      )}
      {!readOnly && (
        <div
          className="iiif-notebook__toolbar"
          role="toolbar"
          aria-label="Note formatting"
        >
          <span className="iiif-notebook__tool-group">
            {tools.map(([label, icon, run, pressed]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={pressed ?? false}
                onClick={run}
              >
                <NotebookIcon name={icon} />
              </button>
            ))}
          </span>
          <span className="iiif-notebook__tool-group">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                aria-label={`Align ${align}`}
                title={`Align ${align}`}
                aria-pressed={editor?.isActive({ textAlign: align }) ?? false}
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .updateAttributes("paragraph", { textAlign: align })
                    .updateAttributes("heading", { textAlign: align })
                    .run()
                }
              >
                <NotebookIcon name={align} />
              </button>
            ))}
          </span>
          <span className="iiif-notebook__tool-group">
            <InsertIIIFLink
              editor={editor}
              browserProps={options.browserProps}
            />
          </span>
          <span className="iiif-notebook__tool-group">
            <button
              type="button"
              aria-label="Undo"
              title="Undo"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <NotebookIcon name="undo" />
            </button>
            <button
              type="button"
              aria-label="Redo"
              title="Redo"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <NotebookIcon name="redo" />
            </button>
          </span>
        </div>
      )}
      <div
        ref={viewport}
        className="iiif-notebook__content"
        onScroll={(event) => {
          position.current = {
            ...position.current,
            scrollTop: event.currentTarget.scrollTop,
          };
          changedView.current = true;
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </NotebookEditorContext.Provider>
  );
}
