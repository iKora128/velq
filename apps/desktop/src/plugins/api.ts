import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/**
 * The public plugin surface (plan §11). A plugin contributes CM6 extensions
 * (decorations / view plugins / keymaps — the same machinery the live preview uses)
 * and optional palette commands. The core editor knows nothing about any specific
 * plugin; KaTeX and Mermaid ship as reference plugins built only on this API.
 *
 * Plugins are Apache-2.0-exempt: authors license them as they choose.
 */
export interface VelqPlugin {
  id: string;
  name: string;
  description?: string;
  /** CM6 extension(s) contributed to the editor. */
  extension?: Extension;
  /** Commands surfaced in the command palette. */
  commands?: PluginCommand[];
}

export interface PluginCommand {
  id: string;
  title: string;
  run: (view: EditorView | null) => void;
}
