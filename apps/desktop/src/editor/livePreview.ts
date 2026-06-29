import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import "./livePreview.css";

/**
 * Single-pane live preview (plan §8.4 / D3). A ViewPlugin walks the markdown syntax
 * tree over the *visible* ranges and emits decorations: it hides the syntax markers
 * (`#`, `**`, `` ` ``…) and styles the content, so `**bold**` reads as **bold**. The
 * line(s) the selection touches reveal their raw markers, so editing stays direct.
 * The file on disk is never changed — this is presentation only.
 */

class HrWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-live-hr";
    return el;
  }
  ignoreEvent() {
    return true;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
  ) {
    super();
  }
  eq(o: CheckboxWidget) {
    return o.checked === this.checked && o.pos === this.pos;
  }
  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "cm-live-task";
    box.setAttribute("aria-label", "Toggle task");
    box.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.pos + 1, to: this.pos + 2, insert: this.checked ? " " : "x" },
      });
    });
    return box;
  }
  ignoreEvent(e: Event) {
    return e.type !== "mousedown";
  }
}

const HEADINGS = new Set([
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
]);
const INLINE_MARK = new Set(["EmphasisMark", "CodeMark", "StrikethroughMark"]);

function decorate(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const { state } = view;
  const tree = syntaxTree(state);

  // Lines touched by any selection range stay "raw" (editable).
  const activeLines = new Set<number>();
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number;
    const b = state.doc.lineAt(r.to).number;
    for (let l = a; l <= b; l++) activeLines.add(l);
  }
  const isActive = (pos: number) => activeLines.has(state.doc.lineAt(pos).number);
  const hide = (from: number, to: number) => {
    if (to > from) decos.push(Decoration.replace({}).range(from, to));
  };
  const mark = (from: number, to: number, cls: string) => {
    if (to > from) decos.push(Decoration.mark({ class: cls }).range(from, to));
  };
  const lineClass = (pos: number, cls: string) =>
    decos.push(Decoration.line({ class: cls }).range(state.doc.lineAt(pos).from));

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        const active = isActive(node.from);

        if (HEADINGS.has(name)) {
          lineClass(node.from, `cm-live-h cm-live-h${name.slice(-1)}`);
          return;
        }
        switch (name) {
          case "HeaderMark": {
            if (!active) {
              let end = node.to;
              if (state.doc.sliceString(end, end + 1) === " ") end += 1;
              hide(node.from, end);
            }
            break;
          }
          case "StrongEmphasis":
            mark(node.from, node.to, "cm-live-strong");
            break;
          case "Emphasis":
            mark(node.from, node.to, "cm-live-em");
            break;
          case "InlineCode":
            mark(node.from, node.to, "cm-live-code");
            break;
          case "Strikethrough":
            mark(node.from, node.to, "cm-live-strike");
            break;
          case "Blockquote":
            // Style each quoted line; QuoteMarks are hidden individually below.
            for (let p = node.from; p <= node.to; ) {
              const line = state.doc.lineAt(p);
              decos.push(Decoration.line({ class: "cm-live-quote" }).range(line.from));
              if (line.to + 1 > node.to) break;
              p = line.to + 1;
            }
            break;
          case "QuoteMark":
            if (!active) {
              let end = node.to;
              if (state.doc.sliceString(end, end + 1) === " ") end += 1;
              hide(node.from, end);
            }
            break;
          case "FencedCode": {
            // Give the whole block a code-card background; the ``` fences (CodeMark)
            // are hidden by the inline-mark rule and the language tag below.
            for (let p = node.from; p <= node.to; ) {
              const line = state.doc.lineAt(p);
              decos.push(Decoration.line({ class: "cm-live-codeblock" }).range(line.from));
              if (line.to + 1 > node.to) break;
              p = line.to + 1;
            }
            break;
          }
          case "CodeInfo":
            if (!active) hide(node.from, node.to);
            break;
          case "Link":
            mark(node.from, node.to, "cm-live-link");
            break;
          case "URL":
          case "LinkTitle":
            if (!active) hide(node.from, node.to);
            break;
          case "LinkMark":
            if (!active) hide(node.from, node.to);
            break;
          case "TaskMarker":
            if (!active) {
              const checked = /\[[xX]\]/.test(state.doc.sliceString(node.from, node.to));
              decos.push(
                Decoration.replace({ widget: new CheckboxWidget(checked, node.from) }).range(
                  node.from,
                  node.to,
                ),
              );
            }
            break;
          case "HorizontalRule":
            if (!active) {
              decos.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to));
            }
            break;
          default:
            if (INLINE_MARK.has(name) && !active) hide(node.from, node.to);
        }
      },
    });
  }
  return Decoration.set(decos, true);
}

const livePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorate(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        this.decorations = decorate(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export function livePreview(): Extension {
  return [livePlugin];
}
