import { useMemo } from "react";
import { useSettings } from "@/store/settings";
import { type Locale, type MsgKey, resolveLocale, translate } from "./index";

/**
 * Reactive translator for React components. Reading the language preference from
 * the settings store means every component using `useT()` re-renders the moment
 * the user switches languages — no reload.
 *
 *   const t = useT();
 *   <span>{t("statusbar.saved")}</span>
 *   <span>{t("history.sessionSaves", { n: 5 })}</span>
 */
export function useT(): (key: MsgKey, params?: Record<string, string | number>) => string {
  const pref = useSettings((s) => s.locale);
  return useMemo(() => {
    const locale = resolveLocale(pref);
    return (key: MsgKey, params?: Record<string, string | number>) =>
      translate(locale, key, params);
  }, [pref]);
}

/** The resolved current locale ("en" | "ja"), reactive to the setting. Handy for
 * `Intl`/`toLocale*` date & number formatting. */
export function useLocale(): Locale {
  return resolveLocale(useSettings((s) => s.locale));
}
