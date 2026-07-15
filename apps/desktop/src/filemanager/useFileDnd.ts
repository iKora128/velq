import type { PointerEvent as ReactPointerEvent } from "react";
import { create } from "zustand";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";

/**
 * Drag-and-drop for every file view (tree, icon grid, list, columns): drag a file or
 * folder onto a folder to **move** it there — hold Alt/Option to **copy**. Dragging an
 * item that's part of the current multi-selection moves the whole selection; dragging
 * an unselected item grabs just it (and selects it). Reuses the store's undoable
 * `moveMany`/`copyMany`; no backend change.
 *
 * Built on pointer events rather than HTML5 drag-and-drop **on purpose**: the window
 * runs with `dragDropEnabled: true` so the OS can drop files onto us (that's what makes
 * "drop an HTML file to get a .velq" work), and Tauri's native handler switches DOM
 * drag-and-drop off wholesale in exchange. `draggable` + `ondragstart` never fire, so
 * we track the press ourselves.
 *
 *   const { dropTarget, dragProps, dropProps } = useFileDnd();
 *   <Row {...dragProps(node)} {...(isDir && dropProps(node.path, onSpring))}
 *        className={dropTarget === node.path ? "is-drop" : ""} />
 */

/** Live drag, shared by every view: the sidebar tree and the main browser are mounted
 * together, and a drag started in one has to be able to land in the other. */
interface DragState {
  paths: string[];
  target: string | null;
}
const useDrag = create<DragState>(() => ({ paths: [], target: null }));

/** Spring-load callbacks by folder path, refreshed as each view renders. A stale entry
 * is harmless: its row is gone, so the hit-test can never reach it. */
const springs = new Map<string, () => void>();

const THRESHOLD = 4; // px of movement before a press becomes a drag (vs. a click)
const SPRING_MS = 600;

function parentDir(p: string): string {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : p;
}

/** Can the drag land in folder `dir`? Blocks dropping onto a dragged folder or into
 * its own subtree, and requires at least one item to actually change folder. */
export function canDrop(set: string[], dir: string): boolean {
  if (set.length === 0) return false;
  if (!set.every((s) => s !== dir && !dir.startsWith(`${s}/`))) return false;
  return set.some((s) => parentDir(s) !== dir);
}

/** The folder under the cursor, or null. The ghost is `pointer-events: none`, so it
 * never shadows the row beneath it. */
function dirAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  return el?.closest<HTMLElement>("[data-drop-dir]")?.dataset.dropDir ?? null;
}

function makeGhost(label: string, count: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "drag-ghost";
  el.textContent = count > 1 ? `${label} + ${count - 1}` : label;
  document.body.appendChild(el);
  return el;
}

/** Swallow the click that a completed drag would otherwise fire — releasing over a
 * folder must not also select or open the row you started from. */
function swallowNextClick() {
  const kill = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", kill, { capture: true, once: true });
  // Nothing to swallow if the pointer never produced a click.
  window.setTimeout(() => window.removeEventListener("click", kill, { capture: true }), 0);
}

/** Exported for tests: drives one press through to a move/copy. */
export function startPress(x0: number, y0: number, node: FileNode) {
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let spring = 0;
  let shown: string | null = null;

  const stop = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey);
    window.clearTimeout(spring);
    ghost?.remove();
    document.body.classList.remove("is-dragging-files");
    useDrag.setState({ paths: [], target: null });
    if (dragging) swallowNextClick();
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) {
      if (Math.abs(e.clientX - x0) < THRESHOLD && Math.abs(e.clientY - y0) < THRESHOLD) return;
      dragging = true;
      const sel = useFiles.getState().selection;
      let paths: string[];
      if (sel.has(node.path) && sel.size > 1) {
        paths = [...sel]; // drag the whole selection
      } else {
        useFiles.getState().select(node); // dragging an unselected item grabs just it
        paths = [node.path];
      }
      useDrag.setState({ paths, target: null });
      ghost = makeGhost(node.name, paths.length);
      document.body.classList.add("is-dragging-files");
    }
    if (ghost) ghost.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;

    const { paths } = useDrag.getState();
    const dir = dirAt(e.clientX, e.clientY);
    const next = dir && canDrop(paths, dir) ? dir : null;
    if (next !== shown) {
      shown = next;
      useDrag.setState({ target: next });
      window.clearTimeout(spring);
      const load = next ? springs.get(next) : undefined;
      if (load) spring = window.setTimeout(load, SPRING_MS);
    }
    if (ghost) {
      if (e.altKey && next) ghost.dataset.copy = "";
      else delete ghost.dataset.copy;
    }
  };

  const onUp = (e: PointerEvent) => {
    const { paths, target } = useDrag.getState();
    const drop = dragging && target && canDrop(paths, target) ? target : null;
    const copy = e.altKey;
    stop();
    if (!drop) return;
    if (copy) void useFiles.getState().copyMany(paths, drop);
    else void useFiles.getState().moveMany(paths, drop);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") stop();
  };

  // The pointer being taken away (leaving the window, a system gesture) must not leave
  // a ghost stuck to the screen and the listeners live.
  const onCancel = () => stop();

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);
}

export function useFileDnd() {
  const dropTarget = useDrag((s) => s.target);

  /** Spread onto any file/folder to make it a drag source. */
  const dragProps = (node: FileNode, disabled = false) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (disabled || e.button !== 0) return;
      startPress(e.clientX, e.clientY, node);
    },
  });

  /** Spread onto a folder (or any directory path — a breadcrumb, a column) to make it a
   * drop target. `onSpring` fires after a short hover so the view can spring-load
   * (expand or navigate into) the folder, Finder-style. */
  const dropProps = (dir: string, onSpring?: () => void) => {
    if (onSpring) springs.set(dir, onSpring);
    else springs.delete(dir);
    return { "data-drop-dir": dir };
  };

  return {
    dropTarget,
    dragProps,
    dropProps,
    clearDrop: () => useDrag.setState({ target: null }),
  };
}
