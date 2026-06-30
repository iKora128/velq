import { create } from "zustand";

/** The top-level view the activity bar switches between. */
export type AppView = "explorer" | "editor" | "settings";

interface UIState {
  view: AppView;
  sidebarCollapsed: boolean;
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  // Land on the file browser (icon grid), not a blank editor — the explorer is home.
  view: "explorer",
  sidebarCollapsed: false,
  setView: (view) => set({ view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
