import { create } from "zustand";

/** Progress for the "make a .velq" job — rendering, fetching link previews, and
 * bundling assets take real time (network), so the UI shows a live overlay
 * instead of freezing. `total`/`current` drive a bar when a step has countable
 * items (e.g. N link previews); otherwise it's an indeterminate spinner. */
interface PackagingState {
  active: boolean;
  label: string;
  current: number;
  total: number;
  begin: (label: string) => void;
  update: (label: string, current?: number, total?: number) => void;
  end: () => void;
}

export const usePackaging = create<PackagingState>((set) => ({
  active: false,
  label: "",
  current: 0,
  total: 0,
  begin: (label) => set({ active: true, label, current: 0, total: 0 }),
  update: (label, current = 0, total = 0) => set({ label, current, total }),
  end: () => set({ active: false, label: "", current: 0, total: 0 }),
}));
