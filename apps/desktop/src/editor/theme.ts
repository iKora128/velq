import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * One theme, driven entirely by CSS custom properties, so toggling the app's
 * light/dark (which flips `data-theme` on <html>) re-colors the editor with no
 * compartment swap. Font is read from `--editor-font` set on the host element.
 */
export const velqEditorTheme = EditorView.theme({
  "&": {
    color: "var(--text)",
    backgroundColor: "transparent",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--editor-font, var(--font-prose))",
    fontSize: "var(--prose-size)",
    lineHeight: "var(--leading-prose)",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "var(--cm-cursor)",
    padding: "var(--space-6) 0 40vh",
    maxWidth: "var(--prose-measure)",
    marginInline: "auto",
  },
  "&.cm-editor.cm-focused": { outline: "none" },
  ".cm-line": { padding: "0 var(--space-7)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cm-cursor)", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--cm-selection)",
  },
  ".cm-activeLine": { backgroundColor: "var(--cm-active-line)" },
  ".cm-selectionMatch": { backgroundColor: "var(--accent-subtle)" },
  ".cm-searchMatch": {
    backgroundColor: "var(--cm-search)",
    borderRadius: "var(--radius-sm)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--cm-search-active)" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--text-muted)", border: "none" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--surface-active)",
    border: "none",
    color: "var(--text-secondary)",
  },
  // Search / goto panels
  ".cm-panels": {
    backgroundColor: "var(--surface-elevated)",
    color: "var(--text)",
    borderTop: "1px solid var(--border-subtle)",
  },
  ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontFamily: "var(--font-ui)" },
  ".cm-textfield": {
    backgroundColor: "var(--surface-sunken)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
  },
  ".cm-button": {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    backgroundImage: "none",
    color: "var(--text)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
    color: "var(--text)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--text-on-accent)",
  },
});

/** Markdown / code syntax colors — calm, marker-muted (iA Writer-like). */
export const velqHighlight = HighlightStyle.define([
  { tag: t.heading, color: "var(--cm-heading)", fontWeight: "700" },
  { tag: t.heading1, color: "var(--cm-heading)", fontWeight: "700", fontSize: "1.5em" },
  { tag: t.heading2, color: "var(--cm-heading)", fontWeight: "700", fontSize: "1.3em" },
  { tag: t.heading3, color: "var(--cm-heading)", fontWeight: "700", fontSize: "1.15em" },
  { tag: t.strong, fontWeight: "700", color: "var(--cm-emphasis)" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--cm-emphasis)" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--text-muted)" },
  { tag: [t.processingInstruction, t.meta], color: "var(--cm-marker)" },
  { tag: [t.link, t.url], color: "var(--cm-link)", textDecoration: "underline" },
  { tag: t.quote, color: "var(--cm-quote)", fontStyle: "italic" },
  { tag: [t.list, t.contentSeparator], color: "var(--cm-list)" },
  {
    tag: [t.monospace],
    color: "var(--cm-code-fg)",
    backgroundColor: "var(--cm-code-bg)",
    borderRadius: "3px",
    fontFamily: "var(--font-mono)",
  },
  { tag: t.keyword, color: "var(--cm-keyword)" },
  { tag: [t.string, t.special(t.string)], color: "var(--cm-string)" },
  { tag: [t.tagName], color: "var(--cm-tag)" },
  { tag: [t.attributeName], color: "var(--cm-keyword)" },
  { tag: [t.comment], color: "var(--text-muted)", fontStyle: "italic" },
  { tag: [t.number, t.bool, t.atom], color: "var(--cm-keyword)" },
  { tag: t.invalid, color: "var(--danger)" },
]);

export const velqSyntax = syntaxHighlighting(velqHighlight, { fallback: true });
