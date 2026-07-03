import { Check, Gauge, MapPin, Moon, Pencil, Sun } from "lucide-react";
import { useMemo } from "react";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useVault } from "@/store/vault";
import { countChars, formatCount, isCjkText } from "@/util/text";

export function StatusBar() {
  const root = useVault((s) => s.root);
  const doc = useDoc((s) => s.doc);
  const dirty = useDoc((s) => s.dirty);
  const content = useDoc((s) => s.content);
  const wordCount = useDoc((s) => s.wordCount);
  const theme = useSettings((s) => s.theme);
  const t = useT();

  // The count speaks the language you're writing in: word count is meaningless for
  // Japanese/CJK (no spaces), so those docs lead with 文字数; the other metric is
  // one hover away.
  const count = useMemo(() => {
    const chars = countChars(content);
    if (isCjkText(content)) {
      return { text: `${formatCount(chars)} 文字`, title: `${formatCount(wordCount)} words` };
    }
    const words = `${formatCount(wordCount)} ${wordCount === 1 ? "word" : "words"}`;
    return { text: words, title: `${formatCount(chars)} characters` };
  }, [content, wordCount]);
  const density = useSettings((s) => s.density);
  const toggleTheme = useSettings((s) => s.toggleTheme);
  const update = useSettings((s) => s.update);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  return (
    <footer className="statusbar">
      <span className="statusbar__item">
        <MapPin size={12} />
        {root ? root.path : t("statusbar.noVault")}
      </span>

      <div className="statusbar__spacer" />

      {doc && (
        <span className="statusbar__item" title={count.title}>
          {count.text}
        </span>
      )}
      {doc && (
        <button
          type="button"
          className="statusbar__item statusbar__item--btn"
          title={t("common.versionHistory")}
          onClick={() => useHistory.getState().show()}
        >
          {dirty ? (
            <>
              <Pencil size={12} /> {t("statusbar.editing")}
            </>
          ) : (
            <>
              <Check size={12} /> {t("statusbar.saved")}
            </>
          )}
        </button>
      )}
      <button
        type="button"
        className="statusbar__item statusbar__item--btn"
        title={t("common.toggleDensity")}
        onClick={() => update({ density: density === "compact" ? "comfortable" : "compact" })}
      >
        <Gauge size={12} />
      </button>
      <button
        type="button"
        className="statusbar__item statusbar__item--btn"
        title={t("common.toggleTheme")}
        onClick={toggleTheme}
      >
        {isDark ? <Moon size={12} /> : <Sun size={12} />}
      </button>
    </footer>
  );
}
