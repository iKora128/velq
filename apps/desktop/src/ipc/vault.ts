import { invoke, isTauri } from "./tauri";
import type { FileContent, FileNode, FilePreview, VaultInfo } from "./types";

/** Open the native folder picker (or, in browser mode, a stub path). */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return "/Users/you/Notes";
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    directory: true,
    multiple: false,
    title: "Open folder as a Velq vault",
  });
  return typeof picked === "string" ? picked : null;
}

export const openVault = (path: string) => invoke<VaultInfo>("open_vault", { path });
export const readDir = (path: string) => invoke<FileNode[]>("read_dir", { path });
export const previewDir = (path: string) => invoke<FilePreview[]>("preview_dir", { path });
export const readFile = (path: string) => invoke<FileContent>("read_file", { path });
export const writeFileContent = (path: string, content: string) =>
  invoke<number>("write_file", { path, content });
export const createFile = (parentPath: string, name: string) =>
  invoke<FileNode>("create_file", { parentPath, name });
export const createFolder = (parentPath: string, name: string) =>
  invoke<FileNode>("create_folder", { parentPath, name });
export const renamePath = (from: string, to: string) =>
  invoke<FileNode>("rename_path", { from, to });
export const movePath = (from: string, to: string) => invoke<FileNode>("move_path", { from, to });
export const deletePath = (path: string) => invoke<void>("delete_path", { path });
export const revealInOs = (path: string) => invoke<void>("reveal_in_os", { path });
