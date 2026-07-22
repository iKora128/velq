import {
  Columns3,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  ListTree,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useRef } from "react";
import { FileList } from "@/filemanager/FileList";
import { Tree } from "@/filemanager/Tree";
import { useT } from "@/i18n/useT";
import type { SidebarView } from "@/ipc/types";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import { GridBrowser } from "./GridBrowser";
import { MillerColumns } from "./MillerColumns";
import { NewDocButton } from "./NewDocButton";

/** The one file browser — the editor's left panel, and with `full` the whole Files
 * view. A single search box works in every mode; the footer switch flips between
 * **list** (previewed cards) · **tree** · **columns** · **icons**, all views of the
 * same files. There is no separate "file list" pane any more: list is just a mode. */
export function Sidebar({ finder = false, full = false }: { finder?: boolean; full?: boolean }) {
  const t = useT();
  const root = useVault((s) => s.root);
  const open = useVault((s) => s.open);
  const setting = useSettings((s) => s.sidebarView);
  const view: SidebarView = finder ? setting : "list";
  const searchQuery = useFiles((s) => s.searchQuery);
  const timer = useRef(0);

  const onSearch = (value: string) => {
    useFiles.setState({ searchQuery: value }); // controlled input updates immediately
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void useFiles.getState().runSearch(value), 140);
  };
  const newFolder = () => {
    const f = useFiles.getState();
    void f.newFolder(f.targetDir());
  };

  // A live search overrides whatever mode you're in with ranked results (search is
  // inherently flat) — that's how one search box serves every view.
  const searching = searchQuery.trim().length > 0;

  return (
    <aside className={cn("sidebar", full && "sidebar--full")} data-view={view}>
      <div className="pane-head">
        <div className="search">
          <Search size={15} />
          <input
            type="text"
            placeholder={t("filelist.searchPlaceholder")}
            spellCheck={false}
            disabled={!root}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search__clear"
              aria-label={t("common.clearSearch")}
              onClick={() => useFiles.getState().clearSearch()}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {root && (
          <>
            <NewDocButton />
            <button
              type="button"
              className="icon-btn"
              title={t("common.newFolder")}
              aria-label={t("common.newFolder")}
              onClick={newFolder}
            >
              <FolderPlus size={16} />
            </button>
          </>
        )}
      </div>

      {root ? (
        <>
          {searching || view === "list" ? (
            <FileList />
          ) : view === "columns" ? (
            <MillerColumns />
          ) : view === "icons" ? (
            <GridBrowser />
          ) : (
            <Tree />
          )}
          {finder && <ViewSwitch view={setting} />}
        </>
      ) : (
        <SidebarEmpty onOpen={open} />
      )}
    </aside>
  );
}

/** Finder-style view switch pinned to the panel's foot (list / tree / columns / icons). */
function ViewSwitch({ view }: { view: SidebarView }) {
  const t = useT();
  const items: { v: SidebarView; icon: ReactNode; label: string }[] = [
    { v: "list", icon: <List size={15} />, label: t("sidebar.view.list") },
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
