import type { MsgKey } from "@/i18n";

type TFn = (key: MsgKey, params?: Record<string, string | number>) => string;

/** Relative time for recent versions ("2m ago"), absolute date for older.
 * Takes the translator + resolved locale so the labels follow the UI language. */
export function relativeTime(epochSec: number, t: TFn, locale?: string): string {
  const delta = Date.now() / 1000 - epochSec;
  if (delta < 45) return t("time.justNow");
  if (delta < 3600) return t("time.minutesAgo", { n: Math.floor(delta / 60) });
  if (delta < 86_400) return t("time.hoursAgo", { n: Math.floor(delta / 3600) });
  return new Date(epochSec * 1000).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** A stable per-day key ("today" / "yesterday" / "YYYY-MM-DD") for grouping and the
 * "is this Today?" check. Never localized, so those comparisons don't break when the
 * display language changes (the visible label comes from `dayGroupLabel`). */
export function dayKey(epochSec: number): string {
  const startOf = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const today = startOf(new Date());
  const day = startOf(new Date(epochSec * 1000));
  if (day === today) return "today";
  if (day === today - 86_400_000) return "yesterday";
  return new Date(day).toISOString().slice(0, 10);
}

/** Display label for a day group: Today / Yesterday / "Mon D". */
export function dayGroupLabel(epochSec: number, t: TFn, locale?: string): string {
  const key = dayKey(epochSec);
  if (key === "today") return t("time.today");
  if (key === "yesterday") return t("time.yesterday");
  return new Date(epochSec * 1000).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function clockTime(epochSec: number, locale?: string): string {
  return new Date(epochSec * 1000).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}
