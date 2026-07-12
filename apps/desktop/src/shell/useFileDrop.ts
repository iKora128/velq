import { useEffect, useState } from "react";
import { editorBus } from "@/editor/editorBus";
import { isHtmlPath, isMdPath, packageAndStage, packageMdAndStage } from "@/export/htmlPackage";
import { t } from "@/i18n";
import { isTauri } from "@/ipc/tauri";
import { importFile } from "@/ipc/vault";
import { describeError, useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";

function baseName(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() ?? p;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

/** Images dropped ON the editor while a Markdown doc is open: copy into
 * `attachments/` beside the doc and insert links at the caret (W1). */
async function importImagesIntoDoc(paths: string[]): Promise<boolean> {
  const doc = useDoc.getState().doc;
  if (!doc?.path || doc.language !== "markdown") return false;
  if (!paths.every((p) => IMAGE_EXT.test(p))) return false;
  const destDir = `${dirOf(doc.path)}/attachments`;
  let ok = 0;
  for (const p of paths) {
    try {
      const node = await importFile(p, destDir);
      editorBus.insertAtCursor(`![](attachments/${node.name})`);
      ok += 1;
    } catch (e) {
      console.error("image import failed", p, e);
      useToast.getState().push(t("toast.cantAdd", { name: baseName(p), error: describeError(e) }));
    }
  }
  return ok > 0;
}

/** Dropped HTML wraps into a `.velq` (when auto-package is on) — the package IS
 * the working unit: it opens showing the page, and its "extract & edit" button
 * (edit mode already on) takes you to the HTML inside. Packaging from the file's
 * ORIGINAL folder keeps relative css/img/js resolvable. Everything else is copied
 * into the open vault's root. */
async function importDropped(paths: string[], overEditor: boolean) {
  // Images aimed at the editor go into the document, not the vault root.
  if (overEditor && (await importImagesIntoDoc(paths))) return;
  const autoPackage = useSettings.getState().autoPackageHtml;
  const toImport: string[] = [];
  for (const p of paths) {
    if (autoPackage && isHtmlPath(p)) await packageAndStage(p);
    else if (autoPackage && isMdPath(p)) await packageMdAndStage(p);
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

/** OS file drag-and-drop onto the window. HTML wraps into a `.velq` when
 * auto-package is on; anything else — a `.velq` from Finder, notes, images — is
 * copied into the open vault. Returns whether a drag is currently hovering, so the
 * shell can show a drop hint. */
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
          const pos = event.payload.position;
          const scale = window.devicePixelRatio || 1;
          const el = document.elementFromPoint(pos.x / scale, pos.y / scale);
          void importDropped(event.payload.paths, !!el?.closest(".cm-editor"));
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
