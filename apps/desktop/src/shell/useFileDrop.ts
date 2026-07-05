import { useEffect, useState } from "react";
import { isHtmlPath, packageAndStage } from "@/export/htmlPackage";
import { t } from "@/i18n";
import { isTauri } from "@/ipc/tauri";
import { importFile } from "@/ipc/vault";
import { describeError } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";

function baseName(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() ?? p;
}

/** Dropped HTML (with auto-package on) is packaged from its ORIGINAL folder — its
 * relative css/img/js resolve there; a bare copy into the vault would break them.
 * Everything else is copied into the open vault's root. */
async function importDropped(paths: string[]) {
  const autoPackage = useSettings.getState().autoPackageHtml;
  const toImport: string[] = [];
  for (const p of paths) {
    if (isHtmlPath(p) && autoPackage) await packageAndStage(p);
    else toImport.push(p);
  }
  if (toImport.length === 0) return;

  const vault = useVault.getState().root;
  if (!vault) {
    useToast.getState().push(t("toast.dropOpenFolderFirst"));
    return;
  }
  let added = 0;
  for (const p of toImport) {
    try {
      await importFile(p, vault.path);
      added += 1;
    } catch (e) {
      console.error("import failed", p, e);
      useToast.getState().push(t("toast.cantAdd", { name: baseName(p), error: describeError(e) }));
    }
  }
  if (added > 0) {
    await useFiles.getState().loadDir(vault.path);
    useToast
      .getState()
      .push(
        added === 1
          ? t("toast.addedOne", { vault: vault.name })
          : t("toast.addedMany", { count: added, vault: vault.name }),
      );
  }
}

/** OS file drag-and-drop onto the window. HTML packages to `.velq` when
 * auto-package is on (same rule as opening from the OS); anything else — a `.velq`
 * from Finder, notes, images — is copied into the open vault. Returns whether a
 * drag is currently hovering, so the shell can show a drop hint. */
export function useFileDrop(): boolean {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const un = await getCurrentWebview().onDragDropEvent((event) => {
        const t = event.payload.type;
        if (t === "enter" || t === "over") setDragging(true);
        else if (t === "leave") setDragging(false);
        else if (t === "drop") {
          setDragging(false);
          void importDropped(event.payload.paths);
        }
      });
      if (cancelled) un();
      else unlisten = un;
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
  return dragging;
}
