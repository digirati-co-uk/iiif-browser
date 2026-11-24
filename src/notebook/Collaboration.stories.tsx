import "../styles/lib.css";
import "../index.css";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  IIIFNotebook,
  applyNotebookContentSnapshot,
  createNotebook,
  createNotebookStepBinding,
  type NotebookVersionedSelection,
} from "./index";
import {
  applyNotebookSteps,
  NOTEBOOK_CONTENT_SCHEMA_VERSION,
  type NotebookStepBatch,
  type NotebookCheckpoint,
} from "./document";

export default {
  title: "Notebook/Collaboration",
  parameters: { layout: "fullscreen" },
};

function createDemo() {
  const first = createNotebook({ storageKey: false });
  const note = first.getState().createNote(undefined, "Shared research");
  const second = createNotebook({ storageKey: false, initialNotes: [note] });
  let checkpoint: NotebookCheckpoint = {
    schemaVersion: NOTEBOOK_CONTENT_SCHEMA_VERSION,
    version: 0,
    content: note.content,
  };
  const presence = createStore<
    Record<string, NotebookVersionedSelection | null>
  >(() => ({}));
  const clients = [first, second].map((store, index) => {
    const label = index === 0 ? "First participant" : "Second participant";
    const color = index === 0 ? "#6348be" : "#007a63";
    const binding = createNotebookStepBinding(checkpoint, {
      onSelectionChange(selection) {
        presence.setState({
          [binding.key]: selection
            ? binding.toConfirmedSelection(selection)
            : null,
        });
      },
      onConfirmedChange({ content }) {
        applyNotebookContentSnapshot(store, {
          version: 1,
          notes: [{ ...note, content }],
        });
      },
    });
    return { store, binding, label, color };
  });
  return {
    noteId: note.id,
    clients,
    presence,
    sync() {
      let changed = false;
      for (const { binding } of clients) {
        const pending = binding.getPending();
        if (!pending) continue;
        // Preserve the original delivery order and the author for each accepted batch.
        const batch: NotebookStepBatch = {
          ...pending,
          steps: pending.steps.slice(0, 32),
        };
        checkpoint = applyNotebookSteps(checkpoint, batch);
        const accepted = {
          ...batch,
          clientIds: batch.steps.map(() => binding.clientId),
        };
        for (const target of clients) target.binding.receive(accepted);
        changed = true;
      }
      // Recompute peer positions against the new document versions.
      if (changed) presence.setState((latest) => ({ ...latest }));
    },
  };
}

function Demo() {
  const [demo] = useState(createDemo);
  const selections = useStore(demo.presence);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      try {
        demo.sync();
        setError("");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Synchronization failed.",
        );
      }
    }, 160);
    return () => clearInterval(interval);
  }, [connected, demo]);

  return (
    <>
      <button type="button" onClick={() => setConnected(!connected)}>
        {connected ? "Pause synchronization" : "Resume synchronization"}
      </button>
      {error && <p role="alert">{error}</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {demo.clients.map(({ binding, store, label }) => {
          const peers = demo.clients.flatMap((peer) => {
            const selection = selections[peer.binding.key];
            if (!connected || peer.binding === binding || !selection) return [];
            const mapped = binding.mapPeerSelection(selection);
            return mapped
              ? [
                  {
                    ...mapped,
                    id: peer.binding.key,
                    label: peer.label,
                    color: peer.color,
                  },
                ]
              : [];
          });
          return (
            <section key={binding.key} aria-label={label}>
              <h2>{label}</h2>
              <IIIFNotebook
                notebook={store}
                noteId={demo.noteId}
                bindEditor={() => binding}
                singleNote
                presence={{ noteId: demo.noteId, peers }}
                syncStatus={
                  connected
                    ? { state: "ready" }
                    : {
                        state: "reconnecting",
                        message:
                          "Changes will synchronize when the connection resumes.",
                      }
                }
              />
            </section>
          );
        })}
      </div>
    </>
  );
}

export const TwoEditors = { render: () => <Demo /> };
