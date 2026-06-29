import { useEffect } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "@/store/palette";
import { fmtShortcut } from "@/util/platform";
import "./cheatsheet.css";

const ROWS: [string, string][] = [
  ["Command palette", "Mod+K"],
  ["Quick-open a file", "Mod+P"],
  ["Run a command", "Mod+Shift+P"],
  ["New document", "Mod+N"],
  ["New folder", "Mod+Shift+N"],
  ["Save", "Mod+S"],
  ["Open folder", "Mod+O"],
  ["Toggle sidebar", "Mod+\\"],
  ["Quick Look", "Space"],
  ["Rename", "Return"],
  ["Shortcuts", "?"],
];

const LITERAL = new Set(["Space", "Return", "?"]);

export function Cheatsheet() {
  const open = usePalette((s) => s.cheatsheet);
  const toggle = usePalette((s) => s.toggleCheatsheet);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  if (!open) return null;

  return createPortal(
    <div className="cheat-backdrop anim-fade" onClick={toggle} role="presentation">
      <div
        className="cheat anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <h2 className="cheat__title">Keyboard shortcuts</h2>
        <div className="cheat__grid">
          {ROWS.map(([label, combo]) => (
            <div className="cheat__row" key={label}>
              <span>{label}</span>
              <span className="kbd">{LITERAL.has(combo) ? combo : fmtShortcut(combo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
