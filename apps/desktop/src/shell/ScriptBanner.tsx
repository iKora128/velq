import { Play, X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { openVelq } from "@/store/doc";
import { useHtmlRuntime } from "@/store/htmlRuntime";

/** A page that paints itself in JavaScript stays blank until its scripts run — but a
 * page's own JS is a security surface (external HTML could be hostile), so Velq never
 * runs it automatically. This dismissible banner is the explicit "yes, run it".
 *
 * For a `.velq` (which owns its assets) it opens the full `velq://` viewer, where JS
 * runs AND relative images resolve — the true finished view. For a plain HTML file it
 * just flips scripts on in the editor preview (layout comes alive; a `../` image may
 * still not resolve there, since the preview isn't the package origin). */
export function ScriptBanner({ docId, velqSource }: { docId: string; velqSource?: string }) {
  const t = useT();
  const setRunScripts = useHtmlRuntime((s) => s.setRunScripts);
  const dismiss = useHtmlRuntime((s) => s.dismissScriptPrompt);
  const run = () => {
    if (velqSource) void openVelq(velqSource, { forceWindow: true });
    else setRunScripts(docId, true);
    dismiss(docId);
  };
  return (
    <div className="script-banner" role="note">
      <Play size={15} className="script-banner__icon" aria-hidden />
      <span className="script-banner__text">{t("scriptBanner.text")}</span>
      <button type="button" className="btn btn--sm btn--primary" onClick={run}>
        {t("scriptBanner.run")}
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
