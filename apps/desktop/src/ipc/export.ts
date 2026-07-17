import { invoke } from "./tauri";

/** Render standalone HTML to a real PDF file at `outPath`. Native on the desktop
 * (macOS WKWebView.createPDF); the browser-mock falls back to the print dialog. */
export const exportPdfFile = (html: string, outPath: string) =>
  invoke<void>("export_pdf", { html, outPath });
