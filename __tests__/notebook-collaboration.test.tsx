// @vitest-environment jsdom
import type { Editor } from "@tiptap/core";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { IIIFNotebook } from "../src/notebook/Notebook";
import {
  applyNotebookSteps,
  appendNotebookResourceSteps,
  getNotebookSchema,
  type NotebookAcceptedSteps,
  type NotebookCheckpoint,
} from "../src/notebook/document";
import {
  createNotebookStepBinding,
  type NotebookStepBinding,
} from "../src/notebook/steps";
import {
  applyNotebookContentSnapshot,
  createNotebook,
  getNotebookContentSnapshot,
} from "../src/notebook/store";
import type { NotebookPresence } from "../src/notebook/presence";
import { captureEditorAnchor } from "../src/tiptap/editor-anchor";

it("mounts two stock editors, rebases, undoes local work and preserves edits across detach", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const leftStore = createNotebook({ storageKey: false });
  const note = leftStore.getState().createNote(undefined, "Shared note");
  const rightStore = createNotebook({
    storageKey: false,
    initialNotes: [note],
  });
  let checkpoint: NotebookCheckpoint = {
    schemaVersion: 1,
    version: 0,
    content: note.content,
  };
  let leftEditor: Editor | undefined;
  let rightEditor: Editor | undefined;
  const makeBinding = (
    store: typeof leftStore,
    setEditor: (editor: Editor) => void,
  ) => {
    const binding = createNotebookStepBinding(checkpoint, {
      onConfirmedChange(value) {
        applyNotebookContentSnapshot(store, {
          version: 1,
          notes: [{ ...note, content: value.content }],
        });
      },
    });
    return {
      ...binding,
      attach(editor: Editor) {
        setEditor(editor);
        return binding.attach?.(editor);
      },
    };
  };
  const left = makeBinding(leftStore, (editor) => {
    leftEditor = editor;
  });
  const right = makeBinding(rightStore, (editor) => {
    rightEditor = editor;
  });
  function accept(
    sender: NotebookStepBinding,
    attached: NotebookStepBinding[] = [left, right],
  ) {
    const batch = sender.getPending()!;
    checkpoint = applyNotebookSteps(checkpoint, batch);
    const accepted: NotebookAcceptedSteps = {
      ...batch,
      clientIds: batch.steps.map(() => sender.clientId),
    };
    attached.forEach((binding) =>
      expect(binding.receive(accepted)).toBe("applied"),
    );
    return accepted;
  }
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  const render = (
    showLeft = true,
    editable = true,
    presence?: NotebookPresence,
  ) =>
    root.render(
      <StrictMode>
        {showLeft && (
          <IIIFNotebook
            notebook={leftStore}
            noteId={note.id}
            singleNote
            bindEditor={() => left}
          />
        )}
        <IIIFNotebook
          notebook={rightStore}
          noteId={note.id}
          singleNote
          bindEditor={() => right}
          capabilities={{ editContent: editable }}
          presence={presence}
        />
      </StrictMode>,
    );
  try {
    await act(async () => render());
    expect(leftEditor?.schema.topNodeType.spec.content).toBe(
      getNotebookSchema().topNodeType.spec.content,
    );
    expect(Object.keys(leftEditor!.schema.nodes)).toEqual(
      Object.keys(getNotebookSchema().nodes),
    );
    expect(Object.keys(leftEditor!.schema.marks)).toEqual(
      Object.keys(getNotebookSchema().marks),
    );
    await act(async () => {
      leftEditor!.commands.insertContentAt(1, "First");
      rightEditor!.commands.insertContentAt(1, "Second");
      expect(left.toConfirmedSelection({ anchor: 6, head: 6 })).toEqual({
        anchor: 1,
        head: 1,
        version: 0,
      });
      expect(leftStore.getState().notes[0].content).toBe(note.content);
      const first = accept(left);
      expect(right.receive(first)).toBe("duplicate");
      expect(left.receive({ ...first, version: 8 })).toBe("gap");
      accept(right);
    });
    expect(leftEditor!.getText()).toContain("First");
    expect(leftEditor!.getText()).toContain("Second");
    expect(left.getDraft()).toEqual(right.getDraft());
    expect(left.mapPeerSelection({ anchor: 1, head: 1, version: 0 })).toEqual({
      anchor: 12,
      head: 12,
    });
    expect(
      left.mapPeerSelection({ anchor: 1, head: 1, version: 9 }),
    ).toBeNull();
    await act(async () => {
      expect(leftEditor!.commands.undo()).toBe(true);
      accept(left);
    });
    expect(leftEditor!.getText()).toBe("Second");
    expect(rightEditor!.getText()).toBe("Second");
    await act(async () => {
      leftEditor!.commands.insertContentAt(1, "Draft ");
      render(false, false);
    });
    expect(left.getPending()).not.toBeNull();
    await act(async () => {
      expect(rightEditor!.isEditable).toBe(false);
      rightEditor!.view.dispatch(
        rightEditor!.state.tr.insertText("Blocked", 1),
      );
      expect(right.getPending()).toBeNull();
      accept(left);
      render(true, false);
    });
    expect(leftEditor!.getText()).toBe("Draft Second");
    expect(rightEditor!.getText()).toBe("Draft Second");
    expect(left.getPending()).toBeNull();
    expect(getNotebookContentSnapshot(rightStore).notes[0].content).toEqual(
      checkpoint.content,
    );
    expect(container.querySelector(".iiif-notebook__sidebar")).toBeNull();
    await act(async () =>
      render(true, false, {
        noteId: note.id,
        peers: [
          {
            id: "left",
            label: "First participant",
            color: "#6348be",
            anchor: 1,
            head: 5,
          },
        ],
      }),
    );
    expect(
      container.querySelector(".iiif-notebook__peer-cursor")?.textContent,
    ).toBe("First participant");
    expect(
      container.querySelector(".iiif-notebook__peer-selection"),
    ).not.toBeNull();
    await act(async () => render(true, false));
    expect(container.querySelector(".iiif-notebook__peer-cursor")).toBeNull();
    await act(async () => {
      const url = "https://example.org/iiif/image";
      const batch = appendNotebookResourceSteps(
        checkpoint,
        {
          id: url,
          source: url,
          image: url,
          label: "A shared image",
          type: "Image",
        },
        true,
      );
      checkpoint = applyNotebookSteps(checkpoint, batch);
      for (const binding of [left, right]) {
        binding.receive({
          ...batch,
          clientIds: batch.steps.map(() => "authority"),
        });
        expect(binding.getDraft()).toEqual(checkpoint.content);
        expect(binding.getUnconfirmed()).toBeNull();
      }
    });
    await act(async () => {
      const anchor = captureEditorAnchor(leftEditor!, 7, 13);
      leftEditor!.commands.insertContentAt(1, "XYZ ");
      expect(anchor.resolve()).toEqual({ from: 11, to: 17 });
      leftEditor!.commands.deleteRange({ from: 10, to: 17 });
      expect(anchor.resolve()).toBeNull();
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

it("journals complete drafts and acknowledges bounded prefixes", () => {
  const checkpoint: NotebookCheckpoint = {
    schemaVersion: 1,
    version: 0,
    content: { type: "doc", content: [{ type: "paragraph" }] },
  };
  const steps = ["A", "B"].map((text, index) => ({
    stepType: "replace",
    from: index + 1,
    to: index + 1,
    slice: { content: [{ type: "text", text }] },
  }));
  const binding = createNotebookStepBinding(checkpoint, {
    clientId: "journaled",
    initialPending: { version: 0, steps },
    limits: { maxBatchSteps: 1 },
  });
  expect(binding.getUnconfirmed()).toEqual({ version: 0, steps });
  const first = binding.getPending()!;
  expect(first.steps).toEqual(steps.slice(0, 1));
  expect(binding.receive({ ...first, clientIds: [binding.clientId] })).toBe(
    "applied",
  );
  expect(binding.getPending()).toEqual({ version: 1, steps: steps.slice(1) });
  expect(binding.getDraft().content?.[0]?.content?.[0]?.text).toBe("AB");
});
