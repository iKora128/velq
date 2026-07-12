import {
  Columns3,
  FilePlus,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  ListTree,
  PanelLeft,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tree } from "@/filemanager/Tree";
import { useT } from "@/i18n/useT";
import type { SidebarView } from "@/ipc/types";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import { GridBrowser } from "./GridBrowser";
import { MillerColumns } from "./MillerColumns";

/** The editor's left panel. In `finder` mode it's a real file browser you can flip
 *  between an outline **tree**, Finder **columns** and an **icon** grid via the footer
 *  switch; otherwise it stays the plain tree (used inside the Explorer's list mode). */
export function Sidebar({ finder = false }: { finder?: boolean }) {
  const t = useT();
  const root = useVault((s) => s.root);
  const open = useVault((s) => s.open);
  const setting = useSettings((s) => s.sidebarView);
  const view: SidebarView = finder ? setting : "tree";

  return (
    <aside className="sidebar" data-view={view}>
      <div className="pane-head">
        <div className="brand">
          <span className="brand__mark" aria-hidden />
          Velq
        </div>
        <button
          type="button"
          className="icon-btn"
          title={t("common.toggleSidebar")}
          aria-label={t("common.toggleSidebar")}
          onClick={() => useUI.getState().toggleSidebar()}
        >
          <PanelLeft size={16} />
        </button>
      </div>

      {root ? (
        <>
          {/* Columns has no header of its own, so it keeps the vault head (name + New).
              Icons has its own breadcrumb bar with New, so we drop the duplicate. */}
          {view !== "icons" && <VaultHead name={root.name} />}
          {view === "columns" ? <MillerColumns /> : view === "icons" ? <GridBrowser /> : <Tree />}
          {finder && <ViewSwitch view={setting} />}
        </>
      ) : (
        <SidebarEmpty onOpen={open} />
      )}
    </aside>
  );
}

function VaultHead({ name }: { name: string }) {
  const t = useT();
  const newFile = () => {
    const f = useFiles.getState();
    void f.newFile(f.targetDir());
  };
  const newFolder = () => {
    const f = useFiles.getState();
    void f.newFolder(f.targetDir());
  };

  return (
    <div className="vault-head">
      <span className="vault-head__name" title={name}>
        {name}
      </span>
      <div className="vault-head__actions">
        <button
          type="button"
          className="icon-btn"
          title={t("common.newDoc")}
          aria-label={t("common.newDoc")}
          onClick={newFile}
        >
          <FilePlus size={15} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t("common.newFolder")}
          aria-label={t("common.newFolder")}
          onClick={newFolder}
        >
          <FolderPlus size={15} />
        </button>
      </div>
    </div>
  );
}

/** Finder-style view switch pinned to the panel's foot (tree / columns / icons). */
function ViewSwitch({ view }: { view: SidebarView }) {
  const t = useT();
  const items: { v: SidebarView; icon: ReactNode; label: string }[] = [
    { v: "tree", icon: <ListTree size={15} />, label: t("sidebar.view.tree") },
    { v: "columns", icon: <Columns3 size={15} />, label: t("sidebar.view.columns") },
    { v: "icons", icon: <LayoutGrid size={15} />, label: t("sidebar.view.icons") },
  ];
  const current = items.find((i) => i.v === view);
  return (
    <div className="sidebar-foot">
      {items.map((it) => (
        <button
          key={it.v}
          type="button"
          className={cn("sidebar-foot__btn", view === it.v && "is-on")}
          title={it.label}
          aria-label={it.label}
          aria-pressed={view === it.v}
          onClick={() => useSettings.getState().update({ sidebarView: it.v })}
        >
          {it.icon}
        </button>
      ))}
      <span className="sidebar-foot__label">{current?.label}</span>
    </div>
  );
}

function SidebarEmpty({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  return (
    <div className="sidebar__scroll">
      <div className="empty">
        <FolderOpen className="empty__icon" size={28} strokeWidth={1.5} />
        <div className="empty__title">{t("sidebar.emptyTitle")}</div>
        <p className="empty__hint">{t("sidebar.emptyHint")}</p>
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          {t("common.openFolder")}
        </button>
      </div>
    </div>
  );
}
