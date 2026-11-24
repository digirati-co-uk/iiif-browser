import type { Editor } from "@tiptap/core";

export interface EditorAnchor {
  resolve(): { from: number; to: number } | null;
  release(): void;
}

/** Tracks a selection or node position through local, remote and rebased transactions. */
export function captureEditorAnchor(
  editor: Editor,
  from = editor.state.selection.from,
  to = from,
  trackNode = false,
): EditorAnchor {
  let alive = true;
  const node = trackNode ? editor.state.doc.nodeAt(from) : null;
  const update: Parameters<typeof editor.on<"transaction">>[1] = ({
    transaction,
    appendedTransactions,
  }) => {
    for (const { mapping } of [transaction, ...appendedTransactions]) {
      const start = mapping.mapResult(from, 1);
      const end = from === to ? start : mapping.mapResult(to, -1);
      if (
        start.deletedAcross ||
        end.deletedAcross ||
        (node && start.deleted) ||
        start.pos > end.pos ||
        (from !== to && start.pos === end.pos)
      ) {
        release();
        return;
      }
      from = start.pos;
      to = end.pos;
    }
  };
  function release() {
    if (!alive) return;
    alive = false;
    editor.off("transaction", update);
    editor.off("destroy", release);
  }
  editor.on("transaction", update);
  editor.on("destroy", release);
  return {
    resolve() {
      if (trackNode && !node) return null;
      if (!alive || editor.isDestroyed || to > editor.state.doc.content.size)
        return null;
      if (node) {
        const current = editor.state.doc.nodeAt(from);
        if (!current || !node.sameMarkup(current)) return null;
      }
      return { from, to };
    },
    release,
  };
}
