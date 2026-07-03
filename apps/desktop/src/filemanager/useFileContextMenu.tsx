import { type MouseEvent, useState } from "react";
import { useT } from "@/i18n/useT";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";
import { ContextMenu } from "./ContextMenu";
import { fileMenuEntries } from "./fileMenu";

/**
 * Right-click context menu for a file view. Spread `openMenu(e, node, emptyDir?)`
 * onto rows/tiles (and the empty area with `node = null`); render `contextMenu`.
 * Preserves a multi-selection when the right-clicked item is part of it; otherwise
 * selects just it (or clears, for the empty area).
 */
export function useFileContextMenu() {
  const t = useT();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: FileNode | null;
    dir?: string;
  } | null>(null);

  const openMenu = (e: MouseEvent, node: FileNode | null, emptyDir?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const files = useFiles.getState();
    if (node) {
      if (!files.selection.has(node.path)) files.select(node);
    } else {
      files.clearSelection();
    }
    setMenu({ x: e.clientX, y: e.clientY, node, dir: emptyDir });
  };

  const contextMenu = menu ? (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      entries={fileMenuEntries(menu.node, t, menu.dir)}
      onClose={() => setMenu(null)}
    />
  ) : null;

  return { openMenu, contextMenu };
}
