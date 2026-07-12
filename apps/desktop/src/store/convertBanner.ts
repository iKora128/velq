import { create } from "zustand";

/** Which open documents have dismissed the "make a .velq?" banner. Per-doc and
 * session-only — reopening the app offers it again. Dismissing never converts;
 * it just hides the gentle offer for that document. */
interface ConvertBannerState {
  dismissed: Set<string>;
  dismiss: (docId: string) => void;
}

export const useConvertBanner = create<ConvertBannerState>((set) => ({
  dismissed: new Set(),
  dismiss: (docId) => set((s) => ({ dismissed: new Set(s.dismissed).add(docId) })),
}));
