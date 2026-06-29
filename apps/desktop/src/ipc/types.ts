/**
 * TypeScript mirrors of the Rust serde DTOs (plan §5). The Rust side uses
 * `#[serde(rename_all = "camelCase")]`, so these are camelCase.
 */

export type NodeKind = "file" | "dir";

/** Plain-language git status, shown as a colored dot (never a letter). */
export type GitDot = "none" | "new" | "edited" | "removed";

export interface FileNode {
  path: string;
  name: string;
  kind: NodeKind;
  ext: string | null;
  size: number;
  mtime: number;
  gitStatus: GitDot;
  hasChildren: boolean;
}

export interface VaultInfo {
  path: string;
  name: string;
}

export interface FileContent {
  content: string;
  encoding: string;
  mtime: number;
}

export interface FilePreview {
  node: FileNode;
  title: string | null;
  snippet: string | null;
}

export type ThemePref = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";
export type EditorMode = "source" | "split" | "live";
export type FileView = "grid" | "list" | "columns" | "tree";

export interface Settings {
  theme: ThemePref;
  density: Density;
  editorMode: EditorMode;
  fileView: FileView;
  vimMode: boolean;
  showLineNumbers: boolean;
  proseFont: boolean;
  lastVault: string | null;
  /** Folder the last export was saved to — the Save dialog starts here next time. */
  lastExportDir: string | null;
  /** Opening an HTML file auto-packages it into Documents/Velq instead of editing. */
  autoPackageHtml: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  density: "comfortable",
  editorMode: "live",
  fileView: "grid",
  vimMode: false,
  showLineNumbers: false,
  proseFont: true,
  lastVault: null,
  lastExportDir: null,
  autoPackageHtml: true,
};

/** A point in a file's save history. No git vocabulary leaks here. */
export interface Version {
  id: string;
  time: number;
  label: string | null;
  summary: string;
}

export type ChangeKind = "equal" | "insert" | "delete" | "replace";

export interface WordChange {
  kind: ChangeKind;
  text: string;
}

export interface Change {
  kind: ChangeKind;
  aRange: [number, number];
  bRange: [number, number];
  words: WordChange[];
}

export interface Manifest {
  title: string;
  created: number;
  updated: number;
  sourceUrl: string | null;
  generator: string;
  tags: string[];
  custom: unknown;
}

export interface Hit {
  path: string;
  name: string;
  line: number;
  snippet: string;
}

export interface BundleReport {
  collected: number;
  bytes: number;
  failed: { url: string; reason: string }[];
}
