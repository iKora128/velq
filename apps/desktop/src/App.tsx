import { useEffect } from "react";
import { ACTIONS } from "@/command/actions";
import { routeUndo } from "@/editor/undoRouter";
import { resolveLocale, t } from "@/i18n";
import { onAgentUpdate } from "@/ipc/acp";
import { applyMenuLanguage, getOpenedFiles } from "@/ipc/app";
import { isTauri, listen } from "@/ipc/tauri";
import { ensureDefaultVault } from "@/ipc/vault";
import { registerBuiltins } from "@/plugins/builtin";
import { AppShell } from "@/shell/AppShell";
import { useAcp } from "@/store/acp";
import { describeError, useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { restoreSession, startSessionPersist } from "@/store/session";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { type AppView, useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { checkForUpdates } from "@/update/updater";
import { wasSelfWrite } from "@/util/selfWrites";

const MENU_VIEWS: Record<string, AppView> = {
  "view-explorer": "explorer",
  "view-editor": "editor",
  "view-settings": "settings",
};

function runMenu(id: string) {
  if (id === "menu-undo") return routeUndo(false);
  if (id === "menu-redo") return routeUndo(true);
  if (id === "close-tab") return useDoc.getState().closeActive();
  if (id === "reopen-tab") return useDoc.getState().reopenClosed();
  if (id === "tab-next") return useDoc.getState().activateNext();
  if (id === "tab-prev") return useDoc.getState().activatePrev();
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

/** Open the user's home: their last vault, or the default `Documents/Velq` (created
 * and seeded on first run) — so launching never dead-ends on a folder picker. */
async function openHome() {
  // A normal launch lands on the file browser — unless yesterday's tabs can be
  // brought back (W5), in which case we resume right where the writer stopped.
  useUI.getState().setView("explorer");
  const last = useSettings.getState().lastVault;
  if (last) {
    await useVault.getState().openPath(last);
    if (useVault.getState().root) {
      await restoreSession();
      return; // opened cleanly; otherwise it was moved/deleted
    }
  }
  try {
    const v = await ensureDefaultVault();
    await useVault.getState().openPath(v.path);
  } catch (e) {
    console.error("default vault failed", e);
    useToast.getState().push(t("toast.cantOpenHome", { error: describeError(e) }));
  }
}

export function App() {
  const load = useSettings((s) => s.load);
  const locale = useSettings((s) => s.locale);

  // Rebuild the native menu in the resolved language on startup and whenever the
  // language setting changes (the webview resolves "system" from the OS language).
  useEffect(() => {
    if (!isTauri()) return;
    void applyMenuLanguage(resolveLocale(locale)).catch((e) =>
      console.error("apply_menu_language failed", e),
    );
  }, [locale]);

  useEffect(() => {
    void (async () => {
      await load();
      const hash = window.location.hash;
      // Dev/screenshot seams.
      if (hash === "#sample") return useDoc.getState().openSample();
      if (hash === "#sample-html") return useDoc.getState().openSampleHtml();
      if (hash === "#sample-plugins") return useDoc.getState().openSamplePlugins();
      if (hash === "#settings") return useUI.getState().setView("settings");
      if (hash === "#vault") return void useVault.getState().openPath("/Users/you/Notes");

      // Files Velq was launched with (double-click / "Open with") take precedence.
      if (isTauri()) {
        const opened = await getOpenedFiles().catch(() => [] as string[]);
        if (opened.length) {
          await openAssociatedFiles(opened);
        } else {
          await openHome();
        }
        // Quietly look for an update shortly after launch; only surfaces if one exists.
        window.setTimeout(() => void checkForUpdates(false), 3000);
        return;
      }
      // Browser/mock has no file associations — just open home.
      await openHome();
    })();
  }, [load]);

  // Persist the open-tab session (W5) for the next launch.
  useEffect(() => startSessionPersist(), []);

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
        if (wasSelfWrite(p)) continue; // our own save/restore echoing back — not an external edit
        if (tab.dirty) flagConflict(p);
        else void reloadTab(p);
      }
    }).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  // Streamed updates from the AI agent session → the assistant transcript.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onAgentUpdate((u) => useAcp.getState().receive(u)).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  return <AppShell />;
}
