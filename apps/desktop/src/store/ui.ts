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
  view: "editor",
  sidebarCollapsed: false,
  setView: (view) => set({ view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
