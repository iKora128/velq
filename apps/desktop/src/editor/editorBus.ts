import type { EditorView } from "@codemirror/view";

/** A tiny channel so the command palette can drive the active editor (jump to a
 * line / heading) without threading the EditorView through React. The most recently
 * mounted editor is the primary one. */
let view: EditorView | null = null;

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export const editorBus = {
  setView(v: EditorView) {
    view = v;
  },
  clear(v: EditorView) {
    if (view === v) view = null;
  },
  goToLine(lineNumber: number) {
    if (!view) return;
    const total = view.state.doc.lines;
    const line = view.state.doc.line(Math.max(1, Math.min(lineNumber, total)));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  },
  headings(): Heading[] {
    if (!view) return [];
    const out: Heading[] = [];
    const doc = view.state.doc;
    for (let i = 1; i <= doc.lines; i++) {
      const text = doc.line(i).text;
      const m = /^(#{1,6})\s+(.*)$/.exec(text);
      if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i });
    }
    return out;
  },
};
