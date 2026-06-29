import type { Version } from "@/ipc/types";
import { useHistory } from "@/store/history";
import { clockTime, relativeTime } from "@/util/time";

/** Header above a diff: non-destructive restore + back-to-editing (plan §10). */
export function DiffBar({ version }: { version: Version }) {
  const restore = useHistory((s) => s.restore);
  const select = useHistory((s) => s.select);

  return (
    <div className="diff-bar">
      <span className="diff-bar__label">
        What changed since {clockTime(version.time)} ({relativeTime(version.time)})
      </span>
      <div className="diff-bar__spacer" />
      <button type="button" className="btn btn--sm" onClick={() => void select(null)}>
        Back to editing
      </button>
      <button
        type="button"
        className="btn btn--sm btn--primary"
        onClick={() => void restore(version)}
      >
        Restore this version
      </button>
    </div>
  );
}
