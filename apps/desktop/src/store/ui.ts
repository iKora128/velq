import { create } from "zustand";

/** The top-level view the activity bar switches between. */
export type AppView = "explorer" | "editor" | "settings";

interface UIState {
  view: AppView;
  /** The folder TREE (left-most pane) is hidden. */
  sidebarCollapsed: boolean;
  /** The previewed FILE LIST pane is hidden. Independent of the tree — each of the
   * two left panes closes on its own; both toggles live in the toolbar so a hidden
   * pane is always one click from coming back. */
  fileListCollapsed: boolean;
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
  toggleFileList: () => void;
}

export const useUI = create<UIState>((set) => ({
  // Land on the file browser (icon grid), not a blank editor — the explorer is home.
  view: "explorer",
  sidebarCollapsed: false,
  fileListCollapsed: false,
  setView: (view) => set({ view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleFileList: () => set((s) => ({ fileListCollapsed: !s.fileListCollapsed })),
}));
