import { create } from "zustand";
import type { Lang } from "@/editor/extensions";
import { isHtmlPath, packageAndStage } from "@/export/htmlPackage";
import { t } from "@/i18n";
import type { FileNode } from "@/ipc/types";
import { readFile } from "@/ipc/vault";
import { saveVersion } from "@/ipc/vcs";
import { openVelqViewer } from "@/ipc/velq";
import { countWords } from "@/util/text";
import { useSettings } from "./settings";
import { useToast } from "./toast";
import { useUI } from "./ui";
import { useVault } from "./vault";

/** Document identity/metadata. The live text lives in its Tab (so switching tabs
 * never drops edits), not here. */
export interface Doc {
  id: string; // path, or "scratch:<n>" for an unsaved buffer
  path: string | null;
  name: string;
  language: Lang;
}

interface Tab {
  doc: Doc;
  content: string; // live content, updated on every change
  dirty: boolean;
  wordCount: number;
  charCount: number;
  preview: boolean; // unpinned "preview" tab — replaced on the next single-click open
  rev: number; // bumped to remount the editor after an external reload
  conflict: boolean; // file changed on disk while this tab had unsaved edits
}

interface DocState {
  tabs: Tab[];
  activeId: string | null;
  // ---- mirror of the active tab (keeps the simple selector API) ----
  doc: Doc | null;
  content: string;
  dirty: boolean;
  wordCount: number;
  charCount: number;
  rev: number;
  conflict: boolean;
  // ---- actions ----
  open: (doc: Doc, content: string, opts?: { preview?: boolean }) => void;
  openFile: (node: FileNode, opts?: { preview?: boolean }) => Promise<void>;
  /** Open an absolute path (e.g. a file association / "Open with"). */
  openByPath: (path: string) => Promise<void>;
  openScratch: () => void;
  openSample: () => void;
  openSampleHtml: () => void;
  openSamplePlugins: () => void;
  activate: (id: string) => void;
  close: (id: string) => void;
  renameDoc: (oldId: string, newPath: string, newName: string) => void;
  reportChange: (text: string) => void;
  markSaved: () => void;
  reloadTab: (path: string) => Promise<void>;
  flagConflict: (path: string) => void;
  keepMine: (path: string) => void;
}

function mirror(tabs: Tab[], activeId: string | null) {
  const t = tabs.find((x) => x.doc.id === activeId);
  return t
    ? {
        doc: t.doc,
        content: t.content,
        dirty: t.dirty,
        wordCount: t.wordCount,
        charCount: t.charCount,
        rev: t.rev,
        conflict: t.conflict,
      }
    : { doc: null, content: "", dirty: false, wordCount: 0, charCount: 0, rev: 0, conflict: false };
}

function makeTab(doc: Doc, content: string, preview: boolean): Tab {
  return {
    doc,
    content,
    dirty: false,
    wordCount: countWords(content),
    charCount: content.length,
    preview,
    rev: 0,
    conflict: false,
  };
}

export function langFromName(name: string): Lang {
  return /\.html?$/i.test(name) ? "html" : "markdown";
}

/** Turn a backend error (a string from a Tauri command) into a human message,
 * with a clear hint for the common macOS permission case. */
export function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not permitted|permission denied|os error 1\b/i.test(msg)) {
    return t("error.macPermission");
  }
  return msg;
}

let scratchSeq = 0;

export const useDoc = create<DocState>((set, get) => ({
  tabs: [],
  activeId: null,
  doc: null,
  content: "",
  dirty: false,
  wordCount: 0,
  charCount: 0,
  rev: 0,
  conflict: false,

  open: (doc, content, opts) => {
    // A real file (not a scratch/sample buffer) lands at the top of Recents.
    if (doc.path) useSettings.getState().recordRecentDoc(doc.path, doc.name);
    return set((s) => {
      const preview = opts?.preview ?? false;
      const existing = s.tabs.find((t) => t.doc.id === doc.id);
      if (existing) {
        // Re-opening pinned (e.g. double-click) promotes a preview tab to permanent.
        const tabs =
          !preview && existing.preview
            ? s.tabs.map((t) => (t.doc.id === doc.id ? { ...t, preview: false } : t))
            : s.tabs;
        return { tabs, activeId: doc.id, ...mirror(tabs, doc.id) };
      }
      const tab = makeTab(doc, content, preview);
      let tabs: Tab[];
      if (preview) {
        const idx = s.tabs.findIndex((t) => t.preview);
        if (idx >= 0) {
          tabs = s.tabs.slice();
          tabs[idx] = tab;
        } else {
          tabs = [...s.tabs, tab];
        }
      } else {
        tabs = [...s.tabs, tab];
      }
      return { tabs, activeId: doc.id, ...mirror(tabs, doc.id) };
    });
  },

  openFile: async (node, opts) => {
    // A .velq opens in its own isolated viewer, not as editable text.
    if (/\.velq$/i.test(node.name)) {
      try {
        await openVelqViewer(node.path);
        useSettings.getState().recordRecentDoc(node.path, node.name);
        useToast.getState().push(t("toast.openedInViewer", { name: node.name }));
      } catch (e) {
        console.error("open_velq_viewer failed", e);
      }
      return;
    }
    // A file opened from Velq's own browser is always editable — packaging to
    // `.velq` is an explicit action (command palette / "Package an HTML file" /
    // Export), never a side effect of opening.
    try {
      const fc = await readFile(node.path);
      get().open(
        { id: node.path, path: node.path, name: node.name, language: langFromName(node.name) },
        fc.content,
        { preview: opts?.preview ?? true },
      );
    } catch (e) {
      console.error("read_file failed", node.path, e);
      useToast.getState().push(t("toast.cantOpen", { name: node.name, error: describeError(e) }));
    }
  },

  openByPath: async (path) => {
    const name = path.split(/[/\\]/).pop() ?? path;
    if (/\.velq$/i.test(name)) {
      try {
        await openVelqViewer(path);
        useSettings.getState().recordRecentDoc(path, name);
        useToast.getState().push(t("toast.openedInViewer", { name }));
      } catch (e) {
        console.error("open_velq_viewer failed", e);
      }
      return;
    }
    if (isHtmlPath(name) && useSettings.getState().autoPackageHtml) {
      await packageAndStage(path);
      return;
    }
    try {
      const fc = await readFile(path);
      // Pinned (not preview): a file the user explicitly asked the OS to open.
      get().open({ id: path, path, name, language: langFromName(name) }, fc.content);
    } catch (e) {
      console.error("openByPath failed", path, e);
      useToast.getState().push(t("toast.cantOpen", { name, error: describeError(e) }));
    }
  },

  openScratch: () => {
    scratchSeq += 1;
    get().open(
      { id: `scratch:${scratchSeq}`, path: null, name: "Untitled", language: "markdown" },
      "# Untitled\n\nStart writing…\n",
    );
  },

  openSample: () =>
    get().open(
      { id: "sample:meeting-notes", path: null, name: "Meeting notes.md", language: "markdown" },
      SAMPLE_MARKDOWN,
    ),

  openSampleHtml: () =>
    get().open(
      { id: "sample:release-notes", path: null, name: "Release notes.html", language: "html" },
      SAMPLE_HTML,
    ),

  openSamplePlugins: () =>
    get().open(
      { id: "sample:plugins", path: null, name: "Plugins.md", language: "markdown" },
      SAMPLE_PLUGINS,
    ),

  activate: (id) => set((s) => ({ activeId: id, ...mirror(s.tabs, id) })),

  close: (id) => {
    // Flush unsaved edits before the tab (and its in-memory content) disappears —
    // closing must never silently drop work. Autosave keeps this to a last-moment
    // save; it also records the closing state in history.
    const closing = get().tabs.find((t) => t.doc.id === id);
    if (closing?.dirty && closing.doc.path) {
      const root = useVault.getState().root?.path;
      if (root) void saveVersion(root, closing.doc.path, closing.content);
    }
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.doc.id === id);
      if (idx < 0) return {};
      const tabs = s.tabs.filter((t) => t.doc.id !== id);
      let activeId = s.activeId;
      if (activeId === id) {
        const next = tabs[idx] ?? tabs[idx - 1] ?? null;
        activeId = next ? next.doc.id : null;
      }
      return { tabs, activeId, ...mirror(tabs, activeId) };
    });
    // Closing your last document takes you home to the file browser (not a blank editor).
    if (get().tabs.length === 0 && useUI.getState().view === "editor") {
      useUI.getState().setView("explorer");
    }
  },

  renameDoc: (oldId, newPath, newName) =>
    set((s) => {
      if (!s.tabs.some((t) => t.doc.id === oldId)) return {};
      const tabs = s.tabs.map((t) =>
        t.doc.id === oldId
          ? {
              ...t,
              doc: {
                ...t.doc,
                id: newPath,
                path: newPath,
                name: newName,
                language: langFromName(newName),
              },
            }
          : t,
      );
      const activeId = s.activeId === oldId ? newPath : s.activeId;
      return { tabs, activeId, ...mirror(tabs, activeId) };
    }),

  reportChange: (text) =>
    set((s) => {
      // Editing pins the tab (no longer a throwaway preview).
      const tabs = s.tabs.map((t) =>
        t.doc.id === s.activeId
          ? {
              ...t,
              content: text,
              dirty: true,
              preview: false,
              wordCount: countWords(text),
              charCount: text.length,
            }
          : t,
      );
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  markSaved: () =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.doc.id === s.activeId ? { ...t, dirty: false } : t));
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  reloadTab: async (path) => {
    if (!get().tabs.some((t) => t.doc.path === path)) return;
    try {
      const fc = await readFile(path);
      set((s) => {
        const tabs = s.tabs.map((t) => {
          if (t.doc.path !== path) return t;
          // Identical bytes (e.g. an echoed save that slipped past the self-write
          // window) → just clear the flags; bumping rev would remount the editor.
          if (t.content === fc.content) return { ...t, dirty: false, conflict: false };
          return {
            ...t,
            content: fc.content,
            rev: t.rev + 1,
            dirty: false,
            conflict: false,
            wordCount: countWords(fc.content),
            charCount: fc.content.length,
          };
        });
        return { tabs, ...mirror(tabs, s.activeId) };
      });
    } catch (e) {
      console.error("reload failed", e);
    }
  },

  flagConflict: (path) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.doc.path === path ? { ...t, conflict: true } : t));
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  keepMine: (path) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.doc.path === path ? { ...t, conflict: false } : t));
      return { tabs, ...mirror(tabs, s.activeId) };
    }),
}));

/** A GFM-complete sample used by the welcome flow and the screenshot loop. */
export const SAMPLE_MARKDOWN = `# Meeting notes

A calm place to write **Markdown** and *HTML* — with \`inline code\`,
[links](https://velq.sh), and everything GFM.

## What changed

- [x] Live preview as you type
- [x] Save history, no git knowledge required
- [ ] Package to \`.velq\`

> Velq keeps your files as plain Markdown on disk — open them anywhere.

| Format | Offline | Editable |
| ------ | :-----: | :------: |
| .md    |   yes   |   yes    |
| .velq  |   yes   |   yes    |

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Footnotes work too.[^1]

[^1]: Like this one.
`;

const FENCE = "```";
/** Demonstrates the plugin API: KaTeX math + a Mermaid diagram. */
export const SAMPLE_PLUGINS = `# Plugins

Velq's plugins are CodeMirror extensions. Two ship as references — toggle them in **Plugins**.

Inline math like $E = mc^2$ renders as you type, and display math:

$$\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}$$

A diagram, from a fenced \`mermaid\` block:

${FENCE}mermaid
flowchart LR
  A[Write] --> B[Save]
  B --> C{Package}
  C -->|.velq| D[Share offline]
${FENCE}

Put the cursor on any line to edit its raw source.
`;

/** A small self-contained HTML doc (inline styles) for the HTML edit/preview demo. */
export const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Release notes</title>
    <style>
      body { font: 16px/1.6 system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; color: #1f2328; }
      h1 { letter-spacing: -0.02em; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 999px;
               background: #2563eb; color: #fff; font-size: 13px; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.25rem; margin: 1rem 0; }
    </style>
  </head>
  <body>
    <span class="badge">v1.0</span>
    <h1>Velq is here</h1>
    <p>Package any HTML — styles and all — into a single offline <code>.velq</code> file.</p>
    <div class="card">
      <strong>Offline by default.</strong>
      <p>CDN dependencies are collected so the document works with no network.</p>
    </div>
  </body>
</html>
`;
