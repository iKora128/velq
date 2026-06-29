import { FilePlus, FolderPlus, Search, X } from "lucide-react";
import { useRef } from "react";
import { FileList } from "@/filemanager/FileList";
import { useFiles } from "@/store/files";
import { useVault } from "@/store/vault";

export function FileListPane() {
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

  return (
    <div className="file-list">
      <div className="list-toolbar">
        <div className="search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search this folder"
            spellCheck={false}
            disabled={!root}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search__clear"
              aria-label="Clear search"
              onClick={() => useFiles.getState().clearSearch()}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-btn"
          title="New document"
          aria-label="New document"
          onClick={newFile}
        >
          <FilePlus size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="New folder"
          aria-label="New folder"
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
            <p className="empty__hint">Your documents will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
