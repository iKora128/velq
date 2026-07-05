import { t } from "@/i18n";
import { invoke, isTauri } from "./tauri";
import type { FileContent, FileNode, FilePreview, VaultInfo } from "./types";

/** Open the native folder picker (or, in browser mode, a stub path). */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return "/Users/you/Notes";
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    directory: true,
    multiple: false,
    title: t("dialog.openVault"),
  });
  return typeof picked === "string" ? picked : null;
}

export const openVault = (path: string) => invoke<VaultInfo>("open_vault", { path });
export const readDir = (path: string) => invoke<FileNode[]>("read_dir", { path });
export const previewDir = (path: string) => invoke<FilePreview[]>("preview_dir", { path });
export const readFile = (path: string) => invoke<FileContent>("read_file", { path });
export const writeFileContent = (path: string, content: string) =>
  invoke<number>("write_file", { path, content });
/** Raw bytes (images from paste/drop, W1) — parent folders are created. */
export const writeFileBinary = (path: string, dataBase64: string) =>
  invoke<number>("write_file_binary", { path, dataBase64 });
export const createFile = (parentPath: string, name: string) =>
  invoke<FileNode>("create_file", { parentPath, name });
export const createFolder = (parentPath: string, name: string) =>
  invoke<FileNode>("create_folder", { parentPath, name });
export const renamePath = (from: string, to: string) =>
  invoke<FileNode>("rename_path", { from, to });
export const movePath = (from: string, to: string) => invoke<FileNode>("move_path", { from, to });
export const deletePath = (path: string) => invoke<void>("delete_path", { path });
export const revealInOs = (path: string) => invoke<void>("reveal_in_os", { path });
/** The newest files anywhere in the vault, newest first (Home "Recently added"). */
export const recentlyAdded = (root: string, limit?: number) =>
  invoke<FileNode[]>("recent_files", { root, limit });
/** Ensure (and on first run, seed) the default `Documents/Velq` home and return it. */
export const ensureDefaultVault = () => invoke<VaultInfo>("ensure_default_vault");
/** Copy an external file (e.g. a dragged-in `.velq`) into `destDir`. */
export const importFile = (src: string, destDir: string) =>
  invoke<FileNode>("import_file", { src, destDir });
