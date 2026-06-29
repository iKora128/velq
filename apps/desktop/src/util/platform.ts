/** Platform detection for OS-correct shortcut rendering (⌘ vs Ctrl). */
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
export const isMac = /Mac|iPhone|iPad|iPod/.test(ua);

export const MOD = isMac ? "⌘" : "Ctrl";
export const ALT = isMac ? "⌥" : "Alt";
export const SHIFT = isMac ? "⇧" : "Shift";

/** Render a logical "Mod+Shift+P" binding into OS-appropriate glyphs/words. */
export function fmtShortcut(combo: string): string {
  return combo
    .replace(/Mod/g, MOD)
    .replace(/Alt/g, ALT)
    .replace(/Shift/g, SHIFT)
    .replace(/\+/g, isMac ? "" : "+");
}
