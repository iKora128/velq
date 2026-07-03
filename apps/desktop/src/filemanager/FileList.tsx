import { ChevronRight, Inbox, Search } from "lucide-react";
import { useEffect } from "react";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { cn } from "@/util/cn";
import { FileGlyph } from "./FileGlyph";
import { clickSelect } from "./selectionClick";
import { useFileDnd } from "./useFileDnd";
import { useSelectionKeys } from "./useSelectionKeys";
import "./filelist.css";

function parentOf(p: string): string {
  return p.slice(0, p.lastIndexOf("/"));
}

/** The 2-pane "previewed file list" (plan §9.2 default): the documents in the
 * current folder, each with a title + body snippet. Folders sit at the top to
 * navigate within. When a search is active, shows ranked filename matches. */
export function FileList() {
  const t = useT();
  const dnd = useFileDnd();
  const selected = useFiles((s) => s.selected);
  const selection = useFiles((s) => s.selection);
  const rootPath = useFiles((s) => s.rootPath);
  const previewsByFolder = useFiles((s) => s.previewsByFolder);
  const searchQuery = useFiles((s) => s.searchQuery);
  const searchResults = useFiles((s) => s.searchResults);
  const openFile = useDoc((s) => s.openFile);

  const folder = selected
    ? selected.kind === "dir"
      ? selected.path
      : parentOf(selected.path)
    : rootPath;

  useEffect(() => {
    if (folder && !previewsByFolder[folder]) void useFiles.getState().loadPreviews(folder);
  }, [folder, previewsByFolder]);

  // Visible order for Shift-range selection + Cmd/Ctrl+A (folders first, then files).
  const previews = folder ? previewsByFolder[folder] : undefined;
  const ordered = previews
    ? [
        ...previews.filter((p) => p.node.kind === "dir"),
        ...previews.filter((p) => p.node.kind === "file"),
      ].map((p) => p.node)
    : [];
  useSelectionKeys(ordered);

  if (searchQuery.trim()) {
    if (searchResults.length === 0) {
      return (
        <div className="filelist">
          <div className="empty">
            <Search className="empty__icon" size={24} strokeWidth={1.5} />
            <p className="empty__hint">{t("filelist.noMatch", { query: searchQuery })}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="filelist">
        {searchResults.map((n) => {
          return (
            <button
              type="button"
              key={n.path}
              className={cn("filelist-result", selected?.path === n.path && "is-selected")}
              onClick={() => {
                useFiles.getState().select(n);
                if (n.kind === "file") void openFile(n, { preview: true });
              }}
              onDoubleClick={() => n.kind === "file" && void openFile(n, { preview: false })}
            >
              <FileGlyph ext={n.ext} kind={n.kind} size={15} className="filelist-result__icon" />
              <span className="filelist-result__name">{n.name}</span>
              <span className="filelist-result__path">{parentOf(n.path).split("/").pop()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (!folder) return null;
  const items = previewsByFolder[folder];

  if (!items) {
    return (
      <div className="filelist">
        <div className="empty">
          <p className="empty__hint">{t("common.loading")}</p>
        </div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="filelist">
        <div className="empty">
          <Inbox className="empty__icon" size={26} strokeWidth={1.5} />
          <div className="empty__title">{t("filelist.emptyTitle")}</div>
          <p className="empty__hint">{t("filelist.emptyHint")}</p>
        </div>
      </div>
    );
  }

  const folders = items.filter((i) => i.node.kind === "dir");
  const files = items.filter((i) => i.node.kind === "file");

  return (
    <div className="filelist">
      {folders.map((p) => (
        <button
          type="button"
          key={p.node.path}
          {...dnd.dragProps(p.node)}
          {...dnd.dropProps(p.node.path)}
          className={cn(
            "filelist-folder",
            selection.has(p.node.path) && "is-selected",
            dnd.dropTarget === p.node.path && "is-drop",
          )}
          onClick={(e) => clickSelect(e, p.node, ordered)}
        >
          <FileGlyph kind="dir" ext={null} size={15} className="filelist-folder__icon" />
          <span className="filelist-folder__name">{p.node.name}</span>
          <ChevronRight size={14} className="filelist-folder__chev" />
        </button>
      ))}
      {files.map((p) => (
        <button
          type="button"
          key={p.node.path}
          {...dnd.dragProps(p.node)}
          className={cn("filelist-card", selection.has(p.node.path) && "is-selected")}
          onClick={(e) => {
            if (clickSelect(e, p.node, ordered)) void openFile(p.node, { preview: true });
          }}
          onDoubleClick={() => void openFile(p.node, { preview: false })}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!useFiles.getState().selection.has(p.node.path)) useFiles.getState().select(p.node);
          }}
        >
          <div className="filelist-card__title">{p.title || p.node.name}</div>
          {p.snippet && <div className="filelist-card__snippet">{p.snippet}</div>}
          <div className="filelist-card__meta">
            {p.node.gitStatus !== "none" && <span className={`dot dot--${p.node.gitStatus}`} />}
            {p.node.name}
          </div>
        </button>
      ))}
    </div>
  );
}
