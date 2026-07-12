import { t } from "@/i18n";
import { importFile } from "@/ipc/vault";
import { describeError } from "@/store/doc";
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

/** Copy dropped files into the open vault AS-IS — no packaging, nothing converted. */
export async function importRawIntoVault(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const vault = useVault.getState().root;
  if (!vault) {
    useToast.getState().push(t("toast.dropOpenFolderFirst"));
    return;
  }
  let added = 0;
  for (const p of paths) {
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
