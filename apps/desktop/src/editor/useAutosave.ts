import { useEffect } from "react";
import { saveActive } from "@/command/actions";
import { useDoc } from "@/store/doc";

/** Save ~2s after the writer stops typing. */
const IDLE_MS = 2000;
/** …and at least this often during one unbroken writing burst, so a long session
 * is never a single giant unsaved stretch. (spec §4.2 cadence) */
const MAX_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Autosave — Velq keeps the "All changes saved" promise so the writer never has to
 * think about ⌘S (spec §0-4, curing Obsidian's invisible-autosave anxiety). The
 * active document is saved shortly after typing pauses, and at least every ten
 * minutes of continuous editing. ⌘S still works as an explicit checkpoint, and
 * closing a tab flushes too (see `useDoc.close`).
 *
 * Every save is a real version; the history panel coalesces them into per-session
 * groups (see `groupIntoSessions`) so the timeline stays readable rather than a
 * keystroke firehose. Mounted once at the app shell so it stays alive across view
 * switches (a dirty doc keeps saving even when you're browsing files).
 */
export function useAutosave() {
  useEffect(() => {
    let idle = 0;
    let lastSaveAt = Date.now();
    let saving = false;

    const flush = () => {
      const { dirty, doc } = useDoc.getState();
      if (saving || !dirty || !doc?.path) return;
      saving = true;
      lastSaveAt = Date.now();
      void saveActive().finally(() => {
        saving = false;
      });
    };

    const unsub = useDoc.subscribe((s, prev) => {
      // React only to real edits — not tab switches or dirty/flag changes.
      if (s.content === prev.content) return;
      window.clearTimeout(idle);
      if (Date.now() - lastSaveAt >= MAX_INTERVAL_MS) flush();
      else idle = window.setTimeout(flush, IDLE_MS);
    });

    return () => {
      window.clearTimeout(idle);
      unsub();
    };
  }, []);
}
