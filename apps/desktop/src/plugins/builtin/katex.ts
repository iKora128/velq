import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./plugins.css";
import type { VelqPlugin } from "../api";

class MathWidget extends WidgetType {
  constructor(
    readonly tex: string,
    readonly block: boolean,
  ) {
    super();
  }
  eq(o: MathWidget) {
    return o.tex === this.tex && o.block === this.block;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = this.block ? "cm-math cm-math--block" : "cm-math";
    try {
      el.innerHTML = katex.renderToString(this.tex, {
        throwOnError: false,
        displayMode: this.block,
      });
    } catch {
      el.textContent = this.tex;
    }
    return el;
  }
  ignoreEvent() {
    return false;
  }
}

// Single-line only — a decoration must not replace a line break in a view plugin.
const MATH_RE = /\$\$([^$\n]+?)\$\$|\$([^$\n]+?)\$/g;

function buildMath(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const { state } = view;
  const active = new Set<number>();
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number;
    const b = state.doc.lineAt(r.to).number;
    for (let l = a; l <= b; l++) active.add(l);
  }
  for (const { from, to } of view.visibleRanges) {
    const text = state.doc.sliceString(from, to);
    MATH_RE.lastIndex = 0;
    let m: RegExpExecArray | null = MATH_RE.exec(text);
    while (m !== null) {
      const start = from + m.index;
      const end = start + m[0].length;
      if (!active.has(state.doc.lineAt(start).number)) {
        const block = m[1] !== undefined;
        const tex = (m[1] ?? m[2] ?? "").trim();
        if (tex)
          decos.push(Decoration.replace({ widget: new MathWidget(tex, block) }).range(start, end));
      }
      m = MATH_RE.exec(text);
    }
  }
  return Decoration.set(decos, true);
}

const mathPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildMath(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) this.decorations = buildMath(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

export const katexPlugin: VelqPlugin = {
  id: "katex",
  name: "KaTeX",
  description: "Render $inline$ and $$display$$ math.",
  extension: [mathPlugin],
};
