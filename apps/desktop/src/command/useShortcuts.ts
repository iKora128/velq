import { useEffect } from "react";
import { useAcp } from "@/store/acp";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { usePalette } from "@/store/palette";
import { useUI } from "@/store/ui";
import { isMac } from "@/util/platform";
import { ACTIONS } from "./actions";

function run(id: string) {
  ACTIONS.find((a) => a.id === id)?.run();
}

/** Global keybindings (plan §5.3). `Mod` = ⌘ on macOS, Ctrl elsewhere. Mod+B is
 * intentionally NOT bound (it's bold in the editor). */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLElement &&
        e.target.closest("input, textarea, [contenteditable='true']");

      // "?" opens the shortcut cheat-sheet when not typing.
      if (e.key === "?" && !inField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        usePalette.getState().toggleCheatsheet();
        return;
      }

      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const p = usePalette.getState();

      // ---- Chrome-style tab shortcuts ----
      // ⌘⌥←/→ walks the tab strip (⌃⇥ / ⌃⇧⇥ ride the native menu, so they also
      // work while focus is inside the HTML preview). Alt distinguishes these from
      // the editor's plain-arrow motion.
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        if (e.key === "ArrowRight") useDoc.getState().activateNext();
        else useDoc.getState().activatePrev();
        return;
      }
      // ⌘1–8 jump to that tab; ⌘9 to the last one (as in Chrome/Safari).
      if (!e.shiftKey && !e.altKey && /^[1-9]$/.test(k)) {
        e.preventDefault();
        useDoc.getState().activateIndex(k === "9" ? Number.MAX_SAFE_INTEGER : Number(k) - 1);
        return;
      }

      // File-operation undo/redo — only outside the editor (which has its own
      // text undo) and text fields, so ⌘Z there still edits text.
      const inEditor = e.target instanceof HTMLElement && e.target.closest(".cm-editor");
      if (k === "z" && !inField && !inEditor) {
        e.preventDefault();
        if (e.shiftKey) void useFiles.getState().redo();
        else void useFiles.getState().undo();
        return;
      }

      if (k === "k") {
        e.preventDefault();
        p.openWith("");
      } else if (k === "p" && e.shiftKey) {
        e.preventDefault();
        p.openWith(">");
      } else if (k === "p") {
        e.preventDefault();
        p.openWith("");
      } else if (k === "f" && e.shiftKey) {
        e.preventDefault();
        p.openWith("");
      } else if (k === "n" && e.shiftKey) {
        e.preventDefault();
        run("new-folder");
      } else if (k === "n") {
        e.preventDefault();
        run("new-doc");
      } else if (k === "s") {
        e.preventDefault();
        run("save");
      } else if (k === "o") {
        e.preventDefault();
        run("open-folder");
      } else if (k === "t" && !e.shiftKey) {
        // New tab (⌘T). ⌘⇧T (reopen closed) is a native menu accelerator.
        e.preventDefault();
        useDoc.getState().openScratch();
      } else if (k === "\\") {
        e.preventDefault();
        useUI.getState().toggleSidebar();
      } else if (k === "j") {
        // ⌘J toggles the AI assistant dock (⌘I stays free for the editor's italic).
        e.preventDefault();
        useAcp.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
