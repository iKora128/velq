import { t } from "@/i18n";
import { bundleMdDoc, packageHtmlFile } from "@/ipc/bundle";
import { pickHtmlFile } from "@/ipc/dialog";
import { renderMarkdown } from "@/ipc/render";
import { readFile } from "@/ipc/vault";
import { enrichOgpCards } from "@/preview/ogpCards";
import { openVelq } from "@/store/doc";
import { usePackaging } from "@/store/packaging";
import { useToast } from "@/store/toast";

const baseName = (p: string) => p.split(/[/\\]/).pop() ?? p;

/** Open-and-package an HTML file: trace its dependencies, stage a self-contained
 * `.velq` in Documents/Velq, and show the result right away — the fresh package
 * opens (as a tab by default) carrying its source path, so "edit the original
 * HTML" is one click from where you land. (plan §6; user workflow.) */
function skippedNote(failed: number): string {
  return failed
    ? failed === 1
      ? t("toast.linksSkippedOne", { count: failed })
      : t("toast.linksSkippedMany", { count: failed })
    : "";
}

export async function packageAndStage(htmlPath: string): Promise<void> {
  const name = baseName(htmlPath);
  const pkg = usePackaging.getState();
  pkg.begin(t("packaging.bundling"));
  try {
    const r = await packageHtmlFile(htmlPath);
    useToast
      .getState()
      .push(t("toast.savedToVelq", { count: r.collected, skipped: skippedNote(r.failed) }));
    await openVelq(r.outPath, { origin: htmlPath });
  } catch (e) {
    console.error("package_html_file failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    useToast.getState().push(t("toast.cantPackageNamed", { name, error: msg }));
  } finally {
    pkg.end();
  }
}

export const isHtmlPath = (name: string) => /\.html?$/i.test(name);
export const isMdPath = (name: string) => /\.(md|markdown)$/i.test(name);

/** Package a Markdown file into a `.velq` — render it, bake OGP link cards in (so
 * the viewer shows them offline), download every image, and keep the `.md` source.
 * The heavy steps (fetching link previews, downloading images) run behind a live
 * progress overlay so creating a Velq never looks frozen. "Everything becomes a
 * Velq" for Markdown. */
export async function packageMdAndStage(mdPath: string): Promise<void> {
  const name = baseName(mdPath);
  const pkg = usePackaging.getState();
  pkg.begin(t("packaging.rendering"));
  try {
    const fc = await readFile(mdPath);
    const html = await renderMarkdown(fc.content);
    const enriched = await enrichOgpCards(html, (done, total) =>
      pkg.update(t("packaging.ogp"), done, total),
    );
    pkg.update(t("packaging.bundling"));
    const r = await bundleMdDoc(mdPath, fc.content, enriched);
    useToast
      .getState()
      .push(t("toast.savedToVelq", { count: r.collected, skipped: skippedNote(r.failed) }));
    await openVelq(r.outPath, { origin: mdPath });
  } catch (e) {
    console.error("package md failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    useToast.getState().push(t("toast.cantPackageNamed", { name, error: msg }));
  } finally {
    pkg.end();
  }
}

/** Pick an HTML file from disk and package it straight to Documents/Velq. */
export async function openHtmlAndPackage(): Promise<void> {
  const path = await pickHtmlFile();
  if (path) await packageAndStage(path);
}
