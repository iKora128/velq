import { Package, X } from "lucide-react";
import { convertToVelq } from "@/export/convert";
import { useT } from "@/i18n/useT";
import { useConvertBanner } from "@/store/convertBanner";

/** A gentle, dismissible offer shown when a plain Markdown/HTML file is open: make
 * a `.velq` copy (into Documents/Velq — the original stays). Opening never converts;
 * this is how you say yes. Dismissing just hides the offer for this document. */
export function ConvertBanner({ docId, path }: { docId: string; path: string }) {
  const t = useT();
  const dismiss = useConvertBanner((s) => s.dismiss);
  return (
    <div className="convert-banner" role="note">
      <Package size={15} className="convert-banner__icon" aria-hidden />
      <span className="convert-banner__text">{t("convertBanner.text")}</span>
      <button
        type="button"
        className="btn btn--sm btn--primary"
        onClick={() => void convertToVelq(path)}
      >
        {t("convertBanner.make")}
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={t("common.close")}
        title={t("common.close")}
        onClick={() => dismiss(docId)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
