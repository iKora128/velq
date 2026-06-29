import { useEffect } from "react";
import { ACTIONS } from "@/command/actions";
import { routeUndo } from "@/editor/undoRouter";
import { getOpenedFiles } from "@/ipc/app";
import { isTauri, listen } from "@/ipc/tauri";
import { registerBuiltins } from "@/plugins/builtin";
import { AppShell } from "@/shell/AppShell";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { type AppView, useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { checkForUpdates } from "@/update/updater";

const MENU_VIEWS: Record<string, AppView> = {
  "view-explorer": "explorer",
  "view-editor": "editor",
  "view-settings": "settings",
};

function runMenu(id: string) {
  if (id === "menu-undo") return routeUndo(false);
  if (id === "menu-redo") return routeUndo(true);
  const view = MENU_VIEWS[id];
  if (view) {
    useUI.getState().setView(view);
    return;
  }
  ACTIONS.find((a) => a.id === id)?.run();
}

registerBuiltins();

/** Open files Velq was launched with (file association). For a plain document we
 * also adopt its folder as the vault — if none is open — so siblings and Save work. */
async function openAssociatedFiles(paths: string[]) {
  for (const p of paths) {
    if (!/\.velq$/i.test(p)) {
      const dir = p.replace(/[/\\][^/\\]*$/, "");
      if (dir && dir !== p && !useVault.getState().root) {
        try {
          await useVault.getState().openPath(dir);
        } catch (e) {
          console.error("adopt vault failed", e);
        }
      }
    }
    await useDoc.getState().openByPath(p);
  }
}

export function App() {
  const load = useSettings((s) => s.load);
  useEffect(() => {
    void (async () => {
      await load();
      const hash = window.location.hash;
      // Dev/screenshot seams.
      if (hash === "#sample") return useDoc.getState().openSample();
      if (hash === "#sample-html") return useDoc.getState().openSampleHtml();
      if (hash === "#sample-plugins") return useDoc.getState().openSamplePlugins();
      if (hash === "#vault") return void useVault.getState().openPath("/Users/you/Notes");

      // Files Velq was launched with (double-click / "Open with") take precedence.
      if (isTauri()) {
        const opened = await getOpenedFiles().catch(() => [] as string[]);
        if (opened.length) {
          await openAssociatedFiles(opened);
        } else {
          const last = useSettings.getState().lastVault;
          if (last) await useVault.getState().openPath(last);
        }
        // Quietly look for an update shortly after launch; only surfaces if one exists.
        window.setTimeout(() => void checkForUpdates(false), 3000);
        return;
      }
      // Restore the last opened vault (browser/mock has no associations).
      const last = useSettings.getState().lastVault;
      if (last) await useVault.getState().openPath(last);
    })();
  }, [load]);

  // A file opened while Velq is already running (macOS emits this at runtime).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string[]>("files-opened", (paths) => {
      void openAssociatedFiles(paths);
    }).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  // Native menu clicks → run the matching command.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("menu", runMenu).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  // External file changes: refresh the tree, reload clean open files, flag dirty ones.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string[]>("fs:changed", (paths) => {
      useFiles.getState().handleFsChange(paths);
      const { tabs, flagConflict, reloadTab } = useDoc.getState();
      for (const p of paths) {
        const tab = tabs.find((t) => t.doc.path === p);
        if (!tab) continue;
        if (tab.dirty) flagConflict(p);
        else void reloadTab(p);
      }
    }).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  return <AppShell />;
}
