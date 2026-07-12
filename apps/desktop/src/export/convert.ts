import { t } from "@/i18n";
import { convertHtmlInPlace, convertMdInPlace } from "@/ipc/bundle";
import { renderMarkdown } from "@/ipc/render";
import { readFile } from "@/ipc/vault";
import { enrichOgpCards } from "@/preview/ogpCards";
import { openVelq, useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { usePackaging } from "@/store/packaging";
import { useToast } from "@/store/toast";
import { isHtmlPath, isMdPath } from "./htmlPackage";

const baseName = (p: string) => p.split(/[/\\]/).pop() ?? p;
const parentOf = (p: string) => {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : p;
};

/** Whether a file can be converted to `.velq` (a plain Markdown or HTML file). */
export const canConvertToVelq = (name: string) => isMdPath(name) || isHtmlPath(name);

/**
 * Explicitly convert a plain `.md`/`.html` file into a `.velq`, **in place** — the
 * user invokes this (right-click / palette). It is NEVER a side effect of opening a
 * file: opening a document must never change it on disk. The original is replaced by
 * a sibling `<stem>.velq` (its content is preserved inside — export back anytime),
 * the tree refreshes, and the new package opens for editing. Heavy steps (link
 * previews, image downloads) run behind the live progress overlay.
 */
export async function convertToVelq(path: string): Promise<void> {
  const name = baseName(path);
  if (!canConvertToVelq(name)) return;
  const pkg = usePackaging.getState();
  const parent = parentOf(path);
  try {
    let outPath: string;
    if (isMdPath(name)) {
      pkg.begin(t("packaging.rendering"));
      const fc = await readFile(path);
      const html = await renderMarkdown(fc.content);
      const enriched = await enrichOgpCards(html, (done, total) =>
        pkg.update(t("packaging.ogp"), done, total),
      );
      pkg.update(t("packaging.bundling"));
      outPath = (await convertMdInPlace(path, fc.content, enriched)).outPath;
    } else {
      pkg.begin(t("packaging.bundling"));
      outPath = (await convertHtmlInPlace(path)).outPath;
    }
    // The original file is gone: drop any tab on it, refresh the browser, open the
    // fresh package for editing.
    useDoc.getState().close(path);
    await useFiles.getState().loadDir(parent);
    useToast.getState().push(t("toast.convertedToVelq", { name }));
    await openVelq(outPath, { preview: false });
  } catch (e) {
    console.error("convert to velq failed", path, e);
    const msg = e instanceof Error ? e.message : String(e);
    useToast.getState().push(t("toast.cantPackageNamed", { name, error: msg }));
  } finally {
    pkg.end();
  }
}
