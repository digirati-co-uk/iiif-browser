import {
  $createRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  DROP_COMMAND,
  type LexicalEditor,
} from "lexical";
import { type IIIFDropTarget, parseIIIFDrop } from "./content-state";

export function registerIIIFDrop(
  editor: LexicalEditor,
  accept: (targets: IIIFDropTarget[]) => boolean,
) {
  return editor.registerCommand(
    DROP_COMMAND,
    (event) => {
      if (!editor.isEditable() || !event.dataTransfer) return false;
      const targets = parseIIIFDrop(event.dataTransfer.getData("text/plain"));
      if (!targets) return false;
      const doc = editor.getRootElement()?.ownerDocument;
      const range = doc?.caretRangeFromPoint?.(event.clientX, event.clientY);
      if (range && editor.getRootElement()?.contains(range.startContainer)) {
        const selection = $createRangeSelection();
        selection.applyDOMRange(range);
        $setSelection(selection);
      }
      if (!accept(targets)) return false;
      event.preventDefault();
      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}
