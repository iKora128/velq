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

/** Set the "lead" selection to a single node (or clear it). The lead drives the
 * preview panes and `targetDir`; the multi-selection set is reset to just this node
 * so every place that sets a single active item keeps the two in sync. */
function leadState(node: FileNode | null) {
  return {
    selected: node,
    selection: new Set<string>(node ? [node.path] : []),
    anchor: node ? node.path : null,
  };
}

/** Resolve a path to its FileNode from whatever's currently loaded (folders on
 * screen, or the active search results). Used by the bulk operations. */
function findLoadedNode(
  childrenByPath: Record<string, FileNode[] | undefined>,
  searchResults: FileNode[],
  path: string,
): FileNode | undefined {
  for (const nodes of Object.values(childrenByPath)) {
    const hit = nodes?.find((n) => n.path === path);
    if (hit) return hit;
  }
  return searchResults.find((n) => n.path === path);
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
  /** The lead item (last-clicked): drives previews, `targetDir`, and single-item
   * actions. Always present in `selection` when non-null. */
  selected: FileNode | null;
  /** All selected paths (multi-select). Includes `selected.path`. */
  selection: Set<string>;
  /** Anchor for Shift-range selection (the last plainly-clicked item). */
  anchor: string | null;
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
  /** Replace the selection with a single node (plain click). */
  select: (node: FileNode | null) => void;
  /** Cmd/Ctrl-click: add/remove a node from the selection. */
  toggleSelect: (node: FileNode) => void;
  /** Shift-click: select the contiguous range from the anchor to `node` within the
   * given visible order. */
  rangeSelectTo: (node: FileNode, ordered: FileNode[]) => void;
  selectAll: (nodes: FileNode[]) => void;
  clearSelection: () => void;
  /** The currently-selected nodes, resolved from loaded folders. */
  selectedNodes: () => FileNode[];
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
  /** Delete every selected item in one undoable step. */
  removeSelected: () => Promise<void>;
  duplicate: (node: FileNode) => Promise<void>;
  moveNode: (fromPath: string, toParentPath: string) => Promise<void>;
  copyNode: (fromPath: string, toParentPath: string) => Promise<void>;
  /** Move/copy many items into a folder in one undoable step (multi-drag). */
  moveMany: (paths: string[], toParent: string) => Promise<void>;
  copyMany: (paths: string[], toParent: string) => Promise<void>;
  /** Finder's "New Folder with Selection": make a folder and move the selection in. */
  newFolderFromSelection: () => Promise<void>;
  /** Apply a batch of renames in one undoable step. */
  renameMany: (renames: { node: FileNode; newName: string }[]) => Promise<void>;
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
  selection: new Set(),
  anchor: null,
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
      selection: new Set(),
      anchor: null,
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

  select: (node) => set(leadState(node)),
  toggleSelect: (node) =>
    set((s) => {
      const selection = new Set(s.selection);
      if (selection.has(node.path)) {
        selection.delete(node.path);
        const selected = s.selected?.path === node.path ? null : s.selected;
        return { selection, selected, anchor: node.path };
      }
      selection.add(node.path);
      return { selection, selected: node, anchor: node.path };
    }),
  rangeSelectTo: (node, ordered) =>
    set((s) => {
      const paths = ordered.map((n) => n.path);
      const ai = s.anchor ? paths.indexOf(s.anchor) : -1;
      const ni = paths.indexOf(node.path);
      if (ai < 0 || ni < 0) return leadState(node); // anchor isn't in this view — restart
      const [lo, hi] = ai < ni ? [ai, ni] : [ni, ai];
      return { selection: new Set(paths.slice(lo, hi + 1)), selected: node };
    }),
  selectAll: (nodes) =>
    set((s) => {
      if (nodes.length === 0) return leadState(null);
      const selection = new Set(nodes.map((n) => n.path));
      const selected = s.selected && selection.has(s.selected.path) ? s.selected : nodes[0];
      return { selection, selected, anchor: selected.path };
    }),
  clearSelection: () => set(leadState(null)),
  selectedNodes: () => {
    const { selection, childrenByPath, searchResults } = get();
    const out: FileNode[] = [];
    for (const path of selection) {
      const n = findLoadedNode(childrenByPath, searchResults, path);
      if (n) out.push(n);
    }
    return out;
  },
  reset: () =>
    set({
      rootPath: null,
      undoStack: [],
      redoStack: [],
      childrenByPath: {},
      expanded: {},
      selected: null,
      selection: new Set(),
      anchor: null,
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
    set({ ...leadState(node), renaming: node.path });
    get().pushUndo({
      label: t("undo.newFile"),
      undo: async () => {
        await deletePath(node.path);
        await get().loadDir(parentPath);
        set({ ...leadState(null), renaming: null });
        useDoc.getState().close(node.path);
      },
      redo: async () => {
        const n = await createFile(parentPath, baseName(node.path));
        await get().loadDir(parentPath);
        set({ ...leadState(n) });
      },
    });
  },

  newFolder: async (parentPath) => {
    if (parentPath !== get().rootPath) await get().expand(parentPath);
    const node = await createFolder(parentPath, "New folder");
    await get().loadDir(parentPath);
    set({ ...leadState(node), renaming: node.path });
    get().pushUndo({
      label: t("undo.newFolder"),
      undo: async () => {
        await deletePath(node.path);
        await get().loadDir(parentPath);
        set({ ...leadState(null), renaming: null });
      },
      redo: async () => {
        const n = await createFolder(parentPath, baseName(node.path));
        await get().loadDir(parentPath);
        set({ ...leadState(n) });
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
      set({ ...leadState(renamed) });
      useDoc.getState().renameDoc(node.path, renamed.path, renamed.name);
      const from = node.path;
      const dest = renamed.path;
      const parent = parentOf(from);
      get().pushUndo({
        label: t("undo.rename", { name: renamed.name }),
        undo: async () => {
          const back = await renamePath(dest, from);
          await get().loadDir(parent);
          set({ ...leadState(back) });
          useDoc.getState().renameDoc(dest, back.path, back.name);
        },
        redo: async () => {
          const fwd = await renamePath(from, dest);
          await get().loadDir(parent);
          set({ ...leadState(fwd) });
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
      if (get().selected?.path === node.path) set({ ...leadState(null) });
      useDoc.getState().close(node.path);
      if (node.kind === "file" && captured !== null) {
        const content = captured;
        get().pushUndo({
          label: t("undo.delete", { name: node.name }),
          undo: async () => {
            const created = await createFile(parent, node.name);
            await writeFileContent(created.path, content);
            await get().loadDir(parent);
            set({ ...leadState(created) });
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
      set({ ...leadState(created) });
      const dupPath = created.path;
      get().pushUndo({
        label: t("undo.duplicate"),
        undo: async () => {
          await deletePath(dupPath);
          await get().loadDir(parent);
          set({ ...leadState(null) });
        },
        redo: async () => {
          const c = await createFile(parent, baseName(dupPath));
          await writeFileContent(c.path, content);
          await get().loadDir(parent);
          set({ ...leadState(c) });
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
      set({ ...leadState(moved) });
      useDoc.getState().renameDoc(fromPath, moved.path, moved.name);
      get().pushUndo({
        label: t("undo.move"),
        undo: async () => {
          const back = await movePath(moved.path, fromPath);
          await get().loadDir(toParentPath);
          await get().loadDir(origParent);
          set({ ...leadState(back) });
          useDoc.getState().renameDoc(moved.path, back.path, back.name);
        },
        redo: async () => {
          const fwd = await movePath(fromPath, to);
          await get().loadDir(origParent);
          await get().loadDir(toParentPath);
          set({ ...leadState(fwd) });
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
      set({ ...leadState(created) });
    } catch (e) {
      console.error("copy failed", e);
    }
  },

  removeSelected: async () => {
    const nodes = get().selectedNodes();
    if (nodes.length === 0) return;
    if (nodes.length === 1) return get().remove(nodes[0]); // single keeps the richer path
    // Capture file contents so the whole batch can be undone (folders go to Trash).
    const captured: { node: FileNode; content: string | null }[] = [];
    for (const node of nodes) {
      const content =
        node.kind === "file"
          ? await readFile(node.path)
              .then((f) => f.content)
              .catch(() => null)
          : null;
      captured.push({ node, content });
    }
    const parents = new Set(nodes.map((n) => parentOf(n.path)));
    try {
      for (const { node } of captured) {
        await deletePath(node.path);
        useDoc.getState().close(node.path);
      }
      for (const p of parents) await get().loadDir(p);
      set(leadState(null));
      get().pushUndo({
        label: t("undo.deleteMany", { count: nodes.length }),
        undo: async () => {
          for (const { node, content } of captured) {
            if (node.kind === "file") {
              const created = await createFile(parentOf(node.path), node.name);
              if (content !== null) await writeFileContent(created.path, content);
            } else {
              await createFolder(parentOf(node.path), node.name).catch(() => {});
            }
          }
          for (const p of parents) await get().loadDir(p);
        },
        redo: async () => {
          for (const { node } of captured) await deletePath(node.path).catch(() => {});
          for (const p of parents) await get().loadDir(p);
        },
      });
      useToast.getState().push(t("toast.deletedMany", { count: nodes.length }), {
        label: t("common.undo"),
        run: () => void get().undo(),
      });
    } catch (e) {
      console.error("delete selected failed", e);
      useToast.getState().push(t("toast.cantDelete", { error: describeError(e) }));
    }
  },

  moveMany: async (paths, toParent) => {
    const moves = paths
      .filter((p) => parentOf(p) !== toParent && p !== toParent && !toParent.startsWith(`${p}/`))
      .map((from) => ({ from, to: `${toParent}/${baseName(from)}`, origParent: parentOf(from) }));
    if (moves.length === 0) return;
    if (moves.length === 1) return get().moveNode(moves[0].from, toParent);
    const dirs = new Set<string>([toParent, ...moves.map((m) => m.origParent)]);
    try {
      for (const m of moves) {
        const moved = await movePath(m.from, m.to);
        useDoc.getState().renameDoc(m.from, moved.path, moved.name);
      }
      for (const d of dirs) await get().loadDir(d);
      set(leadState(null));
      get().pushUndo({
        label: t("undo.moveMany", { count: moves.length }),
        undo: async () => {
          for (const m of moves) {
            const back = await movePath(m.to, m.from);
            useDoc.getState().renameDoc(m.to, back.path, back.name);
          }
          for (const d of dirs) await get().loadDir(d);
        },
        redo: async () => {
          for (const m of moves) {
            const fwd = await movePath(m.from, m.to);
            useDoc.getState().renameDoc(m.from, fwd.path, fwd.name);
          }
          for (const d of dirs) await get().loadDir(d);
        },
      });
    } catch (e) {
      console.error("move many failed", e);
      useToast.getState().push(t("toast.cantMove", { error: describeError(e) }));
    }
  },

  copyMany: async (paths, toParent) => {
    for (const from of paths) {
      if (toParent.startsWith(`${from}/`)) continue;
      await get().copyNode(from, toParent); // file-only, same as single copy
    }
  },

  newFolderFromSelection: async () => {
    const nodes = get().selectedNodes();
    if (nodes.length === 0) return;
    const parent = parentOf(nodes[0].path); // the items share the folder they live in
    try {
      const folder = await createFolder(parent, "New folder");
      const moves = nodes
        .filter((n) => n.path !== folder.path && parentOf(n.path) === parent)
        .map((n) => ({ from: n.path, to: `${folder.path}/${n.name}` }));
      for (const m of moves) {
        const moved = await movePath(m.from, m.to);
        useDoc.getState().renameDoc(m.from, moved.path, moved.name);
      }
      await get().loadDir(parent);
      await get().loadDir(folder.path);
      set({ ...leadState(folder), renaming: folder.path }); // Finder prompts to name it
      const folderPath = folder.path;
      get().pushUndo({
        label: t("undo.newFolderFromSelection", { count: moves.length }),
        undo: async () => {
          for (const m of moves) {
            const back = await movePath(m.to, m.from);
            useDoc.getState().renameDoc(m.to, back.path, back.name);
          }
          await deletePath(folderPath).catch(() => {});
          await get().loadDir(parent);
        },
        redo: async () => {
          const f = await createFolder(parent, baseName(folderPath));
          for (const m of moves) await movePath(m.from, `${f.path}/${baseName(m.from)}`);
          await get().loadDir(parent);
          await get().loadDir(f.path);
        },
      });
    } catch (e) {
      console.error("new folder from selection failed", e);
      useToast.getState().push(t("toast.cantMove", { error: describeError(e) }));
    }
  },

  renameMany: async (renames) => {
    const jobs = renames
      .filter((r) => r.newName.trim() && r.newName.trim() !== r.node.name)
      .map((r) => ({
        from: r.node.path,
        to: `${parentOf(r.node.path)}/${r.newName.trim()}`,
        parent: parentOf(r.node.path),
      }));
    if (jobs.length === 0) return;
    const parents = new Set(jobs.map((j) => j.parent));
    try {
      for (const j of jobs) {
        const renamed = await renamePath(j.from, j.to);
        useDoc.getState().renameDoc(j.from, renamed.path, renamed.name);
      }
      for (const p of parents) await get().loadDir(p);
      set(leadState(null));
      get().pushUndo({
        label: t("undo.renameMany", { count: jobs.length }),
        undo: async () => {
          for (const j of jobs) {
            const back = await renamePath(j.to, j.from);
            useDoc.getState().renameDoc(j.to, back.path, back.name);
          }
          for (const p of parents) await get().loadDir(p);
        },
        redo: async () => {
          for (const j of jobs) {
            const fwd = await renamePath(j.from, j.to);
            useDoc.getState().renameDoc(j.from, fwd.path, fwd.name);
          }
          for (const p of parents) await get().loadDir(p);
        },
      });
      useToast.getState().push(t("toast.renamedMany", { count: jobs.length }));
    } catch (e) {
      console.error("rename many failed", e);
      useToast.getState().push(t("toast.cantRename", { error: describeError(e) }));
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
