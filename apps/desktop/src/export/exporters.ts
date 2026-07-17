import { t } from "@/i18n";
import { bundleHtmlToVelq } from "@/ipc/bundle";
import { dirOf, pickSaveFile } from "@/ipc/dialog";
import { exportPdfFile } from "@/ipc/export";
import { renderMarkdown } from "@/ipc/render";
import { writeFileContent } from "@/ipc/vault";
import { buildPreviewDoc, htmlDocument } from "@/preview/previewStyles";
import { openVelq, useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";

export type ExportFormat = "velq" | "html" | "markdown" | "pdf";

function baseName(): string {
  return useDoc.getState().doc?.name?.replace(/\.(md|markdown|html?|txt)$/i, "") ?? "Document";
}

/** Where the Save dialog should open: the folder you last exported to, else next
 * to the source document, else the vault root. */
function exportDir(): string | null {
  const last = useSettings.getState().lastExportDir;
  if (last) return last;
  const p = useDoc.getState().doc?.path;
  if (p) return dirOf(p);
  return useVault.getState().root?.path ?? null;
}

/** Remember the folder so the next export starts there. */
function rememberExportDir(savedPath: string) {
  useSettings.getState().update({ lastExportDir: dirOf(savedPath) });
}

/** A self-contained HTML document for the current doc (rendered for markdown).
 * Uses the selected preview template, so the export looks like the preview. */
async function toStandaloneHtml(): Promise<string> {
  const { doc, content } = useDoc.getState();
  if (!doc) return "";
  if (doc.language === "html") return htmlDocument(content);
  const template = useSettings.getState().previewTemplate;
  return buildPreviewDoc(await renderMarkdown(content), { dark: false, template });
}

async function exportMarkdown() {
  const { doc, content } = useDoc.getState();
  if (!doc) return;
  const out = await pickSaveFile(`${baseName()}.md`, "md", exportDir());
  if (!out) return;
  rememberExportDir(out);
  await writeFileContent(out, content);
  useToast.getState().push(t("toast.exportedMd", { name: baseName() }));
}

async function exportHtml() {
  if (!useDoc.getState().doc) return;
  const out = await pickSaveFile(`${baseName()}.html`, "html", exportDir());
  if (!out) return;
  rememberExportDir(out);
  await writeFileContent(out, await toStandaloneHtml());
  useToast.getState().push(t("toast.exportedHtml", { name: baseName() }));
}

async function exportVelq() {
  const { doc, content } = useDoc.getState();
  if (!doc) return;
  const out = await pickSaveFile(`${baseName()}.velq`, "velq", exportDir());
  if (!out) return;
  rememberExportDir(out);
  const html = doc.language === "html" ? content : await toStandaloneHtml();
  const baseDir = doc.path
    ? doc.path.slice(0, doc.path.lastIndexOf("/"))
    : (useVault.getState().root?.path ?? null);
  try {
    const report = await bundleHtmlToVelq(html, out, baseDir, doc.language === "html");
    useToast.getState().push(t("toast.packaged", { name: baseName(), note: "" }), {
      label: t("common.open"),
      run: () => void openVelq(out),
    });
    if (report.failed.length) {
      const items = report.failed
        .map((f) => f.url.split(/[/\\]/).pop() ?? f.url)
        .slice(0, 8)
        .join(", ");
      useToast.getState().push(t("toast.notBundled", { count: report.failed.length, items }));
    }
  } catch (e) {
    console.error("export .velq failed", e);
    useToast.getState().push(t("toast.cantPackageVelq"));
  }
}

/** PDF via the platform webview's native render-to-PDF (macOS WKWebView.createPDF):
 * a real .pdf file, no print dialog. Picks a save location like the other exports. */
async function exportPdf() {
  if (!useDoc.getState().doc) return;
  const out = await pickSaveFile(`${baseName()}.pdf`, "pdf", exportDir());
  if (!out) return;
  rememberExportDir(out);
  try {
    await exportPdfFile(await toStandaloneHtml(), out);
    useToast.getState().push(t("toast.exportedPdf", { name: baseName() }));
  } catch (e) {
    console.error("export pdf failed", e);
    useToast.getState().push(t("toast.cantExportPdf"));
  }
}

export function exportActive(format: ExportFormat) {
  switch (format) {
    case "velq":
      return void exportVelq();
    case "html":
      return void exportHtml();
    case "markdown":
      return void exportMarkdown();
    case "pdf":
      return void exportPdf();
  }
}
