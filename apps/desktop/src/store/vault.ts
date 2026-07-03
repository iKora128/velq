import { create } from "zustand";
import { t } from "@/i18n";
import type { VaultInfo } from "@/ipc/types";
import { openVault, pickFolder } from "@/ipc/vault";
import { initHistory } from "@/ipc/vcs";
import { unwatchVault, watchVault } from "@/ipc/watch";
import { describeError } from "./doc";
import { useFiles } from "./files";
import { useSettings } from "./settings";
import { useToast } from "./toast";

interface VaultState {
  root: VaultInfo | null;
  open: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  close: () => void;
}

export const useVault = create<VaultState>((set) => ({
  root: null,

  open: async () => {
    const path = await pickFolder();
    if (path) await useVault.getState().openPath(path);
  },

  openPath: async (path) => {
    try {
      const info = await openVault(path);
      set({ root: info });
      await useFiles.getState().setRoot(info.path);
      useSettings.getState().update({ lastVault: info.path });
      void initHistory(info.path).catch((e) => console.error("init_history failed", e));
      void watchVault(info.path).catch((e) => console.error("watch_vault failed", e));
    } catch (e) {
      console.error("open_vault failed", e);
      useToast.getState().push(t("toast.cantOpenFolder", { error: describeError(e) }));
    }
  },

  close: () => {
    set({ root: null });
    useFiles.getState().reset();
    void unwatchVault().catch(() => {});
  },
}));
