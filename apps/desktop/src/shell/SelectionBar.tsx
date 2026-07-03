import { FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useBatchRename } from "@/store/batchRename";
import { useFiles } from "@/store/files";

/** Appears when 2+ items are selected: the count and the bulk actions (new folder
 * from the selection, batch rename, delete). Single items already have the
 * right-click menu and keyboard, so this only shows for a real multi-selection. */
export function SelectionBar() {
  const t = useT();
  const count = useFiles((s) => s.selection.size);
  if (count < 2) return null;

  return (
    <div className="selbar anim-fade">
      <span className="selbar__count">{t("selection.count", { count })}</span>
      <div className="selbar__spacer" />
      <button
        type="button"
        className="selbar__btn"
        title={t("selection.newFolder.title")}
        onClick={() => void useFiles.getState().newFolderFromSelection()}
      >
        <FolderPlus size={14} /> {t("selection.newFolder")}
      </button>
      <button
        type="button"
        className="selbar__btn"
        onClick={() => useBatchRename.getState().open(useFiles.getState().selectedNodes())}
      >
        <Pencil size={14} /> {t("selection.rename")}
      </button>
      <button
        type="button"
        className="selbar__btn selbar__btn--danger"
        onClick={() => void useFiles.getState().removeSelected()}
      >
        <Trash2 size={14} /> {t("selection.delete")}
      </button>
      <button
        type="button"
        className="selbar__btn selbar__btn--icon"
        aria-label={t("selection.clear")}
        onClick={() => useFiles.getState().clearSelection()}
      >
        <X size={14} />
      </button>
    </div>
  );
}
