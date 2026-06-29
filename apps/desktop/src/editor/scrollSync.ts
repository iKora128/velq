import type { EditorView } from "@codemirror/view";

/**
 * Line-anchor scroll sync (plan §8.4): the editor drives the preview. We read the
 * editor's top visible line, find the two preview blocks (comrak `data-sourcepos`)
 * that bracket it, and interpolate the preview scroll between their offsets. A
 * proportional/percentage sync drifts badly around images, tables and code; anchors
 * don't.
 */
interface Anchor {
  line: number;
  top: number;
}

export function linkEditorToPreview(view: EditorView, iframe: HTMLIFrameElement): () => void {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) return () => {};

  let anchors: Anchor[] = [];
  const rebuild = () => {
    anchors = Array.from(doc.querySelectorAll<HTMLElement>("[data-sourcepos]"))
      .map((el) => {
        const m = (el.getAttribute("data-sourcepos") || "").match(/^(\d+):/);
        return { line: m ? Number.parseInt(m[1], 10) : 1, top: el.offsetTop };
      })
      .sort((a, b) => a.line - b.line);
  };
  rebuild();

  const interpolate = (line: number): number => {
    if (anchors.length === 0) return 0;
    if (line <= anchors[0].line) return anchors[0].top;
    const last = anchors[anchors.length - 1];
    if (line >= last.line) return last.top;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (line >= a.line && line < b.line) {
        const f = (line - a.line) / Math.max(1, b.line - a.line);
        return a.top + f * (b.top - a.top);
      }
    }
    return last.top;
  };

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const rect = view.scrollDOM.getBoundingClientRect();
      const pos = view.posAtCoords({ x: rect.left + 8, y: rect.top + 6 });
      const topLine = pos != null ? view.state.doc.lineAt(pos).number : 1;
      win.scrollTo({ top: Math.max(0, interpolate(topLine)) });
    });
  };

  view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
  // Layout changes (content edits, image loads) move the anchors — rebuild.
  const ro = new ResizeObserver(rebuild);
  if (doc.body) ro.observe(doc.body);

  return () => {
    view.scrollDOM.removeEventListener("scroll", onScroll);
    ro.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}
