import { t } from "@/i18n";
import type { FileNode } from "@/ipc/types";
import { importFile } from "@/ipc/vault";
import { describeError, useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";
import { isHtmlPath, isMdPath, packageAndStage, packageMdAndStage } from "./htmlPackage";

const baseName = (p: string) => p.split(/[/\\]/).filter(Boolean).pop() ?? p;

/** Which dropped paths are convertible to `.velq` (Markdown or HTML). */
export const convertible = (paths: string[]) => paths.filter((p) => isHtmlPath(p) || isMdPath(p));

/** Package each Markdown/HTML file into a `.velq` COPY in Documents/Velq — the
 * original files are never touched or removed. Each step shows the progress overlay
 * and the fresh package opens. */
export async function convertDroppedToVelq(paths: string[]): Promise<void> {
  for (const p of paths) {
    if (isHtmlPath(p)) await packageAndStage(p);
    else if (isMdPath(p)) await packageMdAndStage(p);
  }
}

/** Document types worth opening straight after import (an image just gets selected). */
const OPENABLE = /\.(md|markdown|html?|velq|pdf)$/i;

/** Copy dropped files into the open vault AS-IS — no packaging, nothing converted.
 * Importing lands you ON the file: it's selected in the browser and (for a single
 * document) opened, so you're not left hunting for where it went. */
export async function importRawIntoVault(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const vault = useVault.getState().root;
  if (!vault) {
    useToast.getState().push(t("toast.dropOpenFolderFirst"));
    return;
  }
  let added = 0;
  let last: FileNode | null = null;
  for (const p of paths) {
    try {
      last = await importFile(p, vault.path);
      added += 1;
    } catch (e) {
      console.error("import failed", p, e);
      useToast.getState().push(t("toast.cantAdd", { name: baseName(p), error: describeError(e) }));
    }
  }
  if (added > 0) {
    await useFiles.getState().loadDir(vault.path);
    if (last) {
      useFiles.getState().select(last); // highlight the imported file in the browser
      if (added === 1 && OPENABLE.test(last.name)) void useDoc.getState().openFile(last);
    }
    useToast
      .getState()
      .push(
        added === 1
          ? t("toast.addedOne", { vault: vault.name })
          : t("toast.addedMany", { count: added, vault: vault.name }),
      );
  }
}
