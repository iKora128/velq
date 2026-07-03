import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import { type MouseEvent, useMemo, useRef } from "react";
import { useDoc } from "@/store/doc";
import { flattenTree, type TreeRow, useFiles } from "@/store/files";
import { cn } from "@/util/cn";
import { FileGlyph } from "./FileGlyph";
import { RenameInput } from "./RenameInput";
import { clickSelect } from "./selectionClick";
import { useFileContextMenu } from "./useFileContextMenu";
import { useFileDnd } from "./useFileDnd";
import "./tree.css";

const ROW_H = 28;

export function Tree() {
  const rootPath = useFiles((s) => s.rootPath);
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const expanded = useFiles((s) => s.expanded);
  const selection = useFiles((s) => s.selection);
  const renaming = useFiles((s) => s.renaming);
  const files = useFiles;
  const openFile = useDoc((s) => s.openFile);
  const parentRef = useRef<HTMLDivElement>(null);
  const { dropTarget, dragProps, dropProps } = useFileDnd();
  const { openMenu, contextMenu } = useFileContextMenu();

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

  return (
    <div
      ref={parentRef}
      className="tree"
      onContextMenu={(e) => {
        if (e.target === parentRef.current) openMenu(e, null, rootPath ?? undefined);
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
              onContextMenu={(e) => openMenu(e, node)}
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

      {contextMenu}
    </div>
  );
}
