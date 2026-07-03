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
import type { MsgKey } from "@/i18n";
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
  titleKey: MsgKey; // i18n key; the palette translates it at render (reactive to language)
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
    // Only clear "Editing" if nothing changed while the save was in flight and
    // we're still on the same document — otherwise edits typed during the save (or
    // another tab's) would be stranded as "saved" and never written.
    if (useDoc.getState().content === content) markSaved();
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
  { id: "new-doc", titleKey: "action.newDoc", hint: "Mod+N", icon: FilePlus, run: newDocument },
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
