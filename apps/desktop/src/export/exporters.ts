import { t } from "@/i18n";
import { bundleHtmlToVelq } from "@/ipc/bundle";
import { dirOf, pickSaveFile } from "@/ipc/dialog";
import { renderMarkdown } from "@/ipc/render";
import { writeFileContent } from "@/ipc/vault";
import { openVelqViewer } from "@/ipc/velq";
import { buildPreviewDoc, htmlDocument } from "@/preview/previewStyles";
import { useDoc } from "@/store/doc";
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

/** A self-contained HTML document for the current doc (rendered for markdown). */
async function toStandaloneHtml(): Promise<string> {
  const { doc, content } = useDoc.getState();
  if (!doc) return "";
  if (doc.language === "html") return htmlDocument(content);
  return buildPreviewDoc(await renderMarkdown(content), { dark: false });
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
    const n = report.failed.length;
    const note = n
      ? n === 1
        ? t("toast.linksSkippedOne", { count: n })
        : t("toast.linksSkippedMany", { count: n })
      : "";
    useToast.getState().push(t("toast.packaged", { name: baseName(), note }), {
      label: t("common.open"),
      run: () => void openVelqViewer(out),
    });
  } catch (e) {
    console.error("export .velq failed", e);
    useToast.getState().push(t("toast.cantPackageVelq"));
  }
}

/** PDF via the WebView's print-to-PDF (plan D5, MVP): render to a hidden iframe and
 * print — the OS dialog offers "Save as PDF". */
async function exportPdf() {
  if (!useDoc.getState().doc) return;
  const html = await toStandaloneHtml();
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  if (idoc) {
    idoc.open();
    idoc.write(html);
    idoc.close();
  }
  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1500);
  }, 250);
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
