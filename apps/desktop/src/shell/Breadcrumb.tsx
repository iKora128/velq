import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import type { FileNode } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";

function dirNode(path: string, name: string): FileNode {
  return {
    path,
    name,
    kind: "dir",
    ext: null,
    size: 0,
    mtime: 0,
    gitStatus: "none",
    hasChildren: true,
  };
}

/** Always-on "you are here" cue (plan §9.4): clickable path from the vault root to
 * the open document; clicking a folder navigates the file list there. */
export function Breadcrumb() {
  const root = useVault((s) => s.root);
  const doc = useDoc((s) => s.doc);
  const dirty = useDoc((s) => s.dirty);

  if (!root) return <span className="crumbs__item">Velq</span>;

  const selectFolder = (path: string, name: string) =>
    useFiles.getState().select(dirNode(path, name));

  const path = doc?.path ?? "";
  const rel = path.startsWith(`${root.path}/`) ? path.slice(root.path.length + 1) : null;
  const parts = rel ? rel.split("/") : [];
  let acc = root.path;
  const segs = parts.map((name) => {
    acc = `${acc}/${name}`;
    return { name, path: acc };
  });

  return (
    <>
      <button
        type="button"
        className="crumbs__item"
        onClick={() => useFiles.getState().select(null)}
      >
        {root.name}
      </button>
      {segs.map((s, i) => {
        const isLast = i === segs.length - 1;
        return (
          <Fragment key={s.path}>
            <ChevronRight className="crumbs__sep" size={14} />
            {isLast ? (
              <span className={cn("crumbs__item", "crumbs__item--current")}>
                {s.name}
                {dirty && <span className="crumbs__dirty" title="Unsaved changes" />}
              </span>
            ) : (
              <button
                type="button"
                className="crumbs__item"
                onClick={() => selectFolder(s.path, s.name)}
              >
                {s.name}
              </button>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
