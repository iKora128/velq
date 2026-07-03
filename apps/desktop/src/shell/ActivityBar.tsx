import { FileUp, FolderTree, type LucideIcon, Moon, PenLine, Settings, Sun } from "lucide-react";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import { useSettings } from "@/store/settings";
import type { AppView } from "@/store/ui";
import { useUI } from "@/store/ui";
import { cn } from "@/util/cn";
import "./activitybar.css";

interface Item {
  view: AppView;
  icon: LucideIcon;
  label: MsgKey;
}

const TOP: Item[] = [
  { view: "explorer", icon: FolderTree, label: "activitybar.files" },
  { view: "editor", icon: PenLine, label: "activitybar.editor" },
];

/** VSCode-style left rail: switch the main view; theme + settings at the foot. */
export function ActivityBar() {
  const t = useT();
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const theme = useSettings((s) => s.theme);
  const toggleTheme = useSettings((s) => s.toggleTheme);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  return (
    <nav className="activitybar" aria-label={t("activitybar.viewsAria")}>
      {TOP.map(({ view: v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          className={cn("activitybar__btn", view === v && "is-active")}
          title={t(label)}
          aria-label={t(label)}
          aria-current={view === v}
          onClick={() => setView(v)}
        >
          <Icon size={22} strokeWidth={1.75} />
        </button>
      ))}

      <div className="activitybar__rule" />

      <button
        type="button"
        className="activitybar__btn"
        title={t("activitybar.packageHtmlTitle")}
        aria-label={t("activitybar.packageHtmlAria")}
        onClick={() => void openHtmlAndPackage()}
      >
        <FileUp size={22} strokeWidth={1.75} />
      </button>

      <div className="activitybar__spacer" />

      <button
        type="button"
        className="activitybar__btn"
        title={t("common.toggleTheme")}
        aria-label={t("common.toggleTheme")}
        onClick={toggleTheme}
      >
        {isDark ? <Moon size={20} strokeWidth={1.75} /> : <Sun size={20} strokeWidth={1.75} />}
      </button>
      <button
        type="button"
        className={cn("activitybar__btn", view === "settings" && "is-active")}
        title={t("activitybar.settings")}
        aria-label={t("activitybar.settings")}
        aria-current={view === "settings"}
        onClick={() => setView("settings")}
      >
        <Settings size={22} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
