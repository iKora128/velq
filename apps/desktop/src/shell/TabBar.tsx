import { X } from "lucide-react";
import { useDoc } from "@/store/doc";
import { cn } from "@/util/cn";

export function TabBar() {
  const tabs = useDoc((s) => s.tabs);
  const activeId = useDoc((s) => s.activeId);
  const activate = useDoc((s) => s.activate);
  const close = useDoc((s) => s.close);

  return (
    <div className="tabbar" role="tablist">
      {tabs.map((t) => (
        <div
          key={t.doc.id}
          role="tab"
          tabIndex={0}
          aria-selected={t.doc.id === activeId}
          className={cn("tab", t.doc.id === activeId && "tab--active", t.preview && "tab--preview")}
          onClick={() => activate(t.doc.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") activate(t.doc.id);
          }}
        >
          <span className="tab__name">{t.doc.name}</span>
          <button
            type="button"
            className={cn("tab__close", t.dirty && "tab__close--dirty")}
            aria-label={`Close ${t.doc.name}`}
            onClick={(e) => {
              e.stopPropagation();
              close(t.doc.id);
            }}
          >
            {t.dirty ? <span className="tab__dirty" /> : <X size={13} />}
          </button>
        </div>
      ))}
    </div>
  );
}
