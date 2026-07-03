import { TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";

/** Shown when a file changed on disk while the tab had unsaved edits (plan §10).
 * No data loss — the user chooses. */
export function ConflictBanner({ path }: { path: string }) {
  const t = useT();
  const reloadTab = useDoc((s) => s.reloadTab);
  const keepMine = useDoc((s) => s.keepMine);

  return (
    <div className="conflict-banner" role="alert">
      <TriangleAlert size={15} className="conflict-banner__icon" />
      <span className="conflict-banner__text">{t("conflict.message")}</span>
      <button type="button" className="btn btn--sm" onClick={() => void reloadTab(path)}>
        {t("conflict.reload")}
      </button>
      <button type="button" className="btn btn--sm" onClick={() => keepMine(path)}>
        {t("conflict.keepMine")}
      </button>
    </div>
  );
}
