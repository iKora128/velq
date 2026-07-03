import { type DragEvent, useRef, useState } from "react";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";

/** The paths being dragged — the whole selection, or just the grabbed item.
 * Module-wide because only one drag happens at a time and `dataTransfer` can't be
 * read during `dragover`. */
let dragSet: string[] = [];

function parentDir(p: string): string {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : p;
}

/** Can the drag land in folder `dir`? Blocks dropping onto a dragged folder or into
 * its own subtree, and requires at least one item to actually change folder. */
function canDrop(set: string[], dir: string): boolean {
  if (set.length === 0) return false;
  if (!set.every((s) => s !== dir && !dir.startsWith(`${s}/`))) return false;
  return set.some((s) => parentDir(s) !== dir);
}

/**
 * Shared drag-and-drop for every file view (tree, icon grid, list, columns): drag a
 * file or folder onto a folder to **move** it there — hold Alt/Option to **copy**.
 * Dragging an item that's part of the current multi-selection moves the whole
 * selection; dragging an unselected item grabs just it (and selects it). Reuses the
 * store's undoable `moveMany`/`copyMany`; no backend change.
 *
 *   const { dropTarget, dragProps, dropProps } = useFileDnd();
 *   <Row {...dragProps(node)} {...(isDir && dropProps(node.path, onSpring))}
 *        className={dropTarget === node.path ? "is-drop" : ""} />
 */
export function useFileDnd() {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const spring = useRef(0);

  const clearDrop = () => {
    setDropTarget(null);
    window.clearTimeout(spring.current);
  };

  /** Spread onto any file/folder to make it a drag source. */
  const dragProps = (node: FileNode, disabled = false) => ({
    draggable: !disabled,
    onDragStart: (e: DragEvent) => {
      const sel = useFiles.getState().selection;
      if (sel.has(node.path) && sel.size > 1) {
        dragSet = [...sel]; // drag the whole selection
      } else {
        useFiles.getState().select(node); // dragging an unselected item grabs just it
        dragSet = [node.path];
      }
      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData("text/plain", dragSet.join("\n"));
    },
    onDragEnd: () => {
      dragSet = [];
      clearDrop();
    },
  });

  /** Spread onto a folder (or any directory path — a breadcrumb, a column) to make
   * it a drop target. `onSpring` fires after a short hover so the view can spring-load
   * (expand or navigate into) the folder, Finder-style. */
  const dropProps = (dir: string, onSpring?: () => void) => ({
    onDragOver: (e: DragEvent) => {
      if (!canDrop(dragSet, dir)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
      if (dropTarget !== dir) {
        setDropTarget(dir);
        window.clearTimeout(spring.current);
        if (onSpring) spring.current = window.setTimeout(onSpring, 600);
      }
    },
    onDragLeave: () => {
      if (dropTarget === dir) clearDrop();
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const set = dragSet;
      clearDrop();
      if (!canDrop(set, dir)) return;
      if (e.altKey) void useFiles.getState().copyMany(set, dir);
      else void useFiles.getState().moveMany(set, dir);
    },
  });

  return { dropTarget, dragProps, dropProps, clearDrop };
}
