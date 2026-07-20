import { type CSSProperties, useState } from "react";
import { HistoryPanel } from "@/history/HistoryPanel";
import { useAcp } from "@/store/acp";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { AgentPanel } from "./AgentPanel";
import { EditorPane } from "./EditorPane";
import { PaneDivider } from "./PaneDivider";
import { SecondPane } from "./SecondPane";
import { Sidebar } from "./Sidebar";

/** The writing workspace: one file browser (list / tree / columns / icons) + editor
 *  (+ optional split and history). */
export function EditorWorkspace() {
  const [sidebarW, setSidebarW] = useState(280);
  // Columns/icons need room to breathe, so the panel keeps its own wider width there
  // (like Finder widening for column view) — independent of the slim list/tree width.
  const [wideW, setWideW] = useState(460);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const historyOpen = useHistory((s) => s.open);
  const acpOpen = useAcp((s) => s.open);
  const hasSecond = useDoc((s) => !!s.secondaryId);
  const [secondW, setSecondW] = useState(460);
  const view = useSettings((s) => s.sidebarView);
  const wide = view === "columns" || view === "icons";
  const sideW = wide ? wideW : sidebarW;

  const vars = {
    "--sidebar-w": `${sideW}px`,
    "--second-w": `${secondW}px`,
  } as CSSProperties;

  return (
    <div className="app-body" style={vars}>
      {/* The one file browser closes with a single toggle (⌘\ or the toolbar button),
          so it's always one click from returning. */}
      {!sidebarCollapsed && (
        <>
          <Sidebar finder />
          {wide ? (
            <PaneDivider value={wideW} min={320} max={760} onChange={setWideW} />
          ) : (
            <PaneDivider value={sidebarW} min={200} max={460} onChange={setSidebarW} />
          )}
        </>
      )}
      <EditorPane />
      {hasSecond && !historyOpen && !acpOpen && (
        <>
          <PaneDivider value={secondW} min={320} max={900} onChange={setSecondW} invert />
          <SecondPane />
        </>
      )}
      {historyOpen && !acpOpen && <HistoryPanel />}
      {acpOpen && <AgentPanel />}
    </div>
  );
}
