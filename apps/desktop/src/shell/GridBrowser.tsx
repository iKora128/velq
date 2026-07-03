import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePlus,
  FolderPlus,
  House,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FileGlyph } from "@/filemanager/FileGlyph";
import { clickSelect } from "@/filemanager/selectionClick";
import { useFileDnd } from "@/filemanager/useFileDnd";
import { useSelectionKeys } from "@/filemanager/useSelectionKeys";
import { useT } from "@/i18n/useT";
import type { FileNode, RecentDoc } from "@/ipc/types";
import { recentlyAdded } from "@/ipc/vault";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";

/** Build a lightweight FileNode for a remembered (path + name) recent entry, so it
 * renders through the same Tile as everything else. */
function recentNode(r: RecentDoc): FileNode {
  const dot = r.name.lastIndexOf(".");
  return {
    path: r.path,
    name: r.name,
    kind: "file",
    ext: dot > 0 ? r.name.slice(dot + 1) : null,
    size: 0,
    mtime: r.openedAt,
    created: r.openedAt,
    gitStatus: "none",
    hasChildren: false,
  };
}

/** The friendly default browser: a roomy grid of big, colour-coded icons you
 * double-click to open — like Finder's icon view or the Files app. Breadcrumbs
 * across the top say exactly where you are; folders come first, then files. */
export function GridBrowser() {
  const t = useT();
  const dnd = useFileDnd();
  const rootPath = useFiles((s) => s.rootPath);
  const rootName = useVault((s) => s.root?.name) ?? t("explorer.defaultName");
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const selection = useFiles((s) => s.selection);
  const recentDocs = useSettings((s) => s.recentDocs);
  const [cwd, setCwd] = useState<string | null>(rootPath);
  const [added, setAdded] = useState<FileNode[]>([]);

  // Follow the opened folder; if the vault changes under us, snap back to its root.
  useEffect(() => {
    if (rootPath && (!cwd || (cwd !== rootPath && !cwd.startsWith(`${rootPath}/`)))) {
      setCwd(rootPath);
    }
  }, [rootPath, cwd]);

  const here = cwd ?? rootPath;

  // Lazily load whichever folder we're showing.
  useEffect(() => {
    if (here && !childrenByPath[here]) void useFiles.getState().loadDir(here);
  }, [here, childrenByPath]);

  // Refresh the Home "Recently added" list whenever we land on the vault root.
  const atRoot = here === rootPath;
  useEffect(() => {
    if (!rootPath || !atRoot) return;
    let alive = true;
    recentlyAdded(rootPath, 8)
      .then((f) => alive && setAdded(f))
      .catch(() => alive && setAdded([]));
    return () => {
      alive = false;
    };
  }, [rootPath, atRoot]);

  const items = here ? childrenByPath[here] : undefined;
  const folders = items?.filter((n) => n.kind === "dir") ?? [];
  const files = items?.filter((n) => n.kind === "file") ?? [];
  // Visible order for Shift-range selection + Cmd/Ctrl+A (folders first, then files).
  const gridOrdered = [...folders, ...files];
  useSelectionKeys(gridOrdered);

  if (!rootPath || !here) {
    return (
      <div className="grid-browser">
        <div className="grid-scroll">
          <div className="empty">
            <p className="empty__hint">{t("grid.emptyNoFolder")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Home-only "Recents". "Recently added" earns its space by surfacing files buried
  // in subfolders, so drop ones already visible here at root (and any already shown
  // in the "Recently opened" row above it).
  const recentPaths = new Set(recentDocs.map((r) => r.path));
  const addedFiltered = atRoot
    ? added.filter(
        (n) => !recentPaths.has(n.path) && n.path.slice(0, n.path.lastIndexOf("/")) !== rootPath,
      )
    : [];
  const hasRecents = atRoot && (recentDocs.length > 0 || addedFiltered.length > 0);

  const crumbs: { name: string; path: string }[] = [{ name: rootName, path: rootPath }];
  if (here !== rootPath && here.startsWith(`${rootPath}/`)) {
    let acc = rootPath;
    for (const seg of here.slice(rootPath.length + 1).split("/")) {
      acc = `${acc}/${seg}`;
      crumbs.push({ name: seg, path: acc });
    }
  }

  const open = (node: FileNode) => {
    if (node.kind === "dir") {
      useFiles.getState().select(node);
      setCwd(node.path);
    } else {
      void useDoc.getState().openFile(node, { preview: false });
    }
  };

  const goUp = () => {
    if (here === rootPath) return;
    const parent = here.slice(0, here.lastIndexOf("/"));
    setCwd(parent.length >= rootPath.length ? parent : rootPath);
  };

  return (
    <div className="grid-browser">
      <div className="crumbbar">
        <button
          type="button"
          className="icon-btn"
          title={t("grid.back")}
          aria-label={t("grid.back")}
          disabled={here === rootPath}
          onClick={goUp}
        >
          <ChevronLeft size={16} />
        </button>
        <nav className="crumbs" aria-label={t("grid.location")}>
          {crumbs.map((c, i) => (
            <span className="crumbs__seg" key={c.path}>
              {i > 0 && <ChevronRight size={14} className="crumbs__sep" />}
              <button
                type="button"
                // Ancestor crumbs are drop targets — drag a file onto one to move it up.
                {...(i < crumbs.length - 1 ? dnd.dropProps(c.path) : {})}
                className={cn(
                  "crumbs__btn",
                  i === crumbs.length - 1 && "is-current",
                  dnd.dropTarget === c.path && "is-drop-target",
                )}
                onClick={() => setCwd(c.path)}
              >
                {i === 0 && <House size={14} className="crumbs__home" />}
                {c.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="crumbbar__spacer" />
        <button
          type="button"
          className="icon-btn"
          title={t("common.newDoc")}
          aria-label={t("common.newDoc")}
          onClick={() => void useFiles.getState().newFile(here)}
        >
          <FilePlus size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t("common.newFolder")}
          aria-label={t("common.newFolder")}
          onClick={() => void useFiles.getState().newFolder(here)}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {!items ? (
        <div className="grid-scroll">
          <div className="empty">
            <p className="empty__hint">{t("common.loading")}</p>
          </div>
        </div>
      ) : folders.length === 0 && files.length === 0 && !hasRecents ? (
        <div className="grid-scroll">
          <div className="empty">
            <div className="empty__title">{t("grid.emptyTitle")}</div>
            <p className="empty__hint">{t("grid.emptyHint")}</p>
          </div>
        </div>
      ) : (
        <div className="grid-scroll">
          {atRoot && recentDocs.length > 0 && (
            <>
              <div className="grid-group">
                <Clock size={12} /> {t("grid.recentlyOpened")}
              </div>
              <div className="tilegrid">
                {recentDocs.slice(0, 8).map((r) => {
                  const n = recentNode(r);
                  return (
                    <Tile
                      key={`ro:${n.path}`}
                      node={n}
                      selected={selection.has(n.path)}
                      onOpen={open}
                    />
                  );
                })}
              </div>
            </>
          )}
          {addedFiltered.length > 0 && (
            <>
              <div className="grid-group">
                <Sparkles size={12} /> {t("grid.recentlyAdded")}
              </div>
              <div className="tilegrid">
                {addedFiltered.map((n) => (
                  <Tile
                    key={`ra:${n.path}`}
                    node={n}
                    selected={selection.has(n.path)}
                    onOpen={open}
                  />
                ))}
              </div>
            </>
          )}
          {folders.length > 0 && (
            <>
              <div className="grid-group">{t("common.folders")}</div>
              <div className="tilegrid">
                {folders.map((n) => (
                  <Tile
                    key={n.path}
                    node={n}
                    selected={selection.has(n.path)}
                    onOpen={open}
                    ordered={gridOrdered}
                    dnd={dnd}
                  />
                ))}
              </div>
            </>
          )}
          {files.length > 0 && (
            <>
              <div className="grid-group">{t("common.files")}</div>
              <div className="tilegrid">
                {files.map((n) => (
                  <Tile
                    key={n.path}
                    node={n}
                    selected={selection.has(n.path)}
                    onOpen={open}
                    ordered={gridOrdered}
                    dnd={dnd}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({
  node,
  selected,
  onOpen,
  ordered,
  dnd,
}: {
  node: FileNode;
  selected: boolean;
  onOpen: (n: FileNode) => void;
  ordered?: FileNode[];
  dnd?: ReturnType<typeof useFileDnd>;
}) {
  const isDir = node.kind === "dir";
  return (
    <button
      type="button"
      {...(dnd ? dnd.dragProps(node) : {})}
      {...(isDir && dnd ? dnd.dropProps(node.path) : {})}
      className={cn("tile", selected && "is-selected", dnd?.dropTarget === node.path && "is-drop")}
      title={node.name}
      onClick={(e) => (ordered ? clickSelect(e, node, ordered) : useFiles.getState().select(node))}
      onDoubleClick={() => onOpen(node)}
      onContextMenu={(e) => {
        e.preventDefault();
        // Keep a multi-selection if the right-clicked tile is part of it.
        if (!useFiles.getState().selection.has(node.path)) useFiles.getState().select(node);
      }}
    >
      <span className="tile__art">
        <FileGlyph
          ext={node.ext}
          kind={node.kind}
          size={isDir ? 52 : 46}
          duotone
          strokeWidth={1.4}
        />
      </span>
      <span className="tile__label">{node.name}</span>
    </button>
  );
}
