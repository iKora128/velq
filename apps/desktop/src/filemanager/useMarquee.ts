import { useEffect, useRef, useState } from "react";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";

/** The marquee rectangle in the container's content coordinates (so it scrolls
 * with the content), or null when no drag is in progress. */
export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const THRESHOLD = 4; // px of movement before a press becomes a marquee (vs a click)

/**
 * Rubber-band (marquee) selection for a scrollable grid: press on empty space and
 * drag a rectangle — every tile it touches is selected live. Holding Shift/Cmd/Ctrl
 * adds to the current selection; a bare click on empty space clears it. Tiles are
 * matched by their `data-path` attribute, resolved against `nodes`.
 *
 * Returns the rectangle to render as an overlay (or null).
 */
export function useMarquee(container: HTMLElement | null, nodes: FileNode[]): MarqueeRect | null {
  const [rect, setRect] = useState<MarqueeRect | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (!container) return;
    let drag: { x: number; y: number; base: string[]; additive: boolean; moved: boolean } | null =
      null;
    let lastKey = "";

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Start only on empty space — never on a tile, button, link or input.
      if ((e.target as HTMLElement).closest("button, a, input, label")) return;
      e.preventDefault(); // no text selection while sweeping
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      drag = {
        x: e.clientX,
        y: e.clientY,
        base: additive ? [...useFiles.getState().selection] : [],
        additive,
        moved: false,
      };
    };

    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const left = Math.min(drag.x, e.clientX);
      const top = Math.min(drag.y, e.clientY);
      const w = Math.abs(e.clientX - drag.x);
      const h = Math.abs(e.clientY - drag.y);
      if (!drag.moved && w < THRESHOLD && h < THRESHOLD) return;
      drag.moved = true;

      const cr = container.getBoundingClientRect();
      setRect({
        x: left - cr.left + container.scrollLeft,
        y: top - cr.top + container.scrollTop,
        w,
        h,
      });

      // Which tiles does the rectangle (client coords) intersect?
      const byPath = new Map(nodesRef.current.map((n) => [n.path, n]));
      const hits = new Map<string, FileNode>();
      for (const p of drag.base) {
        const n = byPath.get(p);
        if (n) hits.set(p, n);
      }
      for (const el of container.querySelectorAll<HTMLElement>("[data-path]")) {
        const r = el.getBoundingClientRect();
        if (r.left < left + w && r.right > left && r.top < top + h && r.bottom > top) {
          const p = el.dataset.path;
          const n = p ? byPath.get(p) : undefined;
          if (n) hits.set(n.path, n);
        }
      }
      const key = [...hits.keys()].sort().join("\n");
      if (key !== lastKey) {
        lastKey = key;
        useFiles.getState().setSelection([...hits.values()]);
      }
    };

    const onUp = () => {
      if (drag && !drag.moved && !drag.additive) {
        // A plain click on empty space clears the selection.
        if (useFiles.getState().selection.size > 0) useFiles.getState().clearSelection();
      }
      drag = null;
      lastKey = "";
      setRect(null);
    };

    container.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      container.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [container]);

  return rect;
}
