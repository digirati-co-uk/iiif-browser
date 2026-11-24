import type { Editor, JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import { EditorState, type Plugin } from "@tiptap/pm/state";
import { Mapping, Step, type StepMap } from "@tiptap/pm/transform";
import {
  collab,
  getVersion,
  receiveTransaction,
  sendableSteps,
} from "prosemirror-collab";
import {
  type NotebookEditorBinding,
  type NotebookSelection,
  markNotebookRemoteTransaction,
} from "./binding";
import {
  applyNotebookSteps,
  DEFAULT_NOTEBOOK_BATCH_BYTES,
  DEFAULT_NOTEBOOK_BATCH_STEPS,
  getNotebookSchema,
  NOTEBOOK_CONTENT_SCHEMA_VERSION,
  parseNotebookContent,
  type NotebookAcceptedSteps,
  type NotebookCheckpoint,
  type NotebookContentLimits,
  type NotebookStepBatch,
} from "./document";

export interface NotebookStepBindingOptions {
  /** A new editor client ID is required for each independently editable binding. */
  clientId?: string | number;
  /** Stable across remounts. Change the key when intentionally replacing a checkpoint. */
  key?: string;
  limits?: NotebookContentLimits;
  /** Restore journaled steps against the exact checkpoint they were based on. */
  initialPending?: NotebookStepBatch;
  onPendingChange?(): void;
  onConfirmedChange?(checkpoint: NotebookCheckpoint): void;
  onSelectionChange?(selection: NotebookSelection | null): void;
  /** Recover the draft when a concurrent edit removes its target. */
  onConflict?(draft: JSONContent): void;
}

export interface NotebookVersionedSelection extends NotebookSelection {
  version: number;
}

export interface NotebookStepBinding extends NotebookEditorBinding {
  clientId: string | number;
  getConfirmed(): NotebookCheckpoint;
  getDraft(): JSONContent;
  /** A submit-ready prefix, bounded by the codec limits. */
  getPending(): NotebookStepBatch | null;
  /** All pending steps for local journaling. Persist with the confirmed checkpoint and client ID. */
  getUnconfirmed(): NotebookStepBatch | null;
  /** Map a local selection back to the last confirmed document before publishing it. */
  toConfirmedSelection(
    selection: NotebookSelection,
  ): NotebookVersionedSelection | null;
  /** Map a peer selection forward through recent confirmed and unconfirmed steps. */
  mapPeerSelection(
    selection: NotebookVersionedSelection,
  ): NotebookSelection | null;
  receive(batch: NotebookAcceptedSteps): "applied" | "duplicate" | "gap";
}

function schemaSignature(schema: Schema) {
  return JSON.stringify({
    nodes: Object.entries(schema.nodes).map(([name, { spec }]) => [
      name,
      spec.content,
      spec.group,
      spec.marks,
      spec.inline,
      spec.attrs,
    ]),
    marks: Object.entries(schema.marks).map(([name, { spec }]) => [
      name,
      spec.group,
      spec.excludes,
      spec.inclusive,
      spec.spanning,
      spec.attrs,
    ]),
  });
}

/** One binding per editor surface. Its pending edits survive editor detach/reattach. */
export function createNotebookStepBinding(
  initial: NotebookCheckpoint,
  options: NotebookStepBindingOptions = {},
): NotebookStepBinding {
  if (
    initial.schemaVersion !== NOTEBOOK_CONTENT_SCHEMA_VERSION ||
    !Number.isSafeInteger(initial.version) ||
    initial.version < 0
  )
    throw new RangeError("Invalid notebook checkpoint version.");
  const clientId = options.clientId ?? crypto.randomUUID();
  if (
    (typeof clientId !== "string" || !clientId) &&
    !Number.isSafeInteger(clientId)
  )
    throw new TypeError("Invalid notebook editor client ID.");

  const firstDoc = parseNotebookContent(initial.content, options.limits);
  let confirmed = { ...initial, content: firstDoc.toJSON() as JSONContent };
  const pluginFor = () =>
    collab({ version: confirmed.version, clientID: clientId });
  let detached = EditorState.create({ doc: firstDoc, plugins: [pluginFor()] });
  if (options.initialPending) {
    if (options.initialPending.version !== initial.version)
      throw new RangeError(
        "Pending changes need their original notebook checkpoint.",
      );
    detached = replayPending(detached, options.initialPending);
  }
  let mounted: { editor: Editor; plugin: Plugin } | null = null;
  const recentMaps: StepMap[] = [];
  let receiving = false;
  let notificationQueued = false;

  function state() {
    return mounted?.editor.state ?? detached;
  }

  function pendingMaps(current: EditorState) {
    return sendableSteps(current)?.steps.map((step) => step.getMap()) ?? [];
  }

  function mappedSelection(
    selection: NotebookSelection,
    mapping: Mapping,
    size = Infinity,
  ) {
    if (
      ![selection.anchor, selection.head].every(
        (pos) => Number.isSafeInteger(pos) && pos >= 0,
      )
    )
      return null;
    const anchor = mapping.map(selection.anchor);
    const head = mapping.map(selection.head);
    return anchor <= size && head <= size ? { anchor, head } : null;
  }

  function getUnconfirmed(): NotebookStepBatch | null {
    const pending = sendableSteps(state());
    return (
      pending && {
        version: pending.version,
        steps: pending.steps.map((step) => step.toJSON()),
      }
    );
  }

  function getPending(): NotebookStepBatch | null {
    const pending = sendableSteps(state());
    if (!pending) return null;
    const encoder = new TextEncoder();
    const maxSteps =
      options.limits?.maxBatchSteps ?? DEFAULT_NOTEBOOK_BATCH_STEPS;
    const maxBytes =
      options.limits?.maxBatchBytes ?? DEFAULT_NOTEBOOK_BATCH_BYTES;
    const steps: unknown[] = [];
    let bytes = 2;
    for (const step of pending.steps) {
      const json = step.toJSON();
      bytes +=
        encoder.encode(JSON.stringify(json)).length + (steps.length ? 1 : 0);
      if (bytes > maxBytes || steps.length >= maxSteps) break;
      steps.push(json);
    }
    if (!steps.length)
      throw new RangeError(
        "A pending notebook edit exceeds the batch limit. Export the draft to recover it.",
      );
    return { version: pending.version, steps };
  }

  function notifyPending() {
    if (notificationQueued || !options.onPendingChange) return;
    notificationQueued = true;
    queueMicrotask(() => {
      notificationQueued = false;
      options.onPendingChange?.();
    });
  }

  function replayPending(
    target: EditorState,
    pending: NotebookStepBatch | null,
  ) {
    if (!pending) return target;
    const transaction = target.tr;
    for (const step of pending.steps)
      transaction.step(Step.fromJSON(target.schema, step));
    return target.apply(
      markNotebookRemoteTransaction(transaction).setMeta("addToHistory", false),
    );
  }

  return {
    key: options.key ?? String(clientId),
    clientId,
    createEditor: () => ({ content: state().doc.toJSON() }),
    attach(editor) {
      if (mounted) throw new Error("This notebook binding is already mounted.");
      const pending = getUnconfirmed();
      if (
        schemaSignature(editor.schema) !== schemaSignature(getNotebookSchema())
      )
        throw new Error(
          "This editor schema is incompatible with shared notebooks.",
        );
      const plugin = pluginFor();
      const doc = editor.schema.nodeFromJSON(confirmed.content);
      const editorState = EditorState.create({
        doc,
        plugins: [...editor.state.plugins, plugin],
      });
      editor.view.updateState(replayPending(editorState, pending));
      mounted = { editor, plugin };
      return () => {
        if (mounted?.editor !== editor) return;
        const pending = getUnconfirmed();
        detached = replayPending(
          EditorState.create({
            doc: parseNotebookContent(confirmed.content, options.limits),
            plugins: [pluginFor()],
          }),
          pending,
        );
        const plugins = editor.state.plugins.filter(
          (item) => item !== mounted?.plugin,
        );
        mounted = null;
        // Strict Mode may attach the same editor again.
        if (!editor.isDestroyed)
          editor.view.updateState(editor.state.reconfigure({ plugins }));
      };
    },
    onTransaction({ transaction, appendedTransactions }) {
      if (
        !receiving &&
        (transaction.docChanged ||
          appendedTransactions.some((tr) => tr.docChanged))
      )
        notifyPending();
    },
    onSelectionChange: options.onSelectionChange,
    getConfirmed: () => confirmed,
    getDraft: () => state().doc.toJSON(),
    getPending,
    getUnconfirmed,
    toConfirmedSelection(selection) {
      const current = state();
      if (
        selection.anchor > current.doc.content.size ||
        selection.head > current.doc.content.size
      )
        return null;
      const mapped = mappedSelection(
        selection,
        new Mapping(pendingMaps(current)).invert(),
      );
      return mapped && { ...mapped, version: getVersion(current) };
    },
    mapPeerSelection(selection) {
      const current = state();
      const distance = getVersion(current) - selection.version;
      if (
        !Number.isSafeInteger(distance) ||
        distance < 0 ||
        distance > recentMaps.length
      )
        return null;
      const maps = recentMaps.slice(recentMaps.length - distance);
      return mappedSelection(
        selection,
        new Mapping([...maps, ...pendingMaps(current)]),
        current.doc.content.size,
      );
    },
    receive(batch) {
      if (
        !Number.isSafeInteger(batch.version) ||
        batch.version < 0 ||
        batch.steps.length !== batch.clientIds.length ||
        !Number.isSafeInteger(batch.version + batch.steps.length)
      )
        throw new RangeError("Invalid accepted notebook batch.");
      if (batch.version > confirmed.version) return "gap";
      const skip = confirmed.version - batch.version;
      if (skip >= batch.steps.length) return "duplicate";
      const steps = batch.steps.slice(skip);
      const clientIds = batch.clientIds.slice(skip);
      const next = applyNotebookSteps(
        confirmed,
        { version: confirmed.version, steps },
        options.limits,
      );
      const previous = state();
      const pending = getUnconfirmed();
      let authored = 0;
      while (clientIds[authored] === clientId) authored++;
      if (
        clientIds.slice(authored).includes(clientId) ||
        authored > (pending?.steps.length ?? 0)
      )
        throw new RangeError(
          "Accepted notebook steps are out of order for this editor.",
        );
      const decoded = steps.map((step) => Step.fromJSON(previous.schema, step));
      for (let index = 0; index < authored; index++) {
        if (
          JSON.stringify(decoded[index].toJSON()) !==
          JSON.stringify(pending!.steps[index])
        )
          throw new RangeError(
            "Accepted notebook steps do not match the pending batch.",
          );
      }
      const transaction = markNotebookRemoteTransaction(
        receiveTransaction(previous, decoded, clientIds, {
          mapSelectionBackward: true,
        }),
      );
      receiving = true;
      try {
        if (mounted) mounted.editor.view.dispatch(transaction);
        else detached = previous.apply(transaction);
      } finally {
        receiving = false;
      }
      if (getVersion(state()) !== next.version)
        throw new Error(
          "The editor did not apply the accepted notebook batch.",
        );
      confirmed = next;
      recentMaps.push(...decoded.map((step) => step.getMap()));
      if (recentMaps.length > 256)
        recentMaps.splice(0, recentMaps.length - 256);
      if (
        (getUnconfirmed()?.steps.length ?? 0) <
        (pending?.steps.length ?? 0) - authored
      )
        options.onConflict?.(previous.doc.toJSON());
      notifyPending();
      options.onConfirmedChange?.(confirmed);
      return "applied";
    },
  };
}
