import type { LocalePref } from "@/ipc/types";
import { type Dict, en, type MsgKey } from "./en";
import { ja } from "./ja";

/** A concrete UI language (a resolved `LocalePref`). */
export type Locale = "en" | "ja";
export type { MsgKey };

const DICTS: Record<Locale, Dict> = { en, ja };

/** Every locale we ship, for building a language picker. */
export const LOCALES: Locale[] = ["en", "ja"];

/** Resolve a stored preference to a concrete locale; "system" follows the OS. */
export function resolveLocale(pref: LocalePref): Locale {
  if (pref === "en" || pref === "ja") return pref;
  const sys = typeof navigator !== "undefined" ? navigator.language : "en";
  return sys.toLowerCase().startsWith("ja") ? "ja" : "en";
}

type Params = Record<string, string | number>;

function interpolate(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Translate a key in an explicit locale (falls back to English if a locale is
 * ever incomplete at runtime). */
export function translate(locale: Locale, key: MsgKey, params?: Params): string {
  const s = DICTS[locale][key] ?? en[key];
  return interpolate(s, params);
}

// ---- Non-React access (stores, actions, transient toasts) --------------------
// Components use the reactive `useT` hook; this mirror is for code that runs
// outside React and is kept in sync by the settings store.
let active: Locale = resolveLocale("system");

/** Point the non-React translator at a locale (called by the settings store). */
export function setActiveLocale(locale: Locale): void {
  active = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function activeLocale(): Locale {
  return active;
}

/** Translate using the active locale — for non-component code. */
export function t(key: MsgKey, params?: Params): string {
  return translate(active, key, params);
}
