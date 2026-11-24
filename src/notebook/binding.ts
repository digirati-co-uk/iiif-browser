import type { Editor, Extensions, JSONContent } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import type { NotebookResource } from "./resources";

export interface NotebookEditorEvents {
  editor: Editor;
  transaction: Transaction;
  appendedTransactions: readonly Transaction[];
}

export interface NotebookSelection {
  anchor: number;
  head: number;
}

/** A binding controls body content for one note and generation. */
export interface NotebookEditorBinding {
  key: string;
  createEditor(): {
    content?: JSONContent;
    extensions?: Extensions;
    /** Keep StarterKit history unless the binding provides its own undo/redo. */
    undoRedo?: false;
  };
  attach?(editor: Editor): void | (() => void);
  onTransaction?(event: NotebookEditorEvents): void;
  onSelectionChange?(selection: NotebookSelection | null): void;
}

type CommandResult<T> = T | Promise<T>;

/** Resolve after acceptance and after updating the host's note projection. Reject to show an error. */
export interface NotebookCommands {
  createNote(options: {
    projectId?: string;
    title?: string;
  }): CommandResult<string>;
  renameNote(noteId: string, title: string): CommandResult<void>;
  deleteNote(noteId: string): CommandResult<void>;
  appendResources(options: {
    /** Null requests creation with the resource insertion in the same operation. */
    noteId: string | null;
    projectId?: string;
    resources: readonly NotebookResource[];
  }): CommandResult<string>;
}

export interface NotebookCapabilities {
  editContent?: boolean;
  manageNotes?: boolean;
  appendResources?: boolean;
  runActions?: boolean;
}

export interface NotebookSyncStatus {
  state:
    | "loading"
    | "ready"
    | "pending"
    | "reconnecting"
    | "rejected"
    | "incompatible"
    | "deleted";
  message?: string;
  /** A host can export a pending draft even when its confirmed projection is read-only. */
  recoverDraft?: () => void;
}

const remoteTransactionMeta = "iiif-notebook:remote";

/** Bindings mark incoming transactions so permissions and local normalization can distinguish them. */
export function markNotebookRemoteTransaction(
  transaction: Transaction,
): Transaction {
  return transaction
    .setMeta(remoteTransactionMeta, true)
    .setMeta("skipTrailingNode", true);
}

export function isNotebookRemoteTransaction(transaction: Transaction): boolean {
  return transaction.getMeta(remoteTransactionMeta) === true;
}
