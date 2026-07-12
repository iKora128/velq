import { redo, undo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { useFiles } from "@/store/files";

/** Route undo/redo to whatever surface is focused: the rendered-HTML editor (the
 * preview iframe's contentEditable) or CodeMirror when the cursor is inside them,
 * otherwise the file manager. Mirrors VSCode/Finder behaviour — the native ⌘Z menu
 * item forwards here so the right history is touched. Without the iframe branch,
 * ⌘Z while editing a rendered page fell through to file-manager undo (and ate the
 * keystroke), so rendered editing had no working undo. */
export function routeUndo(isRedo: boolean): void {
  const el = document.activeElement;
  // Focus inside the rendered-HTML editor surfaces as the <iframe> element here.
  if (el instanceof HTMLIFrameElement && el.classList.contains("preview-iframe")) {
    const idoc = el.contentDocument;
    if (idoc?.body?.isContentEditable) {
      // execCommand fires `input`, so the edit round-trips back to source as usual.
      idoc.execCommand(isRedo ? "redo" : "undo");
      el.contentWindow?.focus();
      return;
    }
  }
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
