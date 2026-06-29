import {
  Code,
  Columns2,
  Eye,
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
import { revealInOs } from "@/ipc/vault";
import { saveVersion } from "@/ipc/vcs";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { usePalette } from "@/store/palette";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { checkForUpdates } from "@/update/updater";

export interface Action {
  id: string;
  title: string;
  hint?: string; // logical shortcut, e.g. "Mod+S"
  icon?: LucideIcon;
  run: () => void;
}

/** Save the active document to disk (path-backed docs only; git commit is layered
 * on at M11). */
async function saveActive() {
  const { doc, content, markSaved } = useDoc.getState();
  const root = useVault.getState().root?.path;
  if (!doc?.path || !root) return;
  try {
    await saveVersion(root, doc.path, content); // writes + records a version
    markSaved();
  } catch (e) {
    console.error("save failed", e);
  }
}

function newDocument() {
  const v = useVault.getState();
  if (v.root) {
    const f = useFiles.getState();
    void f.newFile(f.targetDir());
  } else {
    useDoc.getState().openScratch();
  }
}

export const ACTIONS: Action[] = [
  { id: "new-doc", title: "New document", hint: "Mod+N", icon: FilePlus, run: newDocument },
  {
    id: "new-folder",
    title: "New folder",
    hint: "Mod+Shift+N",
    icon: FolderPlus,
    run: () => {
      const f = useFiles.getState();
      if (useVault.getState().root) void f.newFolder(f.targetDir());
    },
  },
  {
    id: "open-folder",
    title: "Open folder…",
    icon: FolderOpen,
    run: () => void useVault.getState().open(),
  },
  { id: "save", title: "Save", hint: "Mod+S", icon: Save, run: () => void saveActive() },
  {
    id: "undo-file",
    title: "Undo file change",
    hint: "Mod+Z",
    icon: Undo2,
    run: () => void useFiles.getState().undo(),
  },
  {
    id: "redo-file",
    title: "Redo file change",
    hint: "Mod+Shift+Z",
    icon: Redo2,
    run: () => void useFiles.getState().redo(),
  },
  {
    id: "view-source",
    title: "View: Source",
    icon: Code,
    run: () => useSettings.getState().update({ editorMode: "source" }),
  },
  {
    id: "view-split",
    title: "View: Split",
    icon: Columns2,
    run: () => useSettings.getState().update({ editorMode: "split" }),
  },
  {
    id: "view-live",
    title: "View: Live preview",
    icon: Eye,
    run: () => useSettings.getState().update({ editorMode: "live" }),
  },
  {
    id: "toggle-theme",
    title: "Toggle dark / light",
    icon: Moon,
    run: () => useSettings.getState().toggleTheme(),
  },
  {
    id: "toggle-sidebar",
    title: "Toggle sidebar",
    hint: "Mod+\\",
    icon: PanelLeft,
    run: () => useUI.getState().toggleSidebar(),
  },
  {
    id: "toggle-vim",
    title: "Toggle Vim mode",
    icon: Terminal,
    run: () => useSettings.getState().update({ vimMode: !useSettings.getState().vimMode }),
  },
  {
    id: "toggle-density",
    title: "Toggle density (comfortable / compact)",
    icon: Rows3,
    run: () => {
      const s = useSettings.getState();
      s.update({ density: s.density === "compact" ? "comfortable" : "compact" });
    },
  },
  {
    id: "reveal",
    title: "Reveal in Finder",
    icon: FolderOpen,
    run: () => {
      const p = useDoc.getState().doc?.path;
      if (p) void revealInOs(p);
    },
  },
  {
    id: "search-all",
    title: "Search all files…",
    hint: "Mod+Shift+F",
    icon: Search,
    run: () => usePalette.getState().openWith(""),
  },
  {
    id: "package-html",
    title: "Open HTML & package to .velq…",
    icon: Package,
    run: () => void openHtmlAndPackage(),
  },
  { id: "export-velq", title: "Export to .velq", icon: Package, run: () => exportActive("velq") },
  { id: "export-html", title: "Export to HTML", icon: FileDown, run: () => exportActive("html") },
  {
    id: "export-md",
    title: "Export to Markdown",
    icon: FileDown,
    run: () => exportActive("markdown"),
  },
  { id: "export-pdf", title: "Export to PDF", icon: Printer, run: () => exportActive("pdf") },
  {
    id: "plugins",
    title: "Plugins…",
    icon: Puzzle,
    run: () => usePalette.getState().togglePlugins(),
  },
  {
    id: "check-updates",
    title: "Check for updates…",
    icon: RefreshCw,
    run: () => void checkForUpdates(true),
  },
];

export { newDocument, saveActive };
