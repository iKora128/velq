import { History as HistoryIcon, X } from "lucide-react";
import { useEffect } from "react";
import type { Version } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { cn } from "@/util/cn";
import { clockTime, dayGroup, relativeTime } from "@/util/time";
import "./history.css";

export function HistoryPanel() {
  const versions = useHistory((s) => s.versions);
  const selected = useHistory((s) => s.selected);
  const select = useHistory((s) => s.select);
  const hide = useHistory((s) => s.hide);
  const hasDoc = useDoc((s) => !!s.doc?.path);
  const docId = useDoc((s) => s.doc?.id);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when the active doc changes.
  useEffect(() => {
    void useHistory.getState().load();
  }, [docId]);

  const groups: { label: string; items: Version[] }[] = [];
  for (const v of versions) {
    const label = dayGroup(v.time);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(v);
    else groups.push({ label, items: [v] });
  }

  return (
    <aside className="history-panel">
      <div className="pane-head">
        <span className="history-panel__title">
          <HistoryIcon size={15} />
          Version history
        </span>
        <button type="button" className="icon-btn" aria-label="Close history" onClick={hide}>
          <X size={16} />
        </button>
      </div>

      {!hasDoc ? (
        <div className="empty">
          <p className="empty__hint">Open a saved document to see its history.</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="empty">
          <p className="empty__hint">Your save points will appear here as you write.</p>
        </div>
      ) : (
        <div className="history-list">
          {groups.map((g) => (
            <div className="history-group" key={g.label}>
              <div className="history-group__label">{g.label}</div>
              {g.items.map((v, i) => (
                <button
                  type="button"
                  key={v.id}
                  className={cn("history-item", selected?.id === v.id && "is-selected")}
                  onClick={() => void select(v)}
                >
                  <div className="history-item__row">
                    <span className="history-item__time">
                      {i === 0 && g.label === "Today" ? relativeTime(v.time) : clockTime(v.time)}
                    </span>
                    {v.label && <span className="history-item__name">{v.label}</span>}
                  </div>
                  <div className="history-item__summary">{v.summary}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
