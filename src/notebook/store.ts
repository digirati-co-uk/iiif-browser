import type { JSONContent } from "@tiptap/core";
import { createStore } from "zustand/vanilla";
import {
  noteResources,
  noteText,
  resourceNode,
  type NotebookResource,
} from "./resources";

export interface NotebookNote {
  id: string;
  title: string;
  projectId?: string;
  content: JSONContent;
  createdAt: string;
  updatedAt: string;
}
export interface NotebookWorkspaceView {
  query?: string;
  sidebarWidth?: number;
  sidebarCollapsed?: boolean;
}
export interface NotebookNoteView {
  scrollTop: number;
  anchor: number;
  head: number;
}
export interface NotebookSnapshot {
  version: 1;
  notes: NotebookNote[];
  lastOpened: Record<string, string>;
  views?: Record<string, NotebookWorkspaceView>;
  noteViews?: Record<string, NotebookNoteView>;
}
export interface NotebookOptions {
  name?: string;
  /** false disables local storage. Supply a unique key for an account/workspace. */
  storageKey?: string | false;
  initialNotes?: NotebookNote[];
  localStorageKey?: string;
  restoreFromLocalStorage?: boolean;
  saveToLocalStorage?: boolean;
  onChange?: (snapshot: NotebookSnapshot) => void;
}
export interface NotebookState extends NotebookSnapshot {
  views: Record<string, NotebookWorkspaceView>;
  noteViews: Record<string, NotebookNoteView>;
  setWorkspaceView(
    projectId: string | undefined,
    changes: NotebookWorkspaceView,
  ): void;
  setNoteView(noteId: string, view: NotebookNoteView): void;
  persistenceError: string | null;
  createNote(projectId?: string, title?: string): NotebookNote;
  updateNote(
    id: string,
    changes: Partial<Pick<NotebookNote, "title" | "content">>,
  ): void;
  deleteNote(id: string): void;
  openNote(id: string): void;
  appendResource(
    resource: NotebookResource,
    options?: { noteId?: string; projectId?: string; asImage?: boolean },
  ): string;
  exportJSON(): string;
}
export function projectKey(projectId?: string) {
  return JSON.stringify(projectId ?? null);
}
export function notesForProject(
  state: Pick<NotebookState, "notes">,
  projectId?: string,
) {
  return state.notes
    .filter((note) => note.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function currentNote(
  state: Pick<NotebookState, "notes" | "lastOpened">,
  projectId?: string,
) {
  return (
    notesForProject(state, projectId).find(
      (note) => note.id === state.lastOpened[projectKey(projectId)],
    ) ?? notesForProject(state, projectId)[0]
  );
}
function validSnapshot(value: any): value is NotebookSnapshot {
  return (
    value?.version === 1 &&
    Array.isArray(value.notes) &&
    value.notes.every(
      (note: any) =>
        typeof note?.id === "string" &&
        typeof note.title === "string" &&
        (note.projectId === undefined || typeof note.projectId === "string") &&
        note.content?.type === "doc" &&
        Array.isArray(note.content.content) &&
        typeof note.createdAt === "string" &&
        typeof note.updatedAt === "string",
    ) &&
    (!value.views ||
      (typeof value.views === "object" &&
        !Array.isArray(value.views) &&
        Object.values(value.views).every(
          (view: any) =>
            view &&
            (view.query === undefined || typeof view.query === "string") &&
            (view.sidebarWidth === undefined ||
              Number.isFinite(view.sidebarWidth)) &&
            (view.sidebarCollapsed === undefined ||
              typeof view.sidebarCollapsed === "boolean"),
        ))) &&
    (!value.noteViews ||
      (typeof value.noteViews === "object" &&
        !Array.isArray(value.noteViews) &&
        Object.values(value.noteViews).every(
          (view: any) =>
            view &&
            Number.isInteger(view.anchor) &&
            Number.isInteger(view.head) &&
            [view.scrollTop, view.anchor, view.head].every(
              (value) => Number.isFinite(value) && value >= 0,
            ),
        ))) &&
    value.lastOpened &&
    typeof value.lastOpened === "object" &&
    !Array.isArray(value.lastOpened) &&
    Object.values(value.lastOpened).every((id) => typeof id === "string")
  );
}
export function createNotebook(options: NotebookOptions = {}) {
  const key =
    options.storageKey === false
      ? false
      : (options.localStorageKey ??
        options.storageKey ??
        `iiif-browser:notebook:${options.name ?? "global"}`);
  let initial: NotebookSnapshot = {
    version: 1,
    notes: options.initialNotes ?? [],
    lastOpened: {},
  };
  let persistenceError: string | null = null;
  // Do not overwrite an unreadable notebook with an empty one.
  let canPersist = true;
  if (
    key &&
    options.restoreFromLocalStorage !== false &&
    typeof localStorage !== "undefined"
  ) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!validSnapshot(parsed))
          throw new Error("Unsupported notebook data");
        initial = parsed;
      }
    } catch {
      canPersist = false;
      persistenceError =
        "Saved notebook could not be read. Existing storage is preserved; export your changes before closing.";
    }
  }
  const store = createStore<NotebookState>((set, get) => ({
    ...initial,
    views: initial.views ?? {},
    noteViews: initial.noteViews ?? {},
    persistenceError,
    setWorkspaceView(projectId, changes) {
      const key = projectKey(projectId);
      const previous = get().views[key] ?? {};
      if (
        Object.entries(changes).every(
          ([name, value]) =>
            previous[name as keyof NotebookWorkspaceView] === value,
        )
      )
        return;
      set((state) => ({
        views: { ...state.views, [key]: { ...previous, ...changes } },
      }));
    },
    setNoteView(noteId, view) {
      if (
        !get().notes.some((note) => note.id === noteId) ||
        JSON.stringify(get().noteViews[noteId]) === JSON.stringify(view)
      )
        return;
      set((state) => ({ noteViews: { ...state.noteViews, [noteId]: view } }));
    },
    createNote(projectId, title = "Untitled note") {
      const now = new Date().toISOString();
      const note: NotebookNote = {
        id: crypto.randomUUID(),
        title,
        projectId,
        createdAt: now,
        updatedAt: now,
        content: { type: "doc", content: [{ type: "paragraph" }] },
      };
      set((state) => ({
        notes: [note, ...state.notes],
        lastOpened: { ...state.lastOpened, [projectKey(projectId)]: note.id },
      }));
      return note;
    },
    updateNote(id, changes) {
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id
            ? { ...note, ...changes, updatedAt: new Date().toISOString() }
            : note,
        ),
      }));
    },
    deleteNote(id) {
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        noteViews: Object.fromEntries(
          Object.entries(state.noteViews).filter(([noteId]) => noteId !== id),
        ),
        lastOpened: Object.fromEntries(
          Object.entries(state.lastOpened).filter(
            ([, noteId]) => noteId !== id,
          ),
        ),
      }));
    },
    openNote(id) {
      const note = get().notes.find((note) => note.id === id);
      if (note)
        set((state) => ({
          lastOpened: { ...state.lastOpened, [projectKey(note.projectId)]: id },
        }));
    },
    appendResource(resource, { noteId, projectId, asImage = false } = {}) {
      const state = get();
      let note = noteId
        ? state.notes.find(
            (note) => note.id === noteId && note.projectId === projectId,
          )
        : currentNote(state, projectId);
      if (noteId && !note)
        throw new Error("The destination note is not in this project.");
      if (!note) note = state.createNote(projectId);
      const image = resource.image || resource.thumbnail;
      const content: JSONContent[] = [
        {
          type: "paragraph",
          content: [resourceNode(resource.source, resource)],
        },
      ];
      if (asImage && image)
        content.push({
          type: "iiifImage",
          attrs: { src: image, alt: resource.label, width: 480 },
        });
      state.updateNote(note.id, {
        content: {
          type: "doc",
          content: [...(note.content.content ?? []), ...content],
        },
      });
      state.openNote(note.id);
      return note.id;
    },
    exportJSON() {
      const { version, notes, lastOpened, views, noteViews } = get();
      return JSON.stringify(
        { version, notes, lastOpened, views, noteViews },
        null,
        2,
      );
    },
  }));
  store.subscribe((state, previous) => {
    if (
      state.notes === previous.notes &&
      state.lastOpened === previous.lastOpened &&
      state.views === previous.views &&
      state.noteViews === previous.noteViews
    )
      return;
    const snapshot: NotebookSnapshot = {
      version: 1,
      notes: state.notes,
      lastOpened: state.lastOpened,
      views: state.views,
      noteViews: state.noteViews,
    };
    if (
      key &&
      canPersist &&
      options.saveToLocalStorage !== false &&
      typeof localStorage !== "undefined"
    ) {
      try {
        localStorage.setItem(key, JSON.stringify(snapshot));
        if (state.persistenceError) store.setState({ persistenceError: null });
      } catch {
        store.setState({
          persistenceError:
            "Changes are only in memory: storage is unavailable or full. Export your notebook before closing.",
        });
      }
    }
    try {
      options.onChange?.(snapshot);
    } catch {
      store.setState({
        persistenceError:
          "The notebook save callback failed. Export your changes before closing.",
      });
    }
  });
  return store;
}
export type NotebookStore = ReturnType<typeof createNotebook>;
const notebooks = new Map<string, NotebookStore>();
/** Browser-only convenience registry. On a server, create one store per request. */
export function getNotebook(name = "global") {
  if (typeof window === "undefined")
    return createNotebook({ name, storageKey: false });
  if (!notebooks.has(name)) notebooks.set(name, createNotebook({ name }));
  return notebooks.get(name)!;
}
export function searchNotebook(
  store: NotebookStore,
  query: string,
  projectId?: string,
) {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return notesForProject(store.getState(), projectId).flatMap((note) =>
    noteResources(note.content)
      .filter((resource) =>
        terms.every((term) =>
          `${note.title} ${noteText(note.content)} ${resource.label} ${resource.id}`
            .toLocaleLowerCase()
            .includes(term),
        ),
      )
      .map((resource) => ({ note, resource })),
  );
}
