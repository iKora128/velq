import { type EditorState, type Range, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view";
import mermaid from "mermaid";
import "./plugins.css";
import type { VelqPlugin } from "../api";

let seq = 0;

/** Mermaid bakes colours into the SVG at render time, so pick the palette that
 * matches the resolved app theme right before each render. */
function applyTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  const dark =
    attr === "dark" ||
    (attr !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: dark ? "dark" : "default",
  });
}

class MermaidWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }
  eq(o: MermaidWidget) {
    return o.code === this.code;
  }
  get estimatedHeight() {
    return 140;
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-mermaid";
    seq += 1;
    applyTheme();
    mermaid
      .render(`velq-mermaid-${seq}`, this.code)
      .then(({ svg }) => {
        wrap.innerHTML = svg;
      })
      .catch(() => {
        wrap.classList.add("cm-mermaid--err");
        wrap.textContent = "Couldn't render this diagram.";
      });
    return wrap;
  }
  ignoreEvent() {
    return false;
  }
}

// A block widget replaces whole lines (and the line breaks between them), so it
// must come from a StateField — view plugins may not replace line breaks.
function buildMermaid(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const active = new Set<number>();
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number;
    const b = state.doc.lineAt(r.to).number;
    for (let l = a; l <= b; l++) active.add(l);
  }

  const doc = state.doc;
  let i = 1;
  while (i <= doc.lines) {
    const line = doc.line(i);
    if (/^```mermaid\s*$/.test(line.text.trim())) {
      let j = i + 1;
      const code: string[] = [];
      while (j <= doc.lines && doc.line(j).text.trim() !== "```") {
        code.push(doc.line(j).text);
        j += 1;
      }
      if (j <= doc.lines) {
        let isActive = false;
        for (let k = i; k <= j; k++) if (active.has(k)) isActive = true;
        if (!isActive && code.length) {
          decos.push(
            Decoration.replace({
              widget: new MermaidWidget(code.join("\n")),
              block: true,
            }).range(line.from, doc.line(j).to),
          );
        }
        i = j + 1;
        continue;
      }
    }
    i += 1;
  }
  return Decoration.set(decos, true);
}

// Fired when the app theme flips, to re-render diagrams with the new palette.
const retheme = StateEffect.define<null>();

const mermaidField = StateField.define<DecorationSet>({
  create: (state) => buildMermaid(state),
  update(deco, tr) {
    if (tr.docChanged || tr.selection || tr.effects.some((e) => e.is(retheme)))
      return buildMermaid(tr.state);
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Watch <html data-theme> and ask the field to rebuild when it changes.
const themeWatcher = ViewPlugin.fromClass(
  class {
    obs: MutationObserver;
    constructor(view: EditorView) {
      this.obs = new MutationObserver(() => view.dispatch({ effects: retheme.of(null) }));
      this.obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
    destroy() {
      this.obs.disconnect();
    }
  },
);

export const mermaidPluginDef: VelqPlugin = {
  id: "mermaid",
  name: "Mermaid",
  description: "Render fenced mermaid blocks as diagrams.",
  extension: [mermaidField, themeWatcher],
};
