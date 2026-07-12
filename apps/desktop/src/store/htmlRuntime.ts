import { create } from "zustand";
import { containsScript } from "@/preview/scriptRuntime";

/**
 * Whether a given HTML document runs its own scripts in the editable preview.
 * The default is "run them when the page has any" — a deck or self-building page
 * only lays out correctly with its JS alive. This is a per-document, session-only
 * override (not a persisted setting): the user can silence a page's scripts for
 * the inert view, or wake them on a page that had none by default. Keyed by doc
 * id, so switching tabs keeps each page's choice.
 */
interface HtmlRuntimeState {
  overrides: Record<string, boolean>;
  /** Whether the rendered HTML page is in EDIT mode (per doc). Off by default: an
   * HTML page opens as a normal page you look at; pressing "編集/Edit" turns it into
   * an editing surface with an unmistakable on-state. No more silently-editable
   * pages where you can't tell whether a keystroke will change the file. */
  editing: Record<string, boolean>;
  setRunScripts: (docId: string, run: boolean) => void;
  setEditing: (docId: string, on: boolean) => void;
}

export const useHtmlRuntime = create<HtmlRuntimeState>((set) => ({
  overrides: {},
  editing: {},
  setRunScripts: (docId, run) => set((s) => ({ overrides: { ...s.overrides, [docId]: run } })),
  setEditing: (docId, on) => set((s) => ({ editing: { ...s.editing, [docId]: on } })),
}));

/** Is this doc currently in edit mode? Off unless explicitly turned on. */
export function isEditing(editing: Record<string, boolean>, docId: string | undefined): boolean {
  return docId ? (editing[docId] ?? false) : false;
}

/** The effective choice for a document: an explicit override, else auto (on when
 * the source carries a `<script>`). Pure, so both the hook and plain reads share it. */
export function effectiveRunScripts(
  overrides: Record<string, boolean>,
  docId: string | undefined,
  source: string,
): boolean {
  const override = docId ? overrides[docId] : undefined;
  return override ?? containsScript(source);
}
