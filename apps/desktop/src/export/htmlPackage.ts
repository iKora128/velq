import { t } from "@/i18n";
import { packageHtmlFile } from "@/ipc/bundle";
import { pickHtmlFile } from "@/ipc/dialog";
import { openVelq } from "@/store/doc";
import { useToast } from "@/store/toast";

const baseName = (p: string) => p.split(/[/\\]/).pop() ?? p;

/** Open-and-package an HTML file: trace its dependencies, stage a self-contained
 * `.velq` in Documents/Velq, and show the result right away — the fresh package
 * opens (as a tab by default) carrying its source path, so "edit the original
 * HTML" is one click from where you land. (plan §6; user workflow.) */
export async function packageAndStage(htmlPath: string): Promise<void> {
  const name = baseName(htmlPath);
  useToast.getState().push(t("toast.packaging", { name }));
  try {
    const r = await packageHtmlFile(htmlPath);
    const n = r.failed;
    const skipped = n
      ? n === 1
        ? t("toast.linksSkippedOne", { count: n })
        : t("toast.linksSkippedMany", { count: n })
      : "";
    useToast.getState().push(t("toast.savedToVelq", { count: r.collected, skipped }));
    await openVelq(r.outPath, { origin: htmlPath });
  } catch (e) {
    console.error("package_html_file failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    useToast.getState().push(t("toast.cantPackageNamed", { name, error: msg }));
  }
}

export const isHtmlPath = (name: string) => /\.html?$/i.test(name);

/** Pick an HTML file from disk and package it straight to Documents/Velq. */
export async function openHtmlAndPackage(): Promise<void> {
  const path = await pickHtmlFile();
  if (path) await packageAndStage(path);
}
