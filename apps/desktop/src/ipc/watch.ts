import { invoke } from "./tauri";

export const watchVault = (path: string) => invoke<void>("watch_vault", { path });
export const unwatchVault = () => invoke<void>("unwatch_vault");
