import { useEffect, useRef } from "react";
import type { FileNode } from "@/ipc/types";

interface Props {
  node: FileNode;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

/** Inline rename field. On focus it pre-selects the base name and protects the
 * extension (Finder behavior). Enter/Tab commit, Esc cancels, blur commits. */
export function RenameInput({ node, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = node.kind === "file" ? node.name.lastIndexOf(".") : -1;
    el.setSelectionRange(0, dot > 0 ? dot : node.name.length);
  }, [node]);

  const commit = (value: string) => {
    if (done.current) return;
    done.current = true;
    onCommit(value);
  };

  return (
    <input
      ref={ref}
      className="tree-rename"
      defaultValue={node.name}
      spellCheck={false}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          done.current = true;
          onCancel();
        }
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
    />
  );
}
