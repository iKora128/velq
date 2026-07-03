import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import { usePalette } from "@/store/palette";
import { fmtShortcut } from "@/util/platform";
import "./cheatsheet.css";

const ROWS: [MsgKey, string][] = [
  ["cheatsheet.commandPalette", "Mod+K"],
  ["cheatsheet.quickOpen", "Mod+P"],
  ["cheatsheet.runCommand", "Mod+Shift+P"],
  ["cheatsheet.newDoc", "Mod+N"],
  ["cheatsheet.newFolder", "Mod+Shift+N"],
  ["cheatsheet.save", "Mod+S"],
  ["cheatsheet.openFolder", "Mod+O"],
  ["cheatsheet.toggleSidebar", "Mod+\\"],
  ["cheatsheet.quickLook", "Space"],
  ["cheatsheet.rename", "Return"],
  ["cheatsheet.shortcuts", "?"],
];

const LITERAL = new Set(["Space", "Return", "?"]);

export function Cheatsheet() {
  const open = usePalette((s) => s.cheatsheet);
  const toggle = usePalette((s) => s.toggleCheatsheet);
  const t = useT();

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
        aria-label={t("cheatsheet.title")}
      >
        <h2 className="cheat__title">{t("cheatsheet.title")}</h2>
        <div className="cheat__grid">
          {ROWS.map(([labelKey, combo]) => (
            <div className="cheat__row" key={labelKey}>
              <span>{t(labelKey)}</span>
              <span className="kbd">{LITERAL.has(combo) ? combo : fmtShortcut(combo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
