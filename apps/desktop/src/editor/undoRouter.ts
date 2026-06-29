import { redo, undo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { useFiles } from "@/store/files";

/** Route undo/redo to whatever surface is focused: the editor (CodeMirror) when the
 * cursor is inside it, otherwise the file manager. Mirrors VSCode/Finder behaviour —
 * the native ⌘Z menu item forwards here so the right history is touched. */
export function routeUndo(isRedo: boolean): void {
  const el = document.activeElement;
  const cmEl = el instanceof HTMLElement ? el.closest(".cm-editor") : null;
  if (cmEl) {
    const view = EditorView.findFromDOM(cmEl as HTMLElement);
    if (view) {
      (isRedo ? redo : undo)(view);
      view.focus();
      return;
    }
  }
  if (isRedo) void useFiles.getState().redo();
  else void useFiles.getState().undo();
}
