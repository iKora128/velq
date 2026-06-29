import { type CSSProperties, useState } from "react";
import { HistoryPanel } from "@/history/HistoryPanel";
import { useHistory } from "@/store/history";
import { useUI } from "@/store/ui";
import { EditorPane } from "./EditorPane";
import { FileListPane } from "./FileListPane";
import { PaneDivider } from "./PaneDivider";
import { Sidebar } from "./Sidebar";

/** The writing workspace: tree + previewed file list + editor (+ history). */
export function EditorWorkspace() {
  const [sidebarW, setSidebarW] = useState(240);
  const [listW, setListW] = useState(280);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const historyOpen = useHistory((s) => s.open);

  const vars = { "--sidebar-w": `${sidebarW}px`, "--list-w": `${listW}px` } as CSSProperties;

  return (
    <div className="app-body" style={vars}>
      {!sidebarCollapsed && (
        <>
          <Sidebar />
          <PaneDivider value={sidebarW} min={180} max={420} onChange={setSidebarW} />
        </>
      )}
      {!historyOpen && (
        <>
          <FileListPane />
          <PaneDivider value={listW} min={220} max={520} onChange={setListW} />
        </>
      )}
      <EditorPane />
      {historyOpen && <HistoryPanel />}
    </div>
  );
}
