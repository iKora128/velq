import { FilePlus, FolderPlus, PanelLeft, Search, X } from "lucide-react";
import { useRef } from "react";
import { FileList } from "@/filemanager/FileList";
import { useT } from "@/i18n/useT";
import { useFiles } from "@/store/files";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";

export function FileListPane() {
  const t = useT();
  const root = useVault((s) => s.root);
  const searchQuery = useFiles((s) => s.searchQuery);
  const timer = useRef(0);

  const onSearch = (value: string) => {
    useFiles.setState({ searchQuery: value }); // controlled input updates immediately
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void useFiles.getState().runSearch(value), 140);
  };

  const newFile = () => {
    const f = useFiles.getState();
    void f.newFile(f.targetDir());
  };
  const newFolder = () => {
    const f = useFiles.getState();
    void f.newFolder(f.targetDir());
  };

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);

  return (
    <div className="file-list">
      <div className="list-toolbar">
        <button
          type="button"
          className={sidebarCollapsed ? "icon-btn" : "icon-btn icon-btn--active"}
          title={sidebarCollapsed ? t("filelist.showFolders") : t("filelist.hideFolders")}
          aria-label={sidebarCollapsed ? t("filelist.showFolders") : t("filelist.hideFolders")}
          aria-pressed={!sidebarCollapsed}
          onClick={() => useUI.getState().toggleSidebar()}
        >
          <PanelLeft size={16} />
        </button>
        <div className="search">
          <Search size={15} />
          <input
            type="text"
            placeholder={t("filelist.searchPlaceholder")}
            spellCheck={false}
            disabled={!root}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search__clear"
              aria-label={t("common.clearSearch")}
              onClick={() => useFiles.getState().clearSearch()}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-btn"
          title={t("common.newDoc")}
          aria-label={t("common.newDoc")}
          onClick={newFile}
        >
          <FilePlus size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t("common.newFolder")}
          aria-label={t("common.newFolder")}
          onClick={newFolder}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {root ? (
        <FileList />
      ) : (
        <div className="list-scroll">
          <div className="empty">
            <p className="empty__hint">{t("filelist.emptyNoRoot")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
