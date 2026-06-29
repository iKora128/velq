import { TriangleAlert } from "lucide-react";
import { useDoc } from "@/store/doc";

/** Shown when a file changed on disk while the tab had unsaved edits (plan §10).
 * No data loss — the user chooses. */
export function ConflictBanner({ path }: { path: string }) {
  const reloadTab = useDoc((s) => s.reloadTab);
  const keepMine = useDoc((s) => s.keepMine);

  return (
    <div className="conflict-banner" role="alert">
      <TriangleAlert size={15} className="conflict-banner__icon" />
      <span className="conflict-banner__text">
        This file changed on disk while you were editing.
      </span>
      <button type="button" className="btn btn--sm" onClick={() => void reloadTab(path)}>
        Reload from disk
      </button>
      <button type="button" className="btn btn--sm" onClick={() => keepMine(path)}>
        Keep my version
      </button>
    </div>
  );
}
