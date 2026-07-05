import { Columns3, LayoutGrid, List, PanelLeft } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import "./explorer.css";
import { FileListPane } from "./FileListPane";
import { GridBrowser } from "./GridBrowser";
import { MillerColumns } from "./MillerColumns";
import { PaneDivider } from "./PaneDivider";
import { SelectionBar } from "./SelectionBar";
import { Sidebar } from "./Sidebar";

/** A dedicated, full-window file browser (Finder-like): list mode (tree + previewed
 * cards) or column mode (Miller columns). Opening a document jumps to the editor. */
export function ExplorerView() {
  const t = useT();
  const fileView = useSettings((s) => s.fileView);
  const update = useSettings((s) => s.update);
  const root = useVault((s) => s.root);
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const activeId = useDoc((s) => s.activeId);

  // Browse here, open to edit: jump to the editor only when a *new* doc opens
  // (not when entering the explorer with one already open).
  const lastActive = useRef(activeId);
  useEffect(() => {
    if (view === "explorer" && activeId && activeId !== lastActive.current) {
      setView("editor");
    }
    lastActive.current = activeId;
  }, [view, activeId, setView]);

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);

  return (
    <div className="explorer">
      <div className="explorer__toolbar">
        {fileView === "list" && (
          <button
            type="button"
            className={cn("icon-btn", !sidebarCollapsed && "icon-btn--active")}
            title={t("common.toggleSidebar")}
            aria-label={t("common.toggleSidebar")}
            aria-pressed={!sidebarCollapsed}
            onClick={() => useUI.getState().toggleSidebar()}
          >
            <PanelLeft size={15} />
          </button>
        )}
        <span className="explorer__title">{root ? root.name : t("explorer.defaultName")}</span>
        <div className="explorer__spacer" />
        <div className="seg">
          <button
            type="button"
            className="seg__item"
            aria-pressed={fileView !== "columns" && fileView !== "list"}
            onClick={() => update({ fileView: "grid" })}
          >
            <LayoutGrid size={14} /> {t("explorer.view.grid")}
          </button>
          <button
            type="button"
            className="seg__item"
            aria-pressed={fileView === "list"}
            onClick={() => update({ fileView: "list" })}
          >
            <List size={14} /> {t("explorer.view.list")}
          </button>
          <button
            type="button"
            className="seg__item"
            aria-pressed={fileView === "columns"}
            onClick={() => update({ fileView: "columns" })}
          >
            <Columns3 size={14} /> {t("explorer.view.columns")}
          </button>
        </div>
      </div>
      <div className="explorer__body">
        {fileView === "columns" ? (
          <MillerColumns />
        ) : fileView === "list" ? (
          <ListBrowser />
        ) : (
          <GridBrowser />
        )}
      </div>
      <SelectionBar />
    </div>
  );
}

function ListBrowser() {
  const [sidebarW, setSidebarW] = useState(300);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const vars = { "--sidebar-w": `${sidebarW}px` } as CSSProperties;
  return (
    <div className={cn("explorer-list")} style={vars}>
      {!sidebarCollapsed && (
        <>
          <Sidebar />
          <PaneDivider value={sidebarW} min={220} max={480} onChange={setSidebarW} />
        </>
      )}
      <FileListPane />
    </div>
  );
}
