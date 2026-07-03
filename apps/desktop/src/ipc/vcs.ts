import { markSelfWrite } from "@/util/selfWrites";
import { invoke } from "./tauri";
import type { Version } from "./types";

export const initHistory = (root: string) => invoke<void>("init_history", { root });
export const saveVersion = (root: string, path: string, content: string) => {
  // Tell the watcher this file is about to change on disk because of *us*.
  markSelfWrite(path);
  return invoke<Version>("save_version", { root, path, content });
};
export const listVersions = (root: string, path: string) =>
  invoke<Version[]>("list_versions", { root, path });
export const versionContent = (root: string, path: string, versionId: string) =>
  invoke<string>("version_content", { root, path, versionId });
export const restoreVersion = (root: string, path: string, versionId: string) => {
  markSelfWrite(path);
  return invoke<Version>("restore_version", { root, path, versionId });
};
