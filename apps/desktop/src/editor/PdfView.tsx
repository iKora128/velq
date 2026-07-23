import { convertFileSrc } from "@tauri-apps/api/core";
import { ExternalLink } from "lucide-react";
import { useT } from "@/i18n/useT";
import { isTauri } from "@/ipc/tauri";
import { describeError } from "@/store/doc";
import { useToast } from "@/store/toast";
import "./pdfView.css";

/** View-only PDF pane. The webview's built-in PDF viewer renders the file straight
 * from disk via Tauri's asset protocol — nothing is read into the text editor. An
 * "open in the default app" escape hatch covers the rare case the inline viewer
 * can't show it. Outside Tauri (browser/screenshot mode) there's no asset protocol,
 * so we show a short note instead. */
export function PdfView({ path, name }: { path: string; name: string }) {
  const t = useT();

  async function openExternally() {
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } catch (e) {
      useToast.getState().push(t("toast.cantOpen", { name, error: describeError(e) }));
    }
  }

  if (!isTauri()) {
    return (
      <div className="pdf-view pdf-view--empty">
        <p className="pdf-view__hint">{t("pdf.previewUnavailable")}</p>
      </div>
    );
  }

  return (
    <div className="pdf-view">
      <iframe className="pdf-view__frame" src={convertFileSrc(path)} title={name} />
      <button type="button" className="pdf-view__open" onClick={() => void openExternally()}>
        <ExternalLink size={13} />
        {t("pdf.openExternal")}
      </button>
    </div>
  );
}
