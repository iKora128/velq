import type { Version } from "@/ipc/types";

/** A run of saves with no long idle gap between them — one sitting at the desk.
 * Autosave records many versions per session; grouping keeps the timeline reading
 * as "~one entry per session" (spec §4.2) instead of a keystroke firehose. */
export interface Session {
  /** Member versions, newest-first (same order as the input list). */
  versions: Version[];
}

/** Treat saves more than 20 minutes apart as separate work sessions. */
export const SESSION_GAP_SEC = 20 * 60;

/**
 * Coalesce a newest-first version list into sessions. Adjacent versions belong to
 * the same session when the gap between them is at most `gapSec`. Pure/display-only:
 * every version is preserved and stays individually selectable once expanded.
 */
export function groupIntoSessions(versions: Version[], gapSec = SESSION_GAP_SEC): Session[] {
  const sessions: Session[] = [];
  for (const v of versions) {
    const cur = sessions[sessions.length - 1];
    const newer = cur?.versions[cur.versions.length - 1]; // last added = the newer neighbour
    if (cur && newer && newer.time - v.time <= gapSec) {
      cur.versions.push(v);
    } else {
      sessions.push({ versions: [v] });
    }
  }
  return sessions;
}
