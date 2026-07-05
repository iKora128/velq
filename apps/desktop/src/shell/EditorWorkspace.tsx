import { type CSSProperties, useState } from "react";
import { HistoryPanel } from "@/history/HistoryPanel";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useUI } from "@/store/ui";
import { EditorPane } from "./EditorPane";
import { FileListPane } from "./FileListPane";
import { PaneDivider } from "./PaneDivider";
import { SecondPane } from "./SecondPane";
import { Sidebar } from "./Sidebar";

/** The writing workspace: tree + previewed file list + editor (+ history). */
export function EditorWorkspace() {
  const [sidebarW, setSidebarW] = useState(240);
  const [listW, setListW] = useState(280);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const historyOpen = useHistory((s) => s.open);
  const hasSecond = useDoc((s) => !!s.secondaryId);
  const [secondW, setSecondW] = useState(460);

  const vars = {
    "--sidebar-w": `${sidebarW}px`,
    "--list-w": `${listW}px`,
    "--second-w": `${secondW}px`,
  } as CSSProperties;

  return (
    <div className="app-body" style={vars}>
      {/* ⌘\ (or the toolbar panel button) hides the WHOLE left rail — tree and
          list together, VS Code-style. Hiding only the tree left an unclosable
          column, which read as broken. */}
      {!sidebarCollapsed && (
        <>
          <Sidebar />
          <PaneDivider value={sidebarW} min={180} max={420} onChange={setSidebarW} />
        </>
      )}
      {!historyOpen && !sidebarCollapsed && (
        <>
          <FileListPane />
          <PaneDivider value={listW} min={220} max={520} onChange={setListW} />
        </>
      )}
      <EditorPane />
      {hasSecond && !historyOpen && (
        <>
          <PaneDivider value={secondW} min={320} max={900} onChange={setSecondW} invert />
          <SecondPane />
        </>
      )}
      {historyOpen && <HistoryPanel />}
    </div>
  );
}
