import { useEffect, useRef } from "react";
import { useDoc } from "@/store/doc";
import { useUI } from "@/store/ui";
import "./explorer.css";
import { SelectionBar } from "./SelectionBar";
import { Sidebar } from "./Sidebar";

/** The full-window file browser (Finder-like). It's the *same* panel as the editor's
 * left side, just stretched full-width (`full`) — one browser, one search box, the
 * list / tree / columns / icons switch at its foot. Opening a document jumps to the
 * editor. */
export function ExplorerView() {
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

  return (
    <div className="explorer">
      <Sidebar finder full />
      <SelectionBar />
    </div>
  );
}
