import { create } from "zustand";
import type { Version } from "@/ipc/types";
import { listVersions, restoreVersion, versionContent } from "@/ipc/vcs";
import { useDoc } from "./doc";
import { useToast } from "./toast";
import { useVault } from "./vault";

interface HistoryState {
  open: boolean;
  versions: Version[];
  selected: Version | null;
  /** The selected version's content — the baseline the current doc is diffed against. */
  baseContent: string | null;
  loading: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
  load: () => Promise<void>;
  select: (v: Version | null) => Promise<void>;
  restore: (v: Version) => Promise<void>;
}

function ctx(): { root: string; path: string } | null {
  const root = useVault.getState().root?.path;
  const path = useDoc.getState().doc?.path;
  return root && path ? { root, path } : null;
}

export const useHistory = create<HistoryState>((set, get) => ({
  open: false,
  versions: [],
  selected: null,
  baseContent: null,
  loading: false,

  toggle: () => {
    const next = !get().open;
    set({ open: next });
    if (next) void get().load();
    else set({ selected: null, baseContent: null });
  },
  show: () => {
    set({ open: true });
    void get().load();
  },
  hide: () => set({ open: false, selected: null, baseContent: null }),

  load: async () => {
    const c = ctx();
    if (!c) {
      set({ versions: [], selected: null, baseContent: null });
      return;
    }
    set({ loading: true });
    try {
      const versions = await listVersions(c.root, c.path);
      set({ versions, loading: false });
    } catch (e) {
      console.error("list_versions failed", e);
      set({ versions: [], loading: false });
    }
  },

  select: async (v) => {
    if (!v) {
      set({ selected: null, baseContent: null });
      return;
    }
    const c = ctx();
    if (!c) return;
    try {
      const content = await versionContent(c.root, c.path, v.id);
      set({ selected: v, baseContent: content });
    } catch (e) {
      console.error("version_content failed", e);
    }
  },

  restore: async (v) => {
    const c = ctx();
    if (!c) return;
    const prevLatest = get().versions[0] ?? null;
    try {
      await restoreVersion(c.root, c.path, v.id);
      await useDoc.getState().reloadTab(c.path);
      set({ selected: null, baseContent: null });
      await get().load();
      useToast.getState().push(
        "Restored an earlier version.",
        prevLatest
          ? {
              label: "Undo",
              run: () => void get().restore(prevLatest),
            }
          : undefined,
      );
    } catch (e) {
      console.error("restore failed", e);
    }
  },
}));
