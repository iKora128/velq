import { Check, Gauge, MapPin, Moon, Pencil, Sun } from "lucide-react";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useVault } from "@/store/vault";

export function StatusBar() {
  const root = useVault((s) => s.root);
  const doc = useDoc((s) => s.doc);
  const dirty = useDoc((s) => s.dirty);
  const wordCount = useDoc((s) => s.wordCount);
  const theme = useSettings((s) => s.theme);
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
        {root ? root.path : "No vault"}
      </span>

      <div className="statusbar__spacer" />

      {doc && <span className="statusbar__item">{wordCount} words</span>}
      {doc && (
        <button
          type="button"
          className="statusbar__item statusbar__item--btn"
          title="Version history"
          onClick={() => useHistory.getState().show()}
        >
          {dirty ? (
            <>
              <Pencil size={12} /> Editing
            </>
          ) : (
            <>
              <Check size={12} /> Saved
            </>
          )}
        </button>
      )}
      <button
        type="button"
        className="statusbar__item statusbar__item--btn"
        title="Toggle density"
        onClick={() => update({ density: density === "compact" ? "comfortable" : "compact" })}
      >
        <Gauge size={12} />
      </button>
      <button
        type="button"
        className="statusbar__item statusbar__item--btn"
        title="Toggle theme"
        onClick={toggleTheme}
      >
        {isDark ? <Moon size={12} /> : <Sun size={12} />}
      </button>
    </footer>
  );
}
