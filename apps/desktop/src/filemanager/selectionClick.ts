import type { MouseEvent } from "react";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";

/**
 * Apply a click's selection intent, Finder-style:
 * - **Cmd/Ctrl-click** toggles the item in the selection,
 * - **Shift-click** selects the range from the anchor to it (within `ordered`),
 * - a **plain click** selects just it.
 *
 * Returns `true` only for a plain click, so the caller can then do its normal
 * open/navigate; a modifier-click changes the selection and nothing else.
 */
export function clickSelect(e: MouseEvent, node: FileNode, ordered: FileNode[]): boolean {
  const files = useFiles.getState();
  if (e.metaKey || e.ctrlKey) {
    files.toggleSelect(node);
    return false;
  }
  if (e.shiftKey) {
    files.rangeSelectTo(node, ordered);
    return false;
  }
  files.select(node);
  return true;
}
