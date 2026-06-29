import { create } from "zustand";

interface PaletteState {
  open: boolean;
  /** Initial query — "" = quick-open files, ">" = commands, "@" = headings, ":" = line. */
  initial: string;
  cheatsheet: boolean;
  plugins: boolean;
  openWith: (initial: string) => void;
  close: () => void;
  toggleCheatsheet: () => void;
  togglePlugins: () => void;
}

export const usePalette = create<PaletteState>((set) => ({
  open: false,
  initial: "",
  cheatsheet: false,
  plugins: false,
  openWith: (initial) => set({ open: true, initial }),
  close: () => set({ open: false }),
  toggleCheatsheet: () => set((s) => ({ cheatsheet: !s.cheatsheet })),
  togglePlugins: () => set((s) => ({ plugins: !s.plugins })),
}));
