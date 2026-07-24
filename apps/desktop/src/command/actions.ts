import {
  BookOpen,
  Bot,
  Code,
  Columns2,
  Eye,
  FileCode,
  FileDown,
  FilePlus,
  FolderOpen,
  FolderPlus,
  type LucideIcon,
  Moon,
  Package,
  PanelLeft,
  Printer,
  Puzzle,
  Redo2,
  RefreshCw,
  Rows3,
  Save,
  Search,
  Terminal,
  Undo2,
} from "lucide-react";
import { exportActive } from "@/export/exporters";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import type { MsgKey } from "@/i18n";
import { dirOf, pickSaveFile } from "@/ipc/dialog";
import { renderMarkdown } from "@/ipc/render";
import { revealInOs, writeFileContent } from "@/ipc/vault";
import { saveVersion } from "@/ipc/vcs";
import { saveVelqIndex, saveVelqMd } from "@/ipc/velq";
import { useAcp } from "@/store/acp";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { usePalette } from "@/store/palette";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { checkForUpdates } from "@/update/updater";

export interface Action {
  id: string;
  titleKey: MsgKey; // i18n key; the palette translates it at render (reactive to language)
  hint?: string; // logical shortcut, e.g. "Mod+S"
  icon?: LucideIcon;
  run: () => void;
}

/** Is `path` inside the vault rooted at `root`? Only vault files get save history. */
function isUnder(path: string, root: string): boolean {
  const r = root.endsWith("/") ? root : `${root}/`;
  return path === root || path.startsWith(r);
}

/** A filesystem-safe file stem from a scratch's first heading (else "Untitled"). */
function scratchTitle(content: string): string {
  const m = content.match(/^\s*#\s+(.+)$/m);
  const raw = (m?.[1] ?? "").replace(/[#*`_]/g, "").trim();
  return (
    (raw || "Untitled")
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 60)
      .trim() || "Untitled"
  );
}

/** Saving an untitled scratch = "Save As" a plain file: the quick note becomes a
 * real `.md` (or `.html`) on disk — never a `.velq` (packaging is an explicit share
 * step). Opens the saved file so further saves write straight to it. */
async function saveScratchAsFile(scratchId: string, content: string, language: string) {
  const root = useVault.getState().root?.path ?? null;
  const ext = language === "html" ? "html" : "md";
  const path = await pickSaveFile(`${scratchTitle(content)}.${ext}`, ext, root);
  if (!path) return; // cancelled
  try {
    if (root && isUnder(path, root)) await saveVersion(root, path, content);
    else await writeFileContent(path, content);
    useDoc.getState().markSaved();
    if (root && isUnder(path, root)) await useFiles.getState().loadDir(dirOf(path));
    await useDoc.getState().openByPath(path);
    useDoc.getState().close(scratchId);
  } catch (e) {
    console.error("save scratch failed", e);
  }
}

/** Save the active document to disk. A file inside the open vault records a real
 * version in the save history; a file OUTSIDE it (e.g. HTML extracted from a
 * `.velq`, edited in place) is still written to disk — just without history — so
 * edits are never silently lost when there's no vault. An untitled scratch is
 * saved as a new `.velq`. */
async function saveActive() {
  const { doc, content, markSaved } = useDoc.getState();
  if (!doc) return;
  // A view-only document (a PDF) has no editable content — saving "" would wipe the
  // file on disk. Nothing to persist.
  if (doc.viewer) return;
  // An untitled scratch: "save" means "Save As" a plain .md/.html.
  if (!doc.path) {
    await saveScratchAsFile(doc.id, content, doc.language);
    return;
  }
  const root = useVault.getState().root?.path;
  try {
    if (doc.velqSource) {
      // A Markdown package: re-render to HTML and store BOTH (edit source + view).
      // An HTML package: store the edited HTML. Either way, back into the .velq.
      if (doc.language === "markdown") {
        await saveVelqMd(doc.velqSource, content, await renderMarkdown(content));
      } else {
        await saveVelqIndex(doc.velqSource, content);
      }
    } else if (root && isUnder(doc.path, root)) {
      await saveVersion(root, doc.path, content); // writes + records a version
    } else {
      await writeFileContent(doc.path, content); // plain save, no history
    }
    // Only clear "Editing" if nothing changed while the save was in flight and
    // we're still on the same document — otherwise edits typed during the save (or
    // another tab's) would be stranded as "saved" and never written.
    if (useDoc.getState().content === content) markSaved();
  } catch (e) {
    console.error("save failed", e);
  }
}

/** Create a new document in the user's chosen format — a plain `.md` or `.html`
 * in the open folder, or an in-memory scratch when no folder is open. This is the
 * one creation path the UI, the palette, and (later) an ACP agent all funnel into. */
function newDocument(format: "md" | "html" = "md") {
  const v = useVault.getState();
  if (v.root) {
    const f = useFiles.getState();
    void f.newFile(f.targetDir(), format);
  } else {
    useDoc.getState().openScratch(format);
  }
}

export const ACTIONS: Action[] = [
  {
    id: "new-doc",
    titleKey: "action.newDoc",
    hint: "Mod+N",
    icon: FilePlus,
    run: () => newDocument("md"),
  },
  {
    id: "new-doc-html",
    titleKey: "action.newDocHtml",
    icon: FileCode,
    run: () => newDocument("html"),
  },
  {
    id: "new-folder",
    titleKey: "action.newFolder",
    hint: "Mod+Shift+N",
    icon: FolderPlus,
    run: () => {
      const f = useFiles.getState();
      if (useVault.getState().root) void f.newFolder(f.targetDir());
    },
  },
  {
    id: "open-folder",
    titleKey: "action.openFolder",
    icon: FolderOpen,
    run: () => void useVault.getState().open(),
  },
  { id: "save", titleKey: "action.save", hint: "Mod+S", icon: Save, run: () => void saveActive() },
  {
    id: "undo-file",
    titleKey: "action.undoFile",
    hint: "Mod+Z",
    icon: Undo2,
    run: () => void useFiles.getState().undo(),
  },
  {
    id: "redo-file",
    titleKey: "action.redoFile",
    hint: "Mod+Shift+Z",
    icon: Redo2,
    run: () => void useFiles.getState().redo(),
  },
  {
    id: "view-source",
    titleKey: "action.viewSource",
    icon: Code,
    run: () => useSettings.getState().update({ editorMode: "source" }),
  },
  {
    id: "view-split",
    titleKey: "action.viewSplit",
    icon: Columns2,
    run: () => useSettings.getState().update({ editorMode: "split" }),
  },
  {
    id: "view-live",
    titleKey: "action.viewLive",
    icon: Eye,
    run: () => useSettings.getState().update({ editorMode: "live" }),
  },
  {
    id: "view-preview",
    titleKey: "action.viewPreview",
    icon: BookOpen,
    run: () => useSettings.getState().update({ editorMode: "preview" }),
  },
  {
    id: "assistant",
    titleKey: "action.assistant",
    hint: "Mod+J",
    icon: Bot,
    run: () => useAcp.getState().toggle(),
  },
  {
    id: "toggle-theme",
    titleKey: "action.toggleTheme",
    icon: Moon,
    run: () => useSettings.getState().toggleTheme(),
  },
  {
    id: "toggle-sidebar",
    titleKey: "action.toggleSidebar",
    hint: "Mod+\\",
    icon: PanelLeft,
    run: () => useUI.getState().toggleSidebar(),
  },
  {
    id: "toggle-vim",
    titleKey: "action.toggleVim",
    icon: Terminal,
    run: () => useSettings.getState().update({ vimMode: !useSettings.getState().vimMode }),
  },
  {
    id: "toggle-density",
    titleKey: "action.toggleDensity",
    icon: Rows3,
    run: () => {
      const s = useSettings.getState();
      s.update({ density: s.density === "compact" ? "comfortable" : "compact" });
    },
  },
  {
    id: "reveal",
    titleKey: "action.reveal",
    icon: FolderOpen,
    run: () => {
      const p = useDoc.getState().doc?.path;
      if (p) void revealInOs(p);
    },
  },
  {
    id: "search-all",
    titleKey: "action.searchAll",
    hint: "Mod+Shift+F",
    icon: Search,
    run: () => usePalette.getState().openWith(""),
  },
  {
    id: "package-html",
    titleKey: "action.packageHtml",
    icon: Package,
    run: () => void openHtmlAndPackage(),
  },
  {
    id: "export-velq",
    titleKey: "action.exportVelq",
    icon: Package,
    run: () => exportActive("velq"),
  },
  {
    id: "export-html",
    titleKey: "action.exportHtml",
    icon: FileDown,
    run: () => exportActive("html"),
  },
  {
    id: "export-md",
    titleKey: "action.exportMd",
    icon: FileDown,
    run: () => exportActive("markdown"),
  },
  { id: "export-pdf", titleKey: "action.exportPdf", icon: Printer, run: () => exportActive("pdf") },
  {
    id: "plugins",
    titleKey: "action.plugins",
    icon: Puzzle,
    run: () => usePalette.getState().togglePlugins(),
  },
  {
    id: "check-updates",
    titleKey: "action.checkUpdates",
    icon: RefreshCw,
    run: () => void checkForUpdates(true),
  },
];

export { newDocument, saveActive };
