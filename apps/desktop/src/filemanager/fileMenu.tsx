import { Copy, FileCode, FileText, FolderPlus, Package, Pencil, Trash2 } from "lucide-react";
import { canConvertToVelq, convertToVelq } from "@/export/convert";
import type { MsgKey } from "@/i18n";
import type { FileNode } from "@/ipc/types";
import { revealInOs } from "@/ipc/vault";
import { useBatchRename } from "@/store/batchRename";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { isMac } from "@/util/platform";
import type { MenuEntry } from "./ContextMenu";

type TFn = (key: MsgKey, params?: Record<string, string | number>) => string;

/**
 * The right-click menu for a file/folder — shared by every file view (tree, grid,
 * list, columns). Right-clicking one of several selected items offers the **bulk**
 * actions; otherwise the single-item actions. `emptyDir` is the folder new items
 * land in when the empty area is right-clicked (`node` = null).
 */
export function fileMenuEntries(node: FileNode | null, t: TFn, emptyDir?: string): MenuEntry[] {
  const files = useFiles.getState();
  const sel = files.selection;

  // Multi-selection → bulk actions.
  if (node && sel.size > 1 && sel.has(node.path)) {
    const count = sel.size;
    return [
      {
        label: t("selection.newFolder.title"),
        icon: <FolderPlus size={15} />,
        onClick: () => void files.newFolderFromSelection(),
      },
      {
        label: t("batch.title", { count }),
        icon: <Pencil size={15} />,
        onClick: () => useBatchRename.getState().open(files.selectedNodes()),
      },
      { separator: true },
      {
        label: t("contextmenu.deleteN", { count }),
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => void files.removeSelected(),
      },
    ];
  }

  const openFile = useDoc.getState().openFile;
  const target = node
    ? node.kind === "dir"
      ? node.path
      : undefined
    : (emptyDir ?? files.rootPath);
  const entries: MenuEntry[] = [];

  if (node?.kind === "file") {
    entries.push({
      label: t("contextmenu.open"),
      onClick: () => void openFile(node, { preview: false }),
    });
    // Explicit, opt-in packaging. Opening the file never does this — only this click.
    if (canConvertToVelq(node.name)) {
      entries.push({
        label: t("contextmenu.convertToVelq"),
        icon: <Package size={15} />,
        onClick: () => void convertToVelq(node.path),
      });
    }
    entries.push({ separator: true });
  }
  if (target) {
    entries.push({
      label: t("action.newDoc"),
      icon: <FileText size={15} />,
      onClick: () => void files.newFile(target, "md"),
    });
    entries.push({
      label: t("action.newDocHtml"),
      icon: <FileCode size={15} />,
      onClick: () => void files.newFile(target, "html"),
    });
    entries.push({
      label: t("common.newFolder"),
      icon: <FolderPlus size={15} />,
      onClick: () => void files.newFolder(target),
    });
    if (node) entries.push({ separator: true });
  }
  if (node) {
    entries.push({
      label: t("contextmenu.rename"),
      icon: <Pencil size={15} />,
      // Uniform across views: the rename dialog handles one file (a Name field) or
      // many. The tree also keeps its fast inline rename (F2 / double-click).
      onClick: () => useBatchRename.getState().open([node]),
    });
    if (node.kind === "file")
      entries.push({
        label: t("contextmenu.duplicate"),
        icon: <Copy size={15} />,
        onClick: () => void files.duplicate(node),
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
      onClick: () => void files.remove(node),
    });
  }
  return entries;
}
