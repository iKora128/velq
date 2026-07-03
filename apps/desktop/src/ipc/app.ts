import { invoke } from "./tauri";
import type { Settings } from "./types";

export const getSettings = () => invoke<Settings>("get_settings");

export const setSettings = (settings: Settings) => invoke<void>("set_settings", { settings });

/** Files Velq was launched with via a file association (double-click / "Open with"). */
export const getOpenedFiles = () => invoke<string[]>("get_opened_files");

/** Rebuild the native app menu in a language ("en" | "ja"). The frontend resolves
 * the OS/user language and calls this on startup and on every language change. */
export const applyMenuLanguage = (locale: string) =>
  invoke<void>("apply_menu_language", { locale });
