import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  Copy,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { type DragEvent, useMemo, useRef, useState } from "react";
import type { FileNode } from "@/ipc/types";
import { revealInOs } from "@/ipc/vault";
import { useDoc } from "@/store/doc";
import { flattenTree, type TreeRow, useFiles } from "@/store/files";
import { cn } from "@/util/cn";
import { isMac } from "@/util/platform";
import { ContextMenu, type MenuEntry } from "./ContextMenu";
import { fileIcon } from "./fileIcon";
import { RenameInput } from "./RenameInput";
import "./tree.css";

const ROW_H = 28;

// Drag source path (dataTransfer can't be read during dragover, so we stash it).
let dragSrc: string | null = null;

export function Tree() {
  const rootPath = useFiles((s) => s.rootPath);
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const expanded = useFiles((s) => s.expanded);
  const selectedPath = useFiles((s) => s.selected?.path ?? null);
  const renaming = useFiles((s) => s.renaming);
  const files = useFiles;
  const openFile = useDoc((s) => s.openFile);
  const parentRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);
  const springTimer = useRef(0);

  const rows = useMemo(
    () => (rootPath ? flattenTree(rootPath, childrenByPath, expanded) : []),
    [rootPath, childrenByPath, expanded],
  );

  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 14,
  });

  const onRowClick = (row: TreeRow) => {
    files.getState().select(row.node);
    if (row.node.kind === "dir") void files.getState().toggle(row.node.path);
    else void openFile(row.node, { preview: true });
  };

  const clearDrop = () => {
    setDropTarget(null);
    window.clearTimeout(springTimer.current);
  };

  const onDragOverFolder = (e: DragEvent, node: FileNode) => {
    if (!dragSrc || dragSrc === node.path || node.path.startsWith(`${dragSrc}/`)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
    if (dropTarget !== node.path) {
      setDropTarget(node.path);
      window.clearTimeout(springTimer.current);
      if (!expanded[node.path]) {
        springTimer.current = window.setTimeout(() => void files.getState().expand(node.path), 600);
      }
    }
  };

  const onDropFolder = (e: DragEvent, node: FileNode) => {
    e.preventDefault();
    const src = dragSrc;
    clearDrop();
    if (!src) return;
    if (e.altKey) void files.getState().copyNode(src, node.path);
    else void files.getState().moveNode(src, node.path);
  };

  const menuEntries = (node: FileNode | null): MenuEntry[] => {
    const target = node ? (node.kind === "dir" ? node.path : undefined) : rootPath;
    const entries: MenuEntry[] = [];
    if (node?.kind === "file") {
      entries.push({ label: "Open", onClick: () => void openFile(node, { preview: false }) });
      entries.push({ separator: true });
    }
    if (target) {
      entries.push({
        label: "New document",
        icon: <FilePlus size={15} />,
        onClick: () => void files.getState().newFile(target),
      });
      entries.push({
        label: "New folder",
        icon: <FolderPlus size={15} />,
        onClick: () => void files.getState().newFolder(target),
      });
      if (node) entries.push({ separator: true });
    }
    if (node) {
      entries.push({
        label: "Rename",
        icon: <Pencil size={15} />,
        onClick: () => files.getState().startRename(node.path),
      });
      if (node.kind === "file")
        entries.push({
          label: "Duplicate",
          icon: <Copy size={15} />,
          onClick: () => void files.getState().duplicate(node),
        });
      entries.push({
        label: isMac ? "Reveal in Finder" : "Reveal in Explorer",
        onClick: () => void revealInOs(node.path),
      });
      entries.push({ separator: true });
      entries.push({
        label: "Move to Trash",
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => void files.getState().remove(node),
      });
    }
    return entries;
  };

  return (
    <div
      ref={parentRef}
      className="tree"
      onContextMenu={(e) => {
        if (e.target === parentRef.current) {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, node: null });
        }
      }}
    >
      <div style={{ height: virt.getTotalSize(), position: "relative", width: "100%" }}>
        {virt.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          const { node, depth } = row;
          const isDir = node.kind === "dir";
          const isOpen = expanded[node.path];
          const Icon = fileIcon(node.ext);
          const isRenaming = renaming === node.path;
          return (
            <button
              type="button"
              key={node.path}
              draggable={!isRenaming}
              className={cn(
                "tree-row",
                selectedPath === node.path && "tree-row--selected",
                dropTarget === node.path && "tree-row--drop",
              )}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: ROW_H,
                transform: `translateY(${vi.start}px)`,
                paddingLeft: 6 + depth * 14,
              }}
              title={node.name}
              onClick={() => !isRenaming && onRowClick(row)}
              onDoubleClick={() =>
                !isRenaming && node.kind === "file" && openFile(node, { preview: false })
              }
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                files.getState().select(node);
                setMenu({ x: e.clientX, y: e.clientY, node });
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === "F2") && !isRenaming) {
                  e.preventDefault();
                  files.getState().startRename(node.path);
                }
              }}
              onDragStart={(e) => {
                dragSrc = node.path;
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", node.path);
              }}
              onDragEnd={() => {
                dragSrc = null;
                clearDrop();
              }}
              onDragOver={isDir ? (e) => onDragOverFolder(e, node) : undefined}
              onDragLeave={isDir ? () => dropTarget === node.path && clearDrop() : undefined}
              onDrop={isDir ? (e) => onDropFolder(e, node) : undefined}
            >
              <span className="tree-row__caret">
                {isDir && (
                  <ChevronRight size={14} className={cn(isOpen && "tree-row__caret--open")} />
                )}
              </span>
              <span className="tree-row__icon">
                {isDir ? (
                  isOpen ? (
                    <FolderOpen size={15} />
                  ) : (
                    <Folder size={15} />
                  )
                ) : (
                  <Icon size={15} />
                )}
              </span>
              {isRenaming ? (
                <RenameInput
                  node={node}
                  onCommit={(name) => void files.getState().commitRename(node, name)}
                  onCancel={() => files.getState().cancelRename()}
                />
              ) : (
                <span className="tree-row__name">{node.name}</span>
              )}
              {node.gitStatus !== "none" && <span className={`dot dot--${node.gitStatus}`} />}
            </button>
          );
        })}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          entries={menuEntries(menu.node)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
