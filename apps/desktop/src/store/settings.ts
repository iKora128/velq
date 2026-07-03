import { create } from "zustand";
import { resolveLocale, setActiveLocale } from "@/i18n";
import { getSettings, setSettings } from "@/ipc/app";
import { DEFAULT_SETTINGS, type Settings } from "@/ipc/types";

const MAX_RECENT_DOCS = 30;

interface SettingsState extends Settings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
  toggleTheme: () => void;
  /** Remember an opened document at the top of the Recents list. */
  recordRecentDoc: (path: string, name: string) => void;
}

function pickSettings(s: SettingsState): Settings {
  return {
    theme: s.theme,
    density: s.density,
    editorMode: s.editorMode,
    fileView: s.fileView,
    vimMode: s.vimMode,
    showLineNumbers: s.showLineNumbers,
    proseFont: s.proseFont,
    locale: s.locale,
    lastVault: s.lastVault,
    lastExportDir: s.lastExportDir,
    autoPackageHtml: s.autoPackageHtml,
    recentDocs: s.recentDocs,
  };
}

/** Reflect theme + density onto <html> so the CSS token layer can switch. */
export function applyChrome(s: Pick<Settings, "theme" | "density">): void {
  const root = document.documentElement;
  if (s.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", s.theme);
  root.setAttribute("data-density", s.density);
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    try {
      const s = await getSettings();
      applyChrome(s);
      setActiveLocale(resolveLocale(s.locale));
      set({ ...s, loaded: true });
    } catch (e) {
      console.error("failed to load settings, using defaults", e);
      applyChrome(DEFAULT_SETTINGS);
      setActiveLocale(resolveLocale(DEFAULT_SETTINGS.locale));
      set({ loaded: true });
    }
  },

  update: (patch) => {
    set(patch);
    const next = pickSettings(get());
    applyChrome(next);
    setActiveLocale(resolveLocale(next.locale));
    void setSettings(next).catch((e) => console.error("failed to persist settings", e));
  },

  toggleTheme: () => {
    const current = get().theme;
    // Resolve "system" to its rendered value before flipping.
    const isDark =
      current === "dark" ||
      (current === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    get().update({ theme: isDark ? "light" : "dark" });
  },

  recordRecentDoc: (path, name) => {
    const without = get().recentDocs.filter((r) => r.path !== path);
    const recentDocs = [{ path, name, openedAt: Date.now() }, ...without].slice(0, MAX_RECENT_DOCS);
    get().update({ recentDocs });
  },
}));
