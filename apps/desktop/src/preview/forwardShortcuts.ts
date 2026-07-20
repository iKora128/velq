import { isMac } from "@/util/platform";

/** Keys that, with the platform Mod held, are app shortcuts worth forwarding out
 * of a preview iframe. ⌘W and ⌃⇥/⌃⇧⇥ tab-nav deliberately aren't here: they live
 * on native menu accelerators, which the OS fires regardless of focus. */
const FORWARD_MOD_KEYS = new Set([
  "k",
  "p",
  "o",
  "n",
  "f",
  "s",
  "\\",
  "t",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

/**
 * Keep app/tab shortcuts working while focus is inside a preview iframe. An iframe
 * is its own document, so its keydown never bubbles to the window-level handler in
 * `useShortcuts`; we re-dispatch a synthetic keydown on the parent window for the
 * combos the app owns. ⌘Z and ⌘B/I/U are left alone — the contenteditable surface
 * owns undo and inline formatting. Returns a teardown.
 */
export function forwardAppShortcuts(idoc: Document): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "z" || k === "b" || k === "i" || k === "u") return; // handled in-frame
    // ⌘⌥←/→ walks the tab strip; everything else is a Mod+key app shortcut.
    const navArrow = e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight");
    if (!navArrow && !FORWARD_MOD_KEYS.has(k)) return;
    e.preventDefault();
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      }),
    );
  };
  idoc.addEventListener("keydown", onKeyDown, true);
  return () => idoc.removeEventListener("keydown", onKeyDown, true);
}
