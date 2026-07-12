import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { convertDroppedToVelq, importRawIntoVault } from "@/export/dropActions";
import { useT } from "@/i18n/useT";
import { useConvertPrompt } from "@/store/convertPrompt";
import { useSettings } from "@/store/settings";
import "./convertPrompt.css";

const baseName = (p: string) => p.split(/[/\\]/).filter(Boolean).pop() ?? p;

/** Asked when Markdown/HTML files are dropped in: make a `.velq` copy (into
 * Documents/Velq — the original stays put) or add the files as-is? Nothing is
 * converted without this consent; "always" remembers the choice. */
export function ConvertPromptModal() {
  const t = useT();
  const paths = useConvertPrompt((s) => s.paths);
  const close = useConvertPrompt((s) => s.close);
  const [always, setAlways] = useState(false);

  useEffect(() => {
    if (paths) setAlways(false);
  }, [paths]);
  useEffect(() => {
    if (!paths) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paths, close]);

  if (!paths) return null;

  const make = () => {
    if (always) useSettings.getState().update({ autoPackageHtml: true });
    const ps = paths;
    close();
    void convertDroppedToVelq(ps);
  };
  const keep = () => {
    const ps = paths;
    close();
    void importRawIntoVault(ps);
  };

  return createPortal(
    <div className="cprompt-backdrop anim-fade" onClick={close} role="presentation">
      <div
        className="cprompt anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("convert.title")}
      >
        <div className="cprompt__icon" aria-hidden>
          <Package size={22} strokeWidth={1.6} />
        </div>
        <h2 className="cprompt__title">{t("convert.title")}</h2>
        <p className="cprompt__body">{t("convert.body")}</p>
        <ul className="cprompt__files">
          {paths.slice(0, 5).map((p) => (
            <li key={p}>{baseName(p)}</li>
          ))}
          {paths.length > 5 && (
            <li className="cprompt__more">{t("convert.more", { count: paths.length - 5 })}</li>
          )}
        </ul>
        <label className="cprompt__always">
          <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} />
          {t("convert.always")}
        </label>
        <div className="cprompt__foot">
          <button type="button" className="btn btn--sm" onClick={keep}>
            {t("convert.keep")}
          </button>
          <button type="button" className="btn btn--sm btn--primary" onClick={make}>
            {t("convert.make")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
