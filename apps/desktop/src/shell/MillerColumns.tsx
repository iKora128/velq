import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { FileGlyph } from "@/filemanager/FileGlyph";
import { clickSelect } from "@/filemanager/selectionClick";
import { useFileDnd } from "@/filemanager/useFileDnd";
import { useSelectionKeys } from "@/filemanager/useSelectionKeys";
import { useT } from "@/i18n/useT";
import type { FileNode } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { cn } from "@/util/cn";

/** Finder's column view (Miller columns): each folder you click opens the next
 * column to its right. Single-click selects, double-click opens a document. */
export function MillerColumns() {
  const t = useT();
  const dnd = useFileDnd();
  const selection = useFiles((s) => s.selection);
  const rootPath = useFiles((s) => s.rootPath);
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const [trail, setTrail] = useState<string[]>([]);
  const [fileSel, setFileSel] = useState<string | null>(null);

  const columns = rootPath ? [rootPath, ...trail] : [];

  // Lazily load each visible column's directory.
  useEffect(() => {
    for (const dir of columns) {
      if (!childrenByPath[dir]) void useFiles.getState().loadDir(dir);
    }
  }, [columns, childrenByPath]);

  // The deepest column's items — the focus for Cmd/Ctrl+A.
  useSelectionKeys(childrenByPath[columns[columns.length - 1]] ?? []);

  if (!rootPath) {
    return (
      <div className="empty">
        <p className="empty__hint">{t("grid.emptyNoFolder")}</p>
      </div>
    );
  }

  const openFolder = (colIdx: number, node: FileNode) => {
    setTrail((t) => [...t.slice(0, colIdx), node.path]);
    setFileSel(null);
    useFiles.getState().select(node);
  };
  const selectFile = (node: FileNode) => {
    setFileSel(node.path);
    useFiles.getState().select(node);
  };

  return (
    <div className="miller">
      {columns.map((dir, i) => {
        const items = childrenByPath[dir];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: column index is the identity
          <div className="miller__col" key={`${dir}:${i}`}>
            {items ? (
              items.length === 0 ? (
                <div className="miller__empty">{t("miller.empty")}</div>
              ) : (
                items.map((node) => {
                  const isDir = node.kind === "dir";
                  const active = isDir ? trail[i] === node.path : fileSel === node.path;
                  return (
                    <button
                      type="button"
                      key={node.path}
                      {...dnd.dragProps(node)}
                      {...(isDir ? dnd.dropProps(node.path, () => openFolder(i, node)) : {})}
                      className={cn(
                        "miller__row",
                        active && "is-active",
                        selection.has(node.path) && "is-selected",
                        dnd.dropTarget === node.path && "is-drop",
                      )}
                      onClick={(e) => {
                        if (!clickSelect(e, node, items ?? [])) return;
                        if (isDir) openFolder(i, node);
                        else selectFile(node);
                      }}
                      onDoubleClick={() => {
                        if (!isDir) void useDoc.getState().openFile(node, { preview: false });
                      }}
                    >
                      <FileGlyph
                        ext={node.ext}
                        kind={node.kind}
                        size={15}
                        className="miller__icon"
                      />
                      <span className="miller__name">{node.name}</span>
                      {isDir && <ChevronRight size={14} className="miller__chev" />}
                    </button>
                  );
                })
              )
            ) : (
              <div className="miller__empty">…</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
