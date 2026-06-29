import { FilePlus, FolderOpen, FolderPlus, PanelLeft } from "lucide-react";
import { Tree } from "@/filemanager/Tree";
import { useFiles } from "@/store/files";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";

export function Sidebar() {
  const root = useVault((s) => s.root);
  const open = useVault((s) => s.open);

  return (
    <aside className="sidebar">
      <div className="pane-head">
        <div className="brand">
          <span className="brand__mark" aria-hidden />
          Velq
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
          onClick={() => useUI.getState().toggleSidebar()}
        >
          <PanelLeft size={16} />
        </button>
      </div>

      {root ? <VaultPane name={root.name} /> : <SidebarEmpty onOpen={open} />}
    </aside>
  );
}

function VaultPane({ name }: { name: string }) {
  const newFile = () => {
    const f = useFiles.getState();
    void f.newFile(f.targetDir());
  };
  const newFolder = () => {
    const f = useFiles.getState();
    void f.newFolder(f.targetDir());
  };

  return (
    <>
      <div className="vault-head">
        <span className="vault-head__name" title={name}>
          {name}
        </span>
        <div className="vault-head__actions">
          <button
            type="button"
            className="icon-btn"
            title="New document"
            aria-label="New document"
            onClick={newFile}
          >
            <FilePlus size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="New folder"
            aria-label="New folder"
            onClick={newFolder}
          >
            <FolderPlus size={15} />
          </button>
        </div>
      </div>
      <Tree />
    </>
  );
}

function SidebarEmpty({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sidebar__scroll">
      <div className="empty">
        <FolderOpen className="empty__icon" size={28} strokeWidth={1.5} />
        <div className="empty__title">No folder open</div>
        <p className="empty__hint">
          Choose a folder for your writing — it&rsquo;s just a folder on your computer.
        </p>
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          Open folder
        </button>
      </div>
    </div>
  );
}
