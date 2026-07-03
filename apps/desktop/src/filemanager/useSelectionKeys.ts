import { useEffect, useRef } from "react";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, .cm-editor, [contenteditable='true']")
  );
}

/**
 * Selection keyboard for a file view:
 * - **Cmd/Ctrl+A** selects everything in `ordered` (the view's visible items),
 * - **Delete / Backspace** moves the selection to Trash (deletes go to the OS Trash
 *   and are undoable, and this only fires in the file browser — never while typing —
 *   so it's safe without a modifier),
 * - **Esc** clears the selection.
 *
 * Only one file-browser view is mounted at a time, so a single window listener is
 * enough; the selection it acts on is global, so it's correct regardless of focus.
 */
export function useSelectionKeys(ordered: FileNode[]) {
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const files = useFiles.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "a" || e.key === "A")) {
        if (orderedRef.current.length) {
          e.preventDefault();
          files.selectAll(orderedRef.current);
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (files.selection.size > 0) {
          e.preventDefault();
          void files.removeSelected();
        }
      } else if (e.key === "Escape") {
        if (files.selection.size > 0) files.clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
