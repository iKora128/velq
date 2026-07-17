import { create } from "zustand";

/**
 * Whether a given HTML document runs its own scripts in the preview.
 *
 * The default is OFF — a page's own JavaScript is a security surface (external HTML
 * could be hostile), so it never runs until the user explicitly asks. When a page
 * carries scripts the editor shows a banner offering to run it ("実行して表示"), and
 * the ⚡ toolbar toggle flips it per document. This is a per-document, session-only
 * override (not persisted), keyed by doc id so switching tabs keeps each choice.
 */
interface HtmlRuntimeState {
  /** Per-doc run-scripts choice. Absent = default (OFF, safe). */
  overrides: Record<string, boolean>;
  /** Whether the rendered HTML page is in EDIT mode (per doc). Off by default: an
   * HTML page opens as a normal page you look at; pressing "編集/Edit" turns it into
   * an editing surface with an unmistakable on-state. */
  editing: Record<string, boolean>;
  /** Docs whose "run scripts?" banner the user dismissed — don't nag again. */
  promptDismissed: Record<string, boolean>;
  setRunScripts: (docId: string, run: boolean) => void;
  setEditing: (docId: string, on: boolean) => void;
  dismissScriptPrompt: (docId: string) => void;
}

export const useHtmlRuntime = create<HtmlRuntimeState>((set) => ({
  overrides: {},
  editing: {},
  promptDismissed: {},
  setRunScripts: (docId, run) => set((s) => ({ overrides: { ...s.overrides, [docId]: run } })),
  setEditing: (docId, on) => set((s) => ({ editing: { ...s.editing, [docId]: on } })),
  dismissScriptPrompt: (docId) =>
    set((s) => ({ promptDismissed: { ...s.promptDismissed, [docId]: true } })),
}));

/** Is this doc currently in edit mode? Off unless explicitly turned on. */
export function isEditing(editing: Record<string, boolean>, docId: string | undefined): boolean {
  return docId ? (editing[docId] ?? false) : false;
}

/** Has the user dismissed the run-scripts prompt for this doc? */
export function isScriptPromptDismissed(
  dismissed: Record<string, boolean>,
  docId: string | undefined,
): boolean {
  return docId ? (dismissed[docId] ?? false) : false;
}

/**
 * The effective run-scripts choice for a document: an explicit override, else OFF —
 * the safe default, a page's JavaScript runs only when the user asks. Pure, so the
 * hook and plain reads share it. `source` is unused now (kept in the signature so
 * callers don't churn), but the decision is intentionally content-independent.
 */
export function effectiveRunScripts(
  overrides: Record<string, boolean>,
  docId: string | undefined,
  _source: string,
): boolean {
  const override = docId ? overrides[docId] : undefined;
  return override ?? false;
}
