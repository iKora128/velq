import { invoke } from "./tauri";
import type { FileNode } from "./types";

export const searchFilenames = (query: string, scope: string, limit = 60) =>
  invoke<FileNode[]>("search_filenames", { query, scope, limit });
