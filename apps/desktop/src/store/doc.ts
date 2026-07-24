import { create } from "zustand";
import type { Lang } from "@/editor/extensions";
import { t } from "@/i18n";
import type { EditorMode, FileNode } from "@/ipc/types";
import { readFile } from "@/ipc/vault";
import { saveVersion } from "@/ipc/vcs";
import { openVelqViewer, readVelqDoc } from "@/ipc/velq";
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
  /** For a freshly packaged .velq tab: the source HTML it was built from, so the
   * viewer can offer "edit the original". Session-only provenance. */
  origin?: string;
  /** Set when this tab IS a `.velq` opened for editing: the package the inner HTML
   * came from. Saving writes the edited HTML back into it (never a loose file). */
  velqSource?: string;
  /** A view-only document shown by a native viewer instead of the text editor
   * (a PDF renders in the webview's built-in viewer). Its `content` stays empty —
   * saving and history don't apply. */
  viewer?: "pdf";
}

interface Tab {
  doc: Doc;
  content: string; // live content, updated on every change
  dirty: boolean;
  wordCount: number;
  charCount: number;
  preview: boolean; // unpinned "preview" tab — replaced on the next single-click open
  pinned: boolean; // W3: survives preview replacement; shown with a pin glyph
  /** W3/viewer: per-tab view override; unset tabs follow the global setting. */
  mode?: EditorMode;
  rev: number; // bumped to remount the editor after an external reload
  conflict: boolean; // file changed on disk while this tab had unsaved edits
}

/** A just-closed tab, kept so "reopen closed tab" (⌘⇧T) can bring it back exactly
 * as it was — content, per-tab view, and pinned state. Session-only, capped. */
interface ClosedTab {
  doc: Doc;
  content: string;
  mode?: EditorMode;
  pinned: boolean;
}

interface DocState {
  tabs: Tab[];
  activeId: string | null;
  /** W3: a second tab shown side-by-side to the right (null = no split). */
  secondaryId: string | null;
  /** Tab ids, most recently visited first. Closing the tab you're in hands you back
   * to the one you came from, rather than whichever tab happens to sit next to it. */
  mru: string[];
  /** Recently closed tabs (oldest→newest), so ⌘⇧T can reopen them in order. */
  closedStack: ClosedTab[];
  // ---- mirror of the active tab (keeps the simple selector API) ----
  doc: Doc | null;
  content: string;
  dirty: boolean;
  wordCount: number;
  charCount: number;
  rev: number;
  conflict: boolean;
  // ---- actions ----
  open: (
    doc: Doc,
    content: string,
    opts?: { preview?: boolean; pinned?: boolean; mode?: EditorMode },
  ) => void;
  openFile: (node: FileNode, opts?: { preview?: boolean }) => Promise<void>;
  /** Open an absolute path (e.g. a file association / "Open with"). */
  openByPath: (path: string) => Promise<void>;
  openScratch: (format?: "md" | "html") => void;
  openSample: () => void;
  openSampleHtml: () => void;
  openSamplePlugins: () => void;
  activate: (id: string) => void;
  close: (id: string) => void;
  /** Close the active tab (⌘W). No-op when nothing is open. */
  closeActive: () => void;
  /** Reopen the most recently closed tab (⌘⇧T), restoring its content. */
  reopenClosed: () => void;
  /** Move the active tab one step along the strip, wrapping at the ends
   * (⌃⇥ / ⌘⌥→ next, ⌃⇧⇥ / ⌘⌥← previous). */
  activateNext: () => void;
  activatePrev: () => void;
  /** Jump to the tab at `index` (⌘1–9); clamped to the last tab. */
  activateIndex: (index: number) => void;
  togglePin: (id: string) => void;
  setTabMode: (id: string, mode: EditorMode | null) => void;
  /** W3: show `id` beside the active tab (null closes the split). */
  setSecondary: (id: string | null) => void;
  renameDoc: (oldId: string, newPath: string, newName: string) => void;
  reportChange: (text: string) => void;
  /** Edit an arbitrary tab (the W3 secondary pane edits a non-active tab). */
  reportChangeFor: (id: string, text: string) => void;
  markSaved: () => void;
  markTabSaved: (id: string) => void;
  reloadTab: (path: string) => Promise<void>;
  flagConflict: (path: string) => void;
  keepMine: (path: string) => void;
}

/** `id` to the front of the visit history, with any tab that is no longer open dropped
 * (a preview tab replaced in place leaves its id behind otherwise). */
function touch(mru: string[], tabs: Tab[], id: string): string[] {
  const live = new Set(tabs.map((t) => t.doc.id));
  return [id, ...mru.filter((x) => x !== id && live.has(x))];
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

function makeTab(
  doc: Doc,
  content: string,
  opts: { preview: boolean; pinned?: boolean; mode?: EditorMode },
): Tab {
  return {
    doc,
    content,
    dirty: false,
    wordCount: countWords(content),
    charCount: content.length,
    preview: opts.preview && !opts.pinned,
    pinned: opts.pinned ?? false,
    mode: opts.mode,
    rev: 0,
    conflict: false,
  };
}

export function langFromName(name: string): Lang {
  if (/\.velq$/i.test(name)) return "velq";
  return /\.html?$/i.test(name) ? "html" : "markdown";
}

/** A PDF isn't text — it's opened in a view-only viewer, never read into the editor. */
export function isPdfName(name: string): boolean {
  return /\.pdf$/i.test(name);
}

/** The Doc for a view-only PDF: no content is read from disk (the viewer loads the
 * file itself), so the tab carries only its identity. */
function pdfDoc(path: string, name: string): Doc {
  return { id: path, path, name, language: "markdown", viewer: "pdf" };
}

/** Open a `.velq` the way the user prefers: a read-only tab in the main window
 * (default), or the standalone isolated viewer window. */
export async function openVelq(
  path: string,
  opts?: { forceWindow?: boolean; preview?: boolean; origin?: string },
): Promise<void> {
  const name = path.split(/[/\\]/).pop() ?? path;
  if (opts?.forceWindow || useSettings.getState().velqOpenIn === "window") {
    try {
      await openVelqViewer(path);
      useSettings.getState().recordRecentDoc(path, name);
      useToast.getState().push(t("toast.openedInViewer", { name }));
    } catch (e) {
      console.error("open_velq_viewer failed", e);
      useToast.getState().push(t("toast.cantOpen", { name, error: describeError(e) }));
    }
    return;
  }
  // A `.velq` IS the working file: open its inner document as editable (tab keeps
  // the `.velq` name + `velqSource`, so saving writes back into the package). A
  // Markdown package edits its `.md` source; an HTML package edits its HTML. The
  // read-only, full-fidelity view is the pop-out window above.
  try {
    const doc = await readVelqDoc(path);
    const language: Lang = doc.md != null ? "markdown" : "html";
    useDoc
      .getState()
      .open(
        { id: path, path, name, language, velqSource: path, origin: opts?.origin },
        doc.md ?? doc.html,
        { preview: opts?.preview ?? false },
      );
  } catch (e) {
    console.error("read_velq_doc failed", path, e);
    useToast.getState().push(t("toast.cantOpen", { name, error: describeError(e) }));
  }
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

/** How many closed tabs we remember for ⌘⇧T (like a browser's recently-closed list). */
const REOPEN_LIMIT = 12;

/** Starter content for a brand-new document. Plain files on disk — Markdown or a
 * minimal HTML skeleton — never a `.velq` (packaging is an explicit share step). */
export const NEW_MARKDOWN = "# Untitled\n\n";
export const NEW_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Untitled</title>
  </head>
  <body>
    <h1>Untitled</h1>
  </body>
</html>
`;

export const useDoc = create<DocState>((set, get) => ({
  tabs: [],
  activeId: null,
  secondaryId: null,
  mru: [],
  closedStack: [],
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
        return {
          tabs,
          activeId: doc.id,
          mru: touch(s.mru, tabs, doc.id),
          ...mirror(tabs, doc.id),
        };
      }
      // HTML is a "page you edit," so it always opens in the rendered (live) view
      // — never inheriting the Markdown/global mode. Carried as a per-tab override
      // so switching one HTML file's view never disturbs the global default (and
      // vice-versa). Markdown still follows the global setting.
      const mode = opts?.mode ?? (doc.language === "html" ? "live" : undefined);
      const tab = makeTab(doc, content, { preview, pinned: opts?.pinned, mode });
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
      return {
        tabs,
        activeId: doc.id,
        mru: touch(s.mru, tabs, doc.id),
        ...mirror(tabs, doc.id),
      };
    });
  },

  openFile: async (node, opts) => {
    // A .velq is a sealed package — viewed (in a tab by default), not edited.
    if (/\.velq$/i.test(node.name)) {
      await openVelq(node.path, { preview: opts?.preview ?? true });
      return;
    }
    // A PDF opens in the built-in viewer, not the text editor (reading its bytes as
    // text would land as garbage). The viewer loads the file straight from disk.
    if (isPdfName(node.name)) {
      get().open(pdfDoc(node.path, node.name), "", { preview: opts?.preview ?? true });
      return;
    }
    // Opening a document from the browser is a "view" first: it lands in the
    // read-only Preview (the template skin for Markdown, the page for HTML), like
    // opening a file in a viewer. Editing is one toolbar click away and the choice
    // sticks per tab. Packaging to `.velq` stays explicit — never a side effect.
    try {
      const fc = await readFile(node.path);
      get().open(
        { id: node.path, path: node.path, name: node.name, language: langFromName(node.name) },
        fc.content,
        { preview: opts?.preview ?? true, mode: "preview" },
      );
    } catch (e) {
      console.error("read_file failed", node.path, e);
      useToast.getState().push(t("toast.cantOpen", { name: node.name, error: describeError(e) }));
    }
  },

  openByPath: async (path) => {
    const name = path.split(/[/\\]/).pop() ?? path;
    if (/\.velq$/i.test(name)) {
      await openVelq(path);
      return;
    }
    // A PDF (double-click / "Open with" / drag-to-dock) opens in the viewer.
    if (isPdfName(name)) {
      get().open(pdfDoc(path, name), "");
      return;
    }
    try {
      const fc = await readFile(path);
      const language = langFromName(name);
      // Velq is a default viewer for HTML: a double-clicked page opens AS the
      // page (per-tab "live" override), like a browser that can also edit.
      // Packaging is an explicit gesture (drop / palette / export) — never a
      // side effect of opening. Not preview: the user asked the OS for it.
      get().open(
        { id: path, path, name, language },
        fc.content,
        language === "html" ? { mode: "live" } : undefined,
      );
    } catch (e) {
      console.error("openByPath failed", path, e);
      useToast.getState().push(t("toast.cantOpen", { name, error: describeError(e) }));
    }
  },

  openScratch: (format = "md") => {
    scratchSeq += 1;
    const html = format === "html";
    get().open(
      {
        id: `scratch:${scratchSeq}`,
        path: null,
        name: html ? "Untitled.html" : "Untitled",
        language: html ? "html" : "markdown",
      },
      html ? NEW_HTML : "# Untitled\n\nStart writing…\n",
      html ? { mode: "live" } : undefined,
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

  activate: (id) =>
    set((s) => ({ activeId: id, mru: touch(s.mru, s.tabs, id), ...mirror(s.tabs, id) })),

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
      // Remember the tab so ⌘⇧T can bring it back with its content intact.
      const gone = s.tabs[idx];
      const closedStack = [
        ...s.closedStack,
        { doc: gone.doc, content: gone.content, mode: gone.mode, pinned: gone.pinned },
      ].slice(-REOPEN_LIMIT);
      const tabs = s.tabs.filter((t) => t.doc.id !== id);
      const mru = s.mru.filter((x) => x !== id);
      let activeId = s.activeId;
      if (activeId === id) {
        // Hand back the tab you came from. Only when there's no history to go on
        // (a restored session, say) fall back to the neighbour beside this one.
        const back = mru.find((x) => tabs.some((t) => t.doc.id === x));
        activeId = back ?? tabs[idx]?.doc.id ?? tabs[idx - 1]?.doc.id ?? null;
      }
      const secondaryId = s.secondaryId === id ? null : s.secondaryId;
      return { tabs, activeId, secondaryId, mru, closedStack, ...mirror(tabs, activeId) };
    });
    // Closing your last document takes you home to the file browser (not a blank editor).
    if (get().tabs.length === 0 && useUI.getState().view === "editor") {
      useUI.getState().setView("explorer");
    }
  },

  closeActive: () => {
    const id = get().activeId;
    if (id) get().close(id);
  },

  reopenClosed: () => {
    const stack = get().closedStack;
    const last = stack[stack.length - 1];
    if (!last) return;
    set({ closedStack: stack.slice(0, -1) });
    // Route through `open` so recents/velq provenance/mirror all stay correct; it
    // re-activates the reopened tab. Appends at the end (like most editors).
    get().open(last.doc, last.content, { pinned: last.pinned, mode: last.mode });
  },

  activateNext: () => {
    const { tabs, activeId } = get();
    if (tabs.length < 2) return;
    const i = tabs.findIndex((t) => t.doc.id === activeId);
    const next = tabs[(Math.max(i, 0) + 1) % tabs.length];
    if (next) get().activate(next.doc.id);
  },

  activatePrev: () => {
    const { tabs, activeId } = get();
    if (tabs.length < 2) return;
    const i = tabs.findIndex((t) => t.doc.id === activeId);
    const from = i < 0 ? 0 : i;
    const prev = tabs[(from - 1 + tabs.length) % tabs.length];
    if (prev) get().activate(prev.doc.id);
  },

  activateIndex: (index) => {
    const { tabs } = get();
    if (!tabs.length) return;
    const t = tabs[Math.min(Math.max(index, 0), tabs.length - 1)];
    if (t) get().activate(t.doc.id);
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
      const secondaryId = s.secondaryId === oldId ? newPath : s.secondaryId;
      const mru = s.mru.map((x) => (x === oldId ? newPath : x));
      return { tabs, activeId, secondaryId, mru, ...mirror(tabs, activeId) };
    }),

  togglePin: (id) =>
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.doc.id === id ? { ...t, pinned: !t.pinned, preview: false } : t,
      );
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  setTabMode: (id, mode) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.doc.id === id ? { ...t, mode: mode ?? undefined } : t));
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  setSecondary: (id) =>
    set((s) => {
      if (id !== null && !s.tabs.some((t) => t.doc.id === id)) return {};
      // Splitting a tab pins it — a throwaway preview shouldn't hold a pane.
      const tabs = id
        ? s.tabs.map((t) => (t.doc.id === id ? { ...t, preview: false } : t))
        : s.tabs;
      return { tabs, secondaryId: id, ...mirror(tabs, s.activeId) };
    }),

  reportChange: (text) => get().reportChangeFor(get().activeId ?? "", text),

  reportChangeFor: (id, text) =>
    set((s) => {
      // Editing pins the tab (no longer a throwaway preview).
      const tabs = s.tabs.map((t) =>
        t.doc.id === id
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

  markSaved: () => get().markTabSaved(get().activeId ?? ""),

  markTabSaved: (id) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.doc.id === id ? { ...t, dirty: false } : t));
      return { tabs, ...mirror(tabs, s.activeId) };
    }),

  reloadTab: async (path) => {
    const target = get().tabs.find((t) => t.doc.path === path);
    if (!target) return;
    // A view-only doc (a PDF) holds no text to reload — the viewer reads the file
    // itself. Reading its bytes as a string here would only produce garbage.
    if (target.doc.viewer) return;
    try {
      // A `.velq` tab edits the package's INNER document, not the raw ZIP on disk.
      // Reading the file as bytes (`readFile`) would hand the editor the binary ZIP
      // — which lands as garbage and renders blank. Reload the inner md/html the
      // same way it was opened. (Freshly-packaged velqs echo an `fs:changed` right
      // after they open; without this the just-opened tab went white.)
      let next: string;
      if (/\.velq$/i.test(path)) {
        const vd = await readVelqDoc(path);
        next = vd.md ?? vd.html;
      } else {
        next = (await readFile(path)).content;
      }
      set((s) => {
        const tabs = s.tabs.map((t) => {
          if (t.doc.path !== path) return t;
          // Identical bytes (e.g. an echoed save that slipped past the self-write
          // window) → just clear the flags; bumping rev would remount the editor.
          if (t.content === next) return { ...t, dirty: false, conflict: false };
          return {
            ...t,
            content: next,
            rev: t.rev + 1,
            dirty: false,
            conflict: false,
            wordCount: countWords(next),
            charCount: next.length,
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
