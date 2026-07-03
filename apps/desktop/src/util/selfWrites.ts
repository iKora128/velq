/** Reconciles app-initiated writes with the filesystem watcher.
 *
 * When Velq saves a document it writes the file itself, which the vault watcher
 * then reports back as an `fs:changed` event. Without this guard that echo looks
 * like an *external* edit — reloading the editor (a jarring remount) or, if the
 * writer has since typed on, raising a false "this file changed on disk" conflict.
 * Autosave writes far more often than ⌘S, so the echo has to be filtered.
 *
 * Every write to an open document's path goes through the vcs IPC wrappers, which
 * `mark()` the path here; the `fs:changed` handler `consume()`s it and skips the
 * reload/conflict for that path. The window is short so a genuine external change
 * moments after our save is still noticed. */
const recent = new Map<string, number>();

/** How long after our write to treat a change to that path as our own echo. Long
 * enough to cover the watcher's debounce + FS-event latency, short enough not to
 * mask a real external edit that lands right after a save. */
const WINDOW_MS = 2500;

/** Record that we're about to write `path` (or just did). */
export function markSelfWrite(path: string): void {
  recent.set(path, Date.now() + WINDOW_MS);
}

/** True if `path` was written by us within the suppression window. */
export function wasSelfWrite(path: string): boolean {
  const expiry = recent.get(path);
  if (expiry === undefined) return false;
  if (Date.now() > expiry) {
    recent.delete(path);
    return false;
  }
  return true;
}
