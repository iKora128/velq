import { create } from "zustand";
import { t } from "@/i18n";
import { searchFilenames } from "@/ipc/search";
import type { FileNode, FilePreview } from "@/ipc/types";
import {
  createFile,
  createFolder,
  deletePath,
  movePath,
  previewDir,
  readDir,
  readFile,
  renamePath,
  writeFileContent,
} from "@/ipc/vault";
import { describeError, useDoc } from "./doc";
import { useToast } from "./toast";

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}
function baseName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}
function joinName(stem: string, ext: string): string {
  return ext ? `${stem}.${ext}` : stem;
}
function splitName(name: string): [string, string] {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name, ""];
}

/** A reversible file operation. `undo` puts things back; `redo` re-applies it.
 * Closures capture whatever each op needs (paths, captured content). */
export interface UndoEntry {
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface FilesState {
  rootPath: string | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  childrenByPath: Record<string, FileNode[] | undefined>;
  expanded: Record<string, boolean>;
  selected: FileNode | null;
  renaming: string | null;
  previewsByFolder: Record<string, FilePreview[] | undefined>;
  quickLook: FileNode | null;
  searchQuery: string;
  searchResults: FileNode[];
  loadPreviews: (folder: string) => Promise<void>;
  setQuickLook: (node: FileNode | null) => void;
  runSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  handleFsChange: (paths: string[]) => void;
  setRoot: (path: string) => Promise<void>;
  loadDir: (path: string) => Promise<void>;
  expand: (path: string) => Promise<void>;
  toggle: (path: string) => Promise<void>;
  select: (node: FileNode | null) => void;
  reset: () => void;
  /** The folder a new item should land in: the selected dir, the selected file's
   * folder, or the vault root. */
  targetDir: () => string;
  newFile: (parentPath: string) => Promise<void>;
  newFolder: (parentPath: string) => Promise<void>;
  startRename: (path: string) => void;
  cancelRename: () => void;
  commitRename: (node: FileNode, newName: string) => Promise<void>;
  remove: (node: FileNode) => Promise<void>;
  duplicate: (node: FileNode) => Promise<void>;
  moveNode: (fromPath: string, toParentPath: string) => Promise<void>;
  copyNode: (fromPath: string, toParentPath: string) => Promise<void>;
  pushUndo: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useFiles = create<FilesState>((set, get) => ({
  rootPath: null,
  undoStack: [],
  redoStack: [],
  childrenByPath: {},
  expanded: {},
  selected: null,
  renaming: null,
  previewsByFolder: {},
  quickLook: null,
  searchQuery: "",
  searchResults: [],

  runSearch: async (query) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const scope = get().targetDir() || get().rootPath || "";
    try {
      const nodes = await searchFilenames(query, scope);
      if (get().searchQuery === query) set({ searchResults: nodes });
    } catch (e) {
      console.error("search failed", e);
    }
  },
  clearSearch: () => set({ searchQuery: "", searchResults: [] }),

  handleFsChange: (paths) => {
    const dirs = new Set(paths.map(parentOf));
    const { childrenByPath } = get();
    for (const dir of dirs) {
      if (childrenByPath[dir] !== undefined) void get().loadDir(dir);
    }
    set((s) => {
      const pv = { ...s.previewsByFolder };
      for (const dir of dirs) delete pv[dir];
      return { previewsByFolder: pv };
    });
  },

  loadPreviews: async (folder) => {
    try {
      const previews = await previewDir(folder);
      set((s) => ({ previewsByFolder: { ...s.previewsByFolder, [folder]: previews } }));
    } catch (e) {
      console.error("preview_dir failed", folder, e);
    }
  },
  setQuickLook: (node) => set({ quickLook: node }),

  setRoot: async (path) => {
    set({
      rootPath: path,
      childrenByPath: {},
      expanded: {},
      selected: null,
      renaming: null,
      previewsByFolder: {},
      quickLook: null,
    });
    await get().loadDir(path);
  },

  loadDir: async (path) => {
    try {
      const nodes = await readDir(path);
      set((s) => ({ childrenByPath: { ...s.childrenByPath, [path]: nodes } }));
    } catch (e) {
      console.error("read_dir failed", path, e);
      set((s) => ({ childrenByPath: { ...s.childrenByPath, [path]: [] } }));
      if (path === get().rootPath) {
        useToast.getState().push(t("toast.cantReadFolder", { error: describeError(e) }));
      }
    }
  },

  expand: async (path) => {
    if (!get().childrenByPath[path]) await get().loadDir(path);
    set((s) => ({ expanded: { ...s.expanded, [path]: true } }));
  },

  toggle: async (path) => {
    if (get().expanded[path]) set((s) => ({ expanded: { ...s.expanded, [path]: false } }));
    else await get().expand(path);
  },

  select: (node) => set({ selected: node }),
  reset: () =>
    set({
      rootPath: null,
      undoStack: [],
      redoStack: [],
      childrenByPath: {},
      expanded: {},
      selected: null,
      renaming: null,
      previewsByFolder: {},
      quickLook: null,
      searchQuery: "",
      searchResults: [],
    }),

  targetDir: () => {
    const { selected, rootPath } = get();
    if (!selected) return rootPath ?? "";
    return selected.kind === "dir" ? selected.path : parentOf(selected.path);
  },

  newFile: async (parentPath) => {
    if (parentPath !== get().rootPath) await get().expand(parentPath);
    const node = await createFile(parentPath, "Untitled.md");
    await get().loadDir(parentPath);
    set({ selected: node, renaming: node.path });
    get().pushUndo({
      label: t("undo.newFile"),
      undo: async () => {
        await deletePath(node.path);
        await get().loadDir(parentPath);
        set({ selected: null, renaming: null });
        useDoc.getState().close(node.path);
      },
      redo: async () => {
        const n = await createFile(parentPath, baseName(node.path));
        await get().loadDir(parentPath);
        set({ selected: n });
      },
    });
  },

  newFolder: async (parentPath) => {
    if (parentPath !== get().rootPath) await get().expand(parentPath);
    const node = await createFolder(parentPath, "New folder");
    await get().loadDir(parentPath);
    set({ selected: node, renaming: node.path });
    get().pushUndo({
      label: t("undo.newFolder"),
      undo: async () => {
        await deletePath(node.path);
        await get().loadDir(parentPath);
        set({ selected: null, renaming: null });
      },
      redo: async () => {
        const n = await createFolder(parentPath, baseName(node.path));
        await get().loadDir(parentPath);
        set({ selected: n });
      },
    });
  },

  startRename: (path) => set({ renaming: path }),
  cancelRename: () => set({ renaming: null }),

  commitRename: async (node, newName) => {
    set({ renaming: null });
    const trimmed = newName.trim();
    if (!trimmed || trimmed === node.name) return;
    const to = `${parentOf(node.path)}/${trimmed}`;
    try {
      const renamed = await renamePath(node.path, to);
      await get().loadDir(parentOf(node.path));
      set({ selected: renamed });
      useDoc.getState().renameDoc(node.path, renamed.path, renamed.name);
      const from = node.path;
      const dest = renamed.path;
      const parent = parentOf(from);
      get().pushUndo({
        label: t("undo.rename", { name: renamed.name }),
        undo: async () => {
          const back = await renamePath(dest, from);
          await get().loadDir(parent);
          set({ selected: back });
          useDoc.getState().renameDoc(dest, back.path, back.name);
        },
        redo: async () => {
          const fwd = await renamePath(from, dest);
          await get().loadDir(parent);
          set({ selected: fwd });
          useDoc.getState().renameDoc(from, fwd.path, fwd.name);
        },
      });
    } catch (e) {
      console.error("rename failed", e);
      useToast.getState().push(t("toast.cantRename", { error: describeError(e) }));
    }
  },

  remove: async (node) => {
    const parent = parentOf(node.path);
    try {
      // Capture file content first so the delete can be undone (folders go to Trash).
      let captured: string | null = null;
      if (node.kind === "file") {
        captured = await readFile(node.path)
          .then((f) => f.content)
          .catch(() => null);
      }
      await deletePath(node.path);
      await get().loadDir(parent);
      if (get().selected?.path === node.path) set({ selected: null });
      useDoc.getState().close(node.path);
      if (node.kind === "file" && captured !== null) {
        const content = captured;
        get().pushUndo({
          label: t("undo.delete", { name: node.name }),
          undo: async () => {
            const created = await createFile(parent, node.name);
            await writeFileContent(created.path, content);
            await get().loadDir(parent);
            set({ selected: created });
          },
          redo: async () => {
            await deletePath(`${parent}/${node.name}`).catch(() => {});
            await get().loadDir(parent);
          },
        });
      }
    } catch (e) {
      console.error("delete failed", e);
      useToast.getState().push(t("toast.cantDelete", { error: describeError(e) }));
    }
  },

  duplicate: async (node) => {
    if (node.kind !== "file") return;
    const parent = parentOf(node.path);
    const [stem, ext] = splitName(node.name);
    try {
      const content = (await readFile(node.path)).content;
      const created = await createFile(parent, joinName(`${stem} copy`, ext));
      await writeFileContent(created.path, content);
      await get().loadDir(parent);
      set({ selected: created });
      const dupPath = created.path;
      get().pushUndo({
        label: t("undo.duplicate"),
        undo: async () => {
          await deletePath(dupPath);
          await get().loadDir(parent);
          set({ selected: null });
        },
        redo: async () => {
          const c = await createFile(parent, baseName(dupPath));
          await writeFileContent(c.path, content);
          await get().loadDir(parent);
          set({ selected: c });
        },
      });
    } catch (e) {
      console.error("duplicate failed", e);
    }
  },

  moveNode: async (fromPath, toParentPath) => {
    if (parentOf(fromPath) === toParentPath || fromPath === toParentPath) return;
    if (toParentPath.startsWith(`${fromPath}/`)) return; // can't move into own descendant
    const to = `${toParentPath}/${baseName(fromPath)}`;
    const origParent = parentOf(fromPath);
    try {
      const moved = await movePath(fromPath, to);
      await get().loadDir(origParent);
      await get().loadDir(toParentPath);
      set({ selected: moved });
      useDoc.getState().renameDoc(fromPath, moved.path, moved.name);
      get().pushUndo({
        label: t("undo.move"),
        undo: async () => {
          const back = await movePath(moved.path, fromPath);
          await get().loadDir(toParentPath);
          await get().loadDir(origParent);
          set({ selected: back });
          useDoc.getState().renameDoc(moved.path, back.path, back.name);
        },
        redo: async () => {
          const fwd = await movePath(fromPath, to);
          await get().loadDir(origParent);
          await get().loadDir(toParentPath);
          set({ selected: fwd });
          useDoc.getState().renameDoc(fromPath, fwd.path, fwd.name);
        },
      });
    } catch (e) {
      console.error("move failed", e);
      useToast.getState().push(t("toast.cantMove", { error: describeError(e) }));
    }
  },

  copyNode: async (fromPath, toParentPath) => {
    if (toParentPath.startsWith(`${fromPath}/`)) return;
    try {
      const content = (await readFile(fromPath)).content; // file copy only
      const created = await createFile(toParentPath, baseName(fromPath));
      await writeFileContent(created.path, content);
      await get().loadDir(toParentPath);
      set({ selected: created });
    } catch (e) {
      console.error("copy failed", e);
    }
  },

  pushUndo: (entry) => set((s) => ({ undoStack: [...s.undoStack, entry], redoStack: [] })),

  undo: async () => {
    const stack = get().undoStack;
    const entry = stack[stack.length - 1];
    if (!entry) {
      useToast.getState().push(t("toast.nothingToUndo"));
      return;
    }
    try {
      await entry.undo();
      set((s) => ({ undoStack: s.undoStack.slice(0, -1), redoStack: [...s.redoStack, entry] }));
      useToast.getState().push(t("toast.undid", { label: entry.label }));
    } catch (e) {
      console.error("undo failed", e);
      useToast.getState().push(t("toast.cantUndo", { error: describeError(e) }));
    }
  },

  redo: async () => {
    const stack = get().redoStack;
    const entry = stack[stack.length - 1];
    if (!entry) return;
    try {
      await entry.redo();
      set((s) => ({ redoStack: s.redoStack.slice(0, -1), undoStack: [...s.undoStack, entry] }));
      useToast.getState().push(t("toast.redid", { label: entry.label }));
    } catch (e) {
      console.error("redo failed", e);
      useToast.getState().push(t("toast.cantRedo", { error: describeError(e) }));
    }
  },
}));

export interface TreeRow {
  node: FileNode;
  depth: number;
}

/** Flatten the visible (expanded) tree into a list for virtualization. */
export function flattenTree(
  rootPath: string,
  childrenByPath: Record<string, FileNode[] | undefined>,
  expanded: Record<string, boolean>,
): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (dirPath: string, depth: number) => {
    const kids = childrenByPath[dirPath];
    if (!kids) return;
    for (const node of kids) {
      rows.push({ node, depth });
      if (node.kind === "dir" && expanded[node.path]) walk(node.path, depth + 1);
    }
  };
  walk(rootPath, 0);
  return rows;
}
