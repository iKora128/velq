import { FilePlus, FolderOpen, FolderPlus, PanelLeft } from "lucide-react";
import { Tree } from "@/filemanager/Tree";
import { useT } from "@/i18n/useT";
import { useFiles } from "@/store/files";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";

export function Sidebar() {
  const t = useT();
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
          title={t("common.toggleSidebar")}
          aria-label={t("common.toggleSidebar")}
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
  const t = useT();
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
            title={t("common.newDoc")}
            aria-label={t("common.newDoc")}
            onClick={newFile}
          >
            <FilePlus size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t("common.newFolder")}
            aria-label={t("common.newFolder")}
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
  const t = useT();
  return (
    <div className="sidebar__scroll">
      <div className="empty">
        <FolderOpen className="empty__icon" size={28} strokeWidth={1.5} />
        <div className="empty__title">{t("sidebar.emptyTitle")}</div>
        <p className="empty__hint">{t("sidebar.emptyHint")}</p>
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          {t("common.openFolder")}
        </button>
      </div>
    </div>
  );
}
