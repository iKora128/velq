import { EditorView } from "@codemirror/view";

/**
 * GitHub Primer colors for @codemirror/merge, with non-color redundancy (WCAG 1.4.1):
 * deletions are struck through and both sides carry a +/− gutter symbol. The exact
 * tokens come from the design layer (light/dark aware).
 */
export const mergeDiffTheme = EditorView.theme({
  ".cm-merge-a, .cm-merge-b": { backgroundColor: "transparent" },

  ".cm-changedLine": {
    backgroundColor: "var(--diff-add-line-bg)",
    position: "relative",
  },
  ".cm-changedLine::before": {
    content: '"+"',
    position: "absolute",
    left: "10px",
    color: "var(--success)",
    fontWeight: "700",
    fontFamily: "var(--font-mono)",
  },
  ".cm-changedText": {
    backgroundColor: "var(--diff-add-word-bg)",
    backgroundImage: "none",
    borderRadius: "2px",
  },

  ".cm-deletedChunk": {
    backgroundColor: "var(--diff-del-line-bg)",
    color: "var(--diff-text)",
    paddingLeft: "var(--space-7)",
  },
  ".cm-deletedChunk .cm-deletedLine": {
    position: "relative",
  },
  ".cm-deletedChunk .cm-deletedLine::before": {
    content: '"\\2212"',
    position: "absolute",
    left: "-22px",
    color: "var(--danger)",
    fontWeight: "700",
    fontFamily: "var(--font-mono)",
  },
  ".cm-deletedText": {
    backgroundColor: "var(--diff-del-word-bg)",
    textDecoration: "line-through",
  },

  ".cm-changeGutter": { width: "0" },
  ".cm-mergeControl": { display: "none" },
});
