import { ExternalLink, Package, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { openVelqViewer, stageVelq } from "@/ipc/velq";
import { describeError, openPathForEdit, unpackVelqAndEdit } from "@/store/doc";

/** A `.velq` opened as a tab: the package is served over the `velq://` scheme and
 * shown in a sandboxed iframe — scripts run, but the frame has no IPC and the
 * scheme's CSP keeps the network off. A thin bar says what this is (a sealed
 * package, read-only) and offers the pop-out window. */
export function VelqView({ path, name, origin }: { path: string; name: string; origin?: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    stageVelq(path)
      .then((u) => {
        if (!stale) setUrl(u);
      })
      .catch((e) => {
        if (!stale) setError(describeError(e));
      });
    return () => {
      stale = true;
    };
  }, [path]);

  return (
    <div className="velq-view">
      <div className="velq-view__bar">
        <Package size={14} aria-hidden />
        <span className="velq-view__name">{name}</span>
        <span className="velq-view__ro">{t("velqview.readonly")}</span>
        <span className="velq-view__spacer" />
        {/* A package is read-only, but editing is never a dead end: edit the known
            source if we have it, else extract the HTML from the package and edit that. */}
        {origin ? (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => void openPathForEdit(origin)}
          >
            <PenLine size={13} aria-hidden />
            {t("velqview.editOriginal")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => void unpackVelqAndEdit(path)}
          >
            <PenLine size={13} aria-hidden />
            {t("velqview.editExtract")}
          </button>
        )}
        <button type="button" className="btn btn--sm" onClick={() => void openVelqViewer(path)}>
          <ExternalLink size={13} aria-hidden />
          {t("velqview.popout")}
        </button>
      </div>
      {error ? (
        <div className="velq-view__error">{error}</div>
      ) : url ? (
        <iframe className="velq-view__frame" src={url} sandbox="allow-scripts" title={name} />
      ) : (
        <div className="velq-view__error">{t("common.loading")}</div>
      )}
    </div>
  );
}
