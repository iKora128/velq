import { closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching, foldKeymap, indentOnInput } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  rectangularSelection,
} from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { livePreview } from "./livePreview";
import { velqEditorTheme, velqSyntax } from "./theme";

/** Runtime-switchable slots. Reconfigure these; never recreate the view. */
export const langCompartment = new Compartment();
export const keymapModeCompartment = new Compartment(); // vim on/off
export const liveCompartment = new Compartment(); // live-preview decorations on/off
export const themeCompartment = new Compartment(); // reserved for editor themes (M18)

// "velq" tabs never reach CodeMirror (EditorPane shows the package viewer),
// but they live in the same Doc type.
export type Lang = "markdown" | "html" | "velq";

export function langExtension(lang: Lang): Extension {
  if (lang === "html") return html({ matchClosingTags: true, autoCloseTags: true });
  return markdown({ base: markdownLanguage, addKeymap: true });
}

/** Live-preview decorations, only meaningful for markdown. */
export function liveExtension(on: boolean, lang: Lang): Extension {
  return on && lang === "markdown" ? livePreview() : [];
}

/** Vim must sit ahead of the default keymap, hence its own compartment up top. */
export function vimExtension(enabled: boolean): Extension {
  return enabled ? vim({ status: true }) : [];
}

/** Everything that doesn't change at runtime. */
export function coreExtensions(): Extension[] {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    highlightSpecialChars(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    themeCompartment.of([]),
    velqEditorTheme,
    velqSyntax,
  ];
}
