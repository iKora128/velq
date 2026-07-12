import { Download } from "lucide-react";
import { useEffect } from "react";
import { Cheatsheet } from "@/command/Cheatsheet";
import { CommandPalette } from "@/command/CommandPalette";
import { useShortcuts } from "@/command/useShortcuts";
import { Toaster } from "@/components/Toaster";
import { useAutosave } from "@/editor/useAutosave";
import { BatchRenameDialog } from "@/filemanager/BatchRenameDialog";
import { QuickLook } from "@/filemanager/QuickLook";
import { useT } from "@/i18n/useT";
import { PluginsPanel } from "@/plugins/PluginsPanel";
import { useFiles } from "@/store/files";
import { useUI } from "@/store/ui";
import { ActivityBar } from "./ActivityBar";
import { ConvertPromptModal } from "./ConvertPromptModal";
import { EditorWorkspace } from "./EditorWorkspace";
import { ExplorerView } from "./ExplorerView";
import { PackagingOverlay } from "./PackagingOverlay";
import { SettingsView } from "./SettingsView";
import "./shell.css";
import { StatusBar } from "./StatusBar";
import { useFileDrop } from "./useFileDrop";

export function AppShell() {
  const t = useT();
  const view = useUI((s) => s.view);
  const dragging = useFileDrop();
  useShortcuts();
  useAutosave();

  // Space previews the selected file (Finder Quick Look), unless typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.closest("input, textarea, .cm-editor, [contenteditable='true']")
      )
        return;
      const { selected, quickLook, setQuickLook } = useFiles.getState();
      if (quickLook) return; // the overlay handles its own keys
      if (selected?.kind === "file") {
        e.preventDefault();
        setQuickLook(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <div className="app-frame">
        <ActivityBar />
        <main className="app-view">
          {view === "settings" ? (
            <SettingsView />
          ) : view === "explorer" ? (
            <ExplorerView />
          ) : (
            <EditorWorkspace />
          )}
        </main>
      </div>
      <StatusBar />
      <QuickLook />
      <CommandPalette />
      <Cheatsheet />
      <PluginsPanel />
      <BatchRenameDialog />
      <ConvertPromptModal />
      <PackagingOverlay />
      <Toaster />
      {dragging && (
        <div className="dropzone" aria-hidden="true">
          <div className="dropzone__card">
            <Download size={28} />
            <span>{t("dropzone.hint")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
