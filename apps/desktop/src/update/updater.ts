/**
 * Auto-update flow (plan §12 / M19). Wraps `@tauri-apps/plugin-updater`, which
 * checks the GitHub Releases `latest.json` endpoint configured in tauri.conf.json
 * and verifies the bundle against the embedded minisign public key. The frontend
 * owns the (calm) UI: a single toast, never a modal.
 */
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { t } from "@/i18n";
import { isTauri } from "@/ipc/tauri";
import { useToast } from "@/store/toast";

let inFlight = false;

/**
 * Check for an update. `manual` (from the command palette) reports "up to date"
 * and errors; the silent startup check stays quiet unless something is available.
 */
export async function checkForUpdates(manual = false): Promise<void> {
  if (!isTauri()) {
    if (manual) useToast.getState().push(t("toast.updateDesktopOnly"));
    return;
  }
  if (inFlight) return;
  inFlight = true;
  try {
    const update = await check();
    if (!update) {
      if (manual) useToast.getState().push(t("toast.upToDate"));
      return;
    }
    useToast.getState().push(t("toast.updateAvailable", { version: update.version }), {
      label: t("toast.installRestart"),
      run: () => void install(update),
    });
  } catch (e) {
    console.error("update check failed", e);
    if (manual) useToast.getState().push(t("toast.cantCheckUpdates"));
  } finally {
    inFlight = false;
  }
}

async function install(update: Update): Promise<void> {
  try {
    useToast.getState().push(t("toast.downloading", { version: update.version }));
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.error("update install failed", e);
    useToast.getState().push(t("toast.cantInstall"));
  }
}
