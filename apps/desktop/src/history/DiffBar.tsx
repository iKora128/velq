import { useLocale, useT } from "@/i18n/useT";
import type { Version } from "@/ipc/types";
import { useHistory } from "@/store/history";
import { clockTime, relativeTime } from "@/util/time";

/** Header above a diff: non-destructive restore + back-to-editing (plan §10). */
export function DiffBar({ version }: { version: Version }) {
  const restore = useHistory((s) => s.restore);
  const select = useHistory((s) => s.select);
  const t = useT();
  const locale = useLocale();

  return (
    <div className="diff-bar">
      <span className="diff-bar__label">
        {t("diff.whatChanged", {
          time: clockTime(version.time, locale),
          ago: relativeTime(version.time, t, locale),
        })}
      </span>
      <div className="diff-bar__spacer" />
      <button type="button" className="btn btn--sm" onClick={() => void select(null)}>
        {t("diff.backToEditing")}
      </button>
      <button
        type="button"
        className="btn btn--sm btn--primary"
        onClick={() => void restore(version)}
      >
        {t("diff.restore")}
      </button>
    </div>
  );
}
