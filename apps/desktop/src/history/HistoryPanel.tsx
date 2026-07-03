import { ChevronDown, ChevronRight, History as HistoryIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/i18n/useT";
import type { Version } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { cn } from "@/util/cn";
import { clockTime, dayGroupLabel, dayKey, relativeTime } from "@/util/time";
import { groupIntoSessions } from "./sessions";
import "./history.css";

export function HistoryPanel() {
  const versions = useHistory((s) => s.versions);
  const selected = useHistory((s) => s.selected);
  const select = useHistory((s) => s.select);
  const hide = useHistory((s) => s.hide);
  const hasDoc = useDoc((s) => !!s.doc?.path);
  const docId = useDoc((s) => s.doc?.id);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const t = useT();
  const locale = useLocale();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when the active doc changes.
  useEffect(() => {
    void useHistory.getState().load();
    setExpanded(new Set());
  }, [docId]);

  const days: { key: string; time: number; items: Version[] }[] = [];
  for (const v of versions) {
    const key = dayKey(v.time);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(v);
    else days.push({ key, time: v.time, items: [v] });
  }

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const versionRow = (v: Version, time: string, child = false) => (
    <button
      type="button"
      key={v.id}
      className={cn(
        "history-item",
        child && "history-item--child",
        selected?.id === v.id && "is-selected",
      )}
      onClick={() => void select(v)}
    >
      <div className="history-item__row">
        <span className="history-item__time">{time}</span>
        {v.label && <span className="history-item__name">{v.label}</span>}
      </div>
      <div className="history-item__summary">{v.summary}</div>
    </button>
  );

  return (
    <aside className="history-panel">
      <div className="pane-head">
        <span className="history-panel__title">
          <HistoryIcon size={15} />
          {t("history.title")}
        </span>
        <button type="button" className="icon-btn" aria-label={t("history.close")} onClick={hide}>
          <X size={16} />
        </button>
      </div>

      {!hasDoc ? (
        <div className="empty">
          <p className="empty__hint">{t("history.emptyNoDoc")}</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="empty">
          <p className="empty__hint">{t("history.emptyNoVersions")}</p>
        </div>
      ) : (
        <div className="history-list">
          {days.map((day, di) => (
            <div className="history-group" key={day.key}>
              <div className="history-group__label">{dayGroupLabel(day.time, t, locale)}</div>
              {groupIntoSessions(day.items).map((session, si) => {
                const newest = session.versions[0];
                // The latest save overall reads "just now / 2m ago"; the rest show a clock time.
                const newestLabel =
                  di === 0 && si === 0 && day.key === "today"
                    ? relativeTime(newest.time, t, locale)
                    : clockTime(newest.time, locale);

                // A lone save is just a row — no session chrome.
                if (session.versions.length === 1) return versionRow(newest, newestLabel);

                const isOpen = expanded.has(newest.id);
                const older = session.versions.slice(1);
                return (
                  <div className="history-session" key={newest.id}>
                    <button
                      type="button"
                      className={cn(
                        "history-item history-session__head",
                        selected?.id === newest.id && "is-selected",
                      )}
                      aria-expanded={isOpen}
                      title={t("history.sessionSaves", { count: session.versions.length })}
                      onClick={() => {
                        toggle(newest.id);
                        void select(newest);
                      }}
                    >
                      <div className="history-item__row">
                        <span className="history-session__chevron">
                          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </span>
                        <span className="history-item__time">{newestLabel}</span>
                        {newest.label && <span className="history-item__name">{newest.label}</span>}
                        <span className="history-session__count">{session.versions.length}</span>
                      </div>
                      <div className="history-item__summary">{newest.summary}</div>
                    </button>
                    {isOpen && older.map((v) => versionRow(v, clockTime(v.time, locale), true))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
