import { create } from "zustand";
import type { FileNode } from "@/ipc/types";

interface BatchRenameState {
  /** The files being renamed — snapshotted when the dialog opens (so it's stable
   * even as the folder reloads). Empty when the dialog is closed. */
  targets: FileNode[];
  open: (targets: FileNode[]) => void;
  close: () => void;
}

export const useBatchRename = create<BatchRenameState>((set) => ({
  targets: [],
  open: (targets) => set({ targets }),
  close: () => set({ targets: [] }),
}));
