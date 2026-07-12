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
  /** Filesystem create time (ms); falls back to mtime. Used to rank "recently added". */
  created: number;
  gitStatus: GitDot;
  hasChildren: boolean;
}

/** One entry in the "Recently opened" list (a Finder-style Recents). */
export interface RecentDoc {
  path: string;
  name: string;
  openedAt: number;
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
/** Markdown preview look — see `@/preview/previewStyles`. */
export type PreviewTemplate = "paper" | "docs" | "note" | "magazine" | "tech" | "sky" | "glass";
/** Where a .velq opens: a tab in the main window, or its own window. */
export type VelqOpenIn = "tab" | "window";

/** One open tab persisted for session restore (W5). */
export interface SessionTab {
  path: string;
  preview: boolean;
  pinned: boolean;
  mode?: EditorMode | null;
}
export type FileView = "grid" | "list" | "columns" | "tree";
/** The editor's left panel view mode: an outline tree, Finder columns, or an icon grid. */
export type SidebarView = "tree" | "columns" | "icons";
/** UI language preference; "system" follows the OS language. Resolved to a concrete
 * locale by `resolveLocale` in `@/i18n`. */
export type LocalePref = "system" | "en" | "ja";

export interface Settings {
  theme: ThemePref;
  density: Density;
  editorMode: EditorMode;
  fileView: FileView;
  /** The editor's left panel: outline tree, Finder columns, or icon grid. */
  sidebarView: SidebarView;
  vimMode: boolean;
  showLineNumbers: boolean;
  proseFont: boolean;
  spellcheck: boolean;
  /** Template for rendered Markdown: preview, Quick Look, HTML/PDF export. */
  previewTemplate: PreviewTemplate;
  velqOpenIn: VelqOpenIn;
  /** One-shot: the "this page is directly editable" hint was shown. */
  hintedRenderedEdit: boolean;
  /** UI language. */
  locale: LocalePref;
  lastVault: string | null;
  /** Folder the last export was saved to — the Save dialog starts here next time. */
  lastExportDir: string | null;
  /** HTML dropped onto the window auto-packages into Documents/Velq. Opening —
   * from the OS or inside Velq — always views/edits; packaging never rides along. */
  autoPackageHtml: boolean;
  /** Most-recently-opened documents, newest first (for the Home "Recents"). */
  recentDocs: RecentDoc[];
  /** Open tabs from the last session (W5), restored on a plain launch. */
  sessionTabs: SessionTab[];
  sessionActive: string | null;
  sessionSecondary: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  density: "comfortable",
  editorMode: "live",
  fileView: "grid",
  sidebarView: "tree",
  vimMode: false,
  showLineNumbers: false,
  proseFont: true,
  spellcheck: false,
  previewTemplate: "paper",
  velqOpenIn: "tab",
  hintedRenderedEdit: false,
  locale: "system",
  lastVault: null,
  lastExportDir: null,
  autoPackageHtml: false,
  recentDocs: [],
  sessionTabs: [],
  sessionActive: null,
  sessionSecondary: null,
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
