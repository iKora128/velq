import { Pin, X } from "lucide-react";
import { useState } from "react";
import { ContextMenu } from "@/filemanager/ContextMenu";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";
import { cn } from "@/util/cn";

export function TabBar() {
  const tr = useT();
  const tabs = useDoc((s) => s.tabs);
  const activeId = useDoc((s) => s.activeId);
  const secondaryId = useDoc((s) => s.secondaryId);
  const activate = useDoc((s) => s.activate);
  const close = useDoc((s) => s.close);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const menuTab = menu ? tabs.find((t) => t.doc.id === menu.id) : null;

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
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, id: t.doc.id });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") activate(t.doc.id);
          }}
        >
          {t.pinned && <Pin size={11} className="tab__pin" aria-hidden />}
          <span className="tab__name">{t.doc.name}</span>
          <button
            type="button"
            className={cn("tab__close", t.dirty && "tab__close--dirty")}
            aria-label={tr("tab.close", { name: t.doc.name })}
            onClick={(e) => {
              e.stopPropagation();
              close(t.doc.id);
            }}
          >
            {t.dirty ? <span className="tab__dirty" /> : <X size={13} />}
          </button>
        </div>
      ))}
      {menu && menuTab && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          entries={[
            {
              label: tr(menuTab.pinned ? "tab.unpin" : "tab.pin"),
              onClick: () => useDoc.getState().togglePin(menu.id),
            },
            secondaryId === menu.id
              ? { label: tr("tab.closeSplit"), onClick: () => useDoc.getState().setSecondary(null) }
              : {
                  label: tr("tab.splitRight"),
                  onClick: () => useDoc.getState().setSecondary(menu.id),
                },
            { label: tr("tab.close", { name: menuTab.doc.name }), onClick: () => close(menu.id) },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
