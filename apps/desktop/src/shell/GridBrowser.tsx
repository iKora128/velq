import { ChevronLeft, ChevronRight, FilePlus, FolderPlus, House } from "lucide-react";
import { useEffect, useState } from "react";
import { FileGlyph } from "@/filemanager/FileGlyph";
import type { FileNode } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";

/** The friendly default browser: a roomy grid of big, colour-coded icons you
 * double-click to open — like Finder's icon view or the Files app. Breadcrumbs
 * across the top say exactly where you are; folders come first, then files. */
export function GridBrowser() {
  const rootPath = useFiles((s) => s.rootPath);
  const rootName = useVault((s) => s.root?.name ?? "Files");
  const childrenByPath = useFiles((s) => s.childrenByPath);
  const selectedPath = useFiles((s) => s.selected?.path ?? null);
  const [cwd, setCwd] = useState<string | null>(rootPath);

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

  if (!rootPath || !here) {
    return (
      <div className="grid-browser">
        <div className="grid-scroll">
          <div className="empty">
            <p className="empty__hint">Open a folder to browse it here.</p>
          </div>
        </div>
      </div>
    );
  }

  const items = childrenByPath[here];
  const folders = items?.filter((n) => n.kind === "dir") ?? [];
  const files = items?.filter((n) => n.kind === "file") ?? [];

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
          title="Back"
          aria-label="Back"
          disabled={here === rootPath}
          onClick={goUp}
        >
          <ChevronLeft size={16} />
        </button>
        <nav className="crumbs" aria-label="Location">
          {crumbs.map((c, i) => (
            <span className="crumbs__seg" key={c.path}>
              {i > 0 && <ChevronRight size={14} className="crumbs__sep" />}
              <button
                type="button"
                className={cn("crumbs__btn", i === crumbs.length - 1 && "is-current")}
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
          title="New document"
          aria-label="New document"
          onClick={() => void useFiles.getState().newFile(here)}
        >
          <FilePlus size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="New folder"
          aria-label="New folder"
          onClick={() => void useFiles.getState().newFolder(here)}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {!items ? (
        <div className="grid-scroll">
          <div className="empty">
            <p className="empty__hint">Loading…</p>
          </div>
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="grid-scroll">
          <div className="empty">
            <div className="empty__title">This folder is empty</div>
            <p className="empty__hint">Use the + buttons above to add a document or a folder.</p>
          </div>
        </div>
      ) : (
        <div className="grid-scroll">
          {folders.length > 0 && (
            <>
              <div className="grid-group">Folders</div>
              <div className="tilegrid">
                {folders.map((n) => (
                  <Tile key={n.path} node={n} selected={selectedPath === n.path} onOpen={open} />
                ))}
              </div>
            </>
          )}
          {files.length > 0 && (
            <>
              <div className="grid-group">Files</div>
              <div className="tilegrid">
                {files.map((n) => (
                  <Tile key={n.path} node={n} selected={selectedPath === n.path} onOpen={open} />
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
}: {
  node: FileNode;
  selected: boolean;
  onOpen: (n: FileNode) => void;
}) {
  const isDir = node.kind === "dir";
  return (
    <button
      type="button"
      className={cn("tile", selected && "is-selected")}
      title={node.name}
      onClick={() => useFiles.getState().select(node)}
      onDoubleClick={() => onOpen(node)}
      onContextMenu={(e) => {
        e.preventDefault();
        useFiles.getState().select(node);
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
