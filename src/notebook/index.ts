export { IIIFNotebook, type IIIFNotebookProps } from "./Notebook";
export { notebookPlugin, type NotebookPluginOptions } from "./plugin";
export {
  createNotebook,
  getNotebook,
  currentNote,
  notesForProject,
  searchNotebook,
  type NotebookStore,
  type NotebookState,
  type NotebookNote,
  type NotebookOptions,
  type NotebookSnapshot,
  type NotebookWorkspaceView,
  type NotebookNoteView,
} from "./store";
export {
  resolveNotebookResource,
  notebookPaste,
  noteResources,
  resourceNode,
  type NotebookResource,
  type NotebookResolverOptions,
} from "./resources";
export {
  notebookExtensions,
  NotebookResourceLink,
  NotebookResourceBlock,
  setNotebookResourceView,
  NotebookPaste,
  NotebookEditorContext,
  setNotebookTaskChecked,
  type NotebookAction,
  type NotebookActionContext,
  type NotebookEditorOptions,
} from "./extensions";
export { openNotebookResource } from "./navigation";

export { IIIFLink, InsertIIIFLink } from "../tiptap/link";
export {
  NotebookResourceBrowser,
  notebookBrowserOutputs,
} from "./ResourceBrowser";
export { notebookResourceHistory } from "./navigation";
