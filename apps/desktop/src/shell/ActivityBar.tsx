import { FileUp, FolderTree, type LucideIcon, Moon, PenLine, Settings, Sun } from "lucide-react";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import { useSettings } from "@/store/settings";
import type { AppView } from "@/store/ui";
import { useUI } from "@/store/ui";
import { cn } from "@/util/cn";
import "./activitybar.css";

interface Item {
  view: AppView;
  icon: LucideIcon;
  label: string;
}

const TOP: Item[] = [
  { view: "explorer", icon: FolderTree, label: "Files" },
  { view: "editor", icon: PenLine, label: "Editor" },
];

/** VSCode-style left rail: switch the main view; theme + settings at the foot. */
export function ActivityBar() {
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const theme = useSettings((s) => s.theme);
  const toggleTheme = useSettings((s) => s.toggleTheme);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  return (
    <nav className="activitybar" aria-label="Views">
      {TOP.map(({ view: v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          className={cn("activitybar__btn", view === v && "is-active")}
          title={label}
          aria-label={label}
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
        title="Open & package an HTML file"
        aria-label="Open and package an HTML file"
        onClick={() => void openHtmlAndPackage()}
      >
        <FileUp size={22} strokeWidth={1.75} />
      </button>

      <div className="activitybar__spacer" />

      <button
        type="button"
        className="activitybar__btn"
        title="Toggle theme"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {isDark ? <Moon size={20} strokeWidth={1.75} /> : <Sun size={20} strokeWidth={1.75} />}
      </button>
      <button
        type="button"
        className={cn("activitybar__btn", view === "settings" && "is-active")}
        title="Settings"
        aria-label="Settings"
        aria-current={view === "settings"}
        onClick={() => setView("settings")}
      >
        <Settings size={22} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
