import { type CSSProperties, useState } from "react";
import { HistoryPanel } from "@/history/HistoryPanel";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { EditorPane } from "./EditorPane";
import { FileListPane } from "./FileListPane";
import { PaneDivider } from "./PaneDivider";
import { SecondPane } from "./SecondPane";
import { Sidebar } from "./Sidebar";

/** The writing workspace: file browser (tree / columns / icons) + previewed file
 *  list + editor (+ history). */
export function EditorWorkspace() {
  const [sidebarW, setSidebarW] = useState(240);
  // Columns/icons need room to breathe, so the panel keeps its own wider width there
  // (like Finder widening for column view) — independent of the slim tree width.
  const [wideW, setWideW] = useState(460);
  const [listW, setListW] = useState(280);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const fileListCollapsed = useUI((s) => s.fileListCollapsed);
  const historyOpen = useHistory((s) => s.open);
  const hasSecond = useDoc((s) => !!s.secondaryId);
  const [secondW, setSecondW] = useState(460);
  const wide = useSettings((s) => s.sidebarView) !== "tree";
  const sideW = wide ? wideW : sidebarW;

  const vars = {
    "--sidebar-w": `${sideW}px`,
    "--list-w": `${listW}px`,
    "--second-w": `${secondW}px`,
  } as CSSProperties;

  return (
    <div className="app-body" style={vars}>
      {/* The two left panes close independently (tree vs. file list). Both toggles
          also live in the toolbar, so a hidden pane is always one click from
          returning — no unclosable/unreopenable column. */}
      {!sidebarCollapsed && (
        <>
          <Sidebar finder />
          {wide ? (
            <PaneDivider value={wideW} min={320} max={760} onChange={setWideW} />
          ) : (
            <PaneDivider value={sidebarW} min={180} max={420} onChange={setSidebarW} />
          )}
        </>
      )}
      {!historyOpen && !fileListCollapsed && (
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
