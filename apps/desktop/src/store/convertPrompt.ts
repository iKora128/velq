import { create } from "zustand";

/** Drives the "make a .velq?" confirmation modal shown when Markdown/HTML files are
 * dropped in. `paths` non-null ⇒ the modal is open, deciding on those files. */
interface ConvertPromptState {
  paths: string[] | null;
  open: (paths: string[]) => void;
  close: () => void;
}

export const useConvertPrompt = create<ConvertPromptState>((set) => ({
  paths: null,
  open: (paths) => set({ paths }),
  close: () => set({ paths: null }),
}));
