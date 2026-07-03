import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, Copy, FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { type MouseEvent, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/useT";
import type { FileNode } from "@/ipc/types";
import { revealInOs } from "@/ipc/vault";
import { useBatchRename } from "@/store/batchRename";
import { useDoc } from "@/store/doc";
import { flattenTree, type TreeRow, useFiles } from "@/store/files";
import { cn } from "@/util/cn";
import { isMac } from "@/util/platform";
import { ContextMenu, type MenuEntry } from "./ContextMenu";
import { FileGlyph } from "./FileGlyph";
import { RenameInput } from "./RenameInput";
import { clickSelect } from "./selectionClick";
import { useFileDnd } from "./useFileDnd";
import "./tree.css";

const ROW_H = 28;

export function Tree() {
  const t = useT();
  const rootPath = useFiles((s) => s.rootPath);
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const expanded = useFiles((s) => s.expanded);
  const selection = useFiles((s) => s.selection);
  const renaming = useFiles((s) => s.renaming);
  const files = useFiles;
  const openFile = useDoc((s) => s.openFile);
  const parentRef = useRef<HTMLDivElement>(null);
  const { dropTarget, dragProps, dropProps } = useFileDnd();
  const [menu, setMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);

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

  const onRowClick = (e: MouseEvent, row: TreeRow) => {
    // A modifier-click only changes the selection; a plain click also navigates/opens.
    if (
      !clickSelect(
        e,
        row.node,
        rows.map((r) => r.node),
      )
    )
      return;
    if (row.node.kind === "dir") void files.getState().toggle(row.node.path);
    else void openFile(row.node, { preview: true });
  };

  const menuEntries = (node: FileNode | null): MenuEntry[] => {
    const sel = files.getState().selection;
    // Right-clicking one of several selected items → bulk actions.
    if (node && sel.size > 1 && sel.has(node.path)) {
      const count = sel.size;
      return [
        {
          label: t("selection.newFolder.title"),
          icon: <FolderPlus size={15} />,
          onClick: () => void files.getState().newFolderFromSelection(),
        },
        {
          label: t("batch.title", { count }),
          icon: <Pencil size={15} />,
          onClick: () => useBatchRename.getState().open(files.getState().selectedNodes()),
        },
        { separator: true },
        {
          label: t("contextmenu.deleteN", { count }),
          icon: <Trash2 size={15} />,
          danger: true,
          onClick: () => void files.getState().removeSelected(),
        },
      ];
    }
    const target = node ? (node.kind === "dir" ? node.path : undefined) : rootPath;
    const entries: MenuEntry[] = [];
    if (node?.kind === "file") {
      entries.push({
        label: t("contextmenu.open"),
        onClick: () => void openFile(node, { preview: false }),
      });
      entries.push({ separator: true });
    }
    if (target) {
      entries.push({
        label: t("common.newDoc"),
        icon: <FilePlus size={15} />,
        onClick: () => void files.getState().newFile(target),
      });
      entries.push({
        label: t("common.newFolder"),
        icon: <FolderPlus size={15} />,
        onClick: () => void files.getState().newFolder(target),
      });
      if (node) entries.push({ separator: true });
    }
    if (node) {
      entries.push({
        label: t("contextmenu.rename"),
        icon: <Pencil size={15} />,
        onClick: () => files.getState().startRename(node.path),
      });
      if (node.kind === "file")
        entries.push({
          label: t("contextmenu.duplicate"),
          icon: <Copy size={15} />,
          onClick: () => void files.getState().duplicate(node),
        });
      entries.push({
        label: isMac ? t("contextmenu.revealMac") : t("contextmenu.revealOther"),
        onClick: () => void revealInOs(node.path),
      });
      entries.push({ separator: true });
      entries.push({
        label: t("contextmenu.trash"),
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
          const isRenaming = renaming === node.path;
          return (
            <button
              type="button"
              key={node.path}
              {...dragProps(node, isRenaming)}
              {...(isDir
                ? dropProps(node.path, () => void files.getState().expand(node.path))
                : {})}
              className={cn(
                "tree-row",
                selection.has(node.path) && "tree-row--selected",
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
              onClick={(e) => !isRenaming && onRowClick(e, row)}
              onDoubleClick={() =>
                !isRenaming && node.kind === "file" && openFile(node, { preview: false })
              }
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Keep a multi-selection if this row is part of it.
                if (!files.getState().selection.has(node.path)) files.getState().select(node);
                setMenu({ x: e.clientX, y: e.clientY, node });
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === "F2") && !isRenaming) {
                  e.preventDefault();
                  files.getState().startRename(node.path);
                }
              }}
            >
              <span className="tree-row__caret">
                {isDir && (
                  <ChevronRight size={14} className={cn(isOpen && "tree-row__caret--open")} />
                )}
              </span>
              <span className="tree-row__icon">
                <FileGlyph ext={node.ext} kind={node.kind} open={isOpen} size={15} />
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
