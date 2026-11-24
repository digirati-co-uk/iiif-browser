import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { NotebookSelection } from "./binding";

export interface NotebookPeerSelection extends NotebookSelection {
  id: string;
  label: string;
  /** A six-digit CSS hex color. */
  color: string;
}

export interface NotebookPresence {
  noteId: string;
  /** Host-mapped positions in this editor's current document. */
  peers: readonly NotebookPeerSelection[];
}

const presenceKey = new PluginKey<DecorationSet>("notebookPresence");

export function notebookPresencePlugin() {
  return new Plugin({
    key: presenceKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, previous) {
        const peers: readonly NotebookPeerSelection[] | undefined =
          tr.getMeta(presenceKey);
        if (!peers) return previous.map(tr.mapping, tr.doc);
        const decorations: Decoration[] = [];
        for (const peer of peers) {
          const { anchor, head } = peer;
          if (
            ![anchor, head].every(
              (pos) =>
                Number.isSafeInteger(pos) &&
                pos >= 0 &&
                pos <= tr.doc.content.size,
            )
          )
            continue;
          const color = /^#[\da-f]{6}$/i.test(peer.color)
            ? peer.color
            : "#5d55a4";
          if (anchor !== head)
            decorations.push(
              Decoration.inline(
                Math.min(anchor, head),
                Math.max(anchor, head),
                {
                  class: "iiif-notebook__peer-selection",
                  style: `background-color: ${color}33`,
                },
              ),
            );
          decorations.push(
            Decoration.widget(
              head,
              () => {
                const cursor = document.createElement("span");
                cursor.className = "iiif-notebook__peer-cursor";
                cursor.style.setProperty("--peer-color", color);
                cursor.contentEditable = "false";
                cursor.setAttribute("aria-hidden", "true");
                const label = document.createElement("span");
                label.textContent = peer.label;
                cursor.append(label);
                return cursor;
              },
              { key: JSON.stringify([peer.id, peer.label, color]), side: 1 },
            ),
          );
        }
        return DecorationSet.create(tr.doc, decorations);
      },
    },
    props: {
      decorations: (state) => presenceKey.getState(state),
    },
  });
}

export function setNotebookPresence(
  editor: Editor,
  peers: readonly NotebookPeerSelection[],
) {
  if (editor.isDestroyed || !presenceKey.getState(editor.state)) return;
  editor.view.dispatch(editor.state.tr.setMeta(presenceKey, peers));
}
