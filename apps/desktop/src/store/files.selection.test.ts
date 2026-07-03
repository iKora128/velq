import { beforeEach, describe, expect, it } from "vitest";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "./files";

function node(path: string, kind: "file" | "dir" = "file"): FileNode {
  return {
    path,
    name: path.split("/").pop() ?? path,
    kind,
    ext: null,
    size: 0,
    mtime: 0,
    created: 0,
    gitStatus: "none",
    hasChildren: false,
  };
}

const a = node("/v/a.md");
const b = node("/v/b.md");
const c = node("/v/c.md");
const d = node("/v/d.md");
const ordered = [a, b, c, d];
const paths = (s: Set<string>) => [...s].sort();

describe("files selection", () => {
  beforeEach(() => useFiles.getState().clearSelection());

  it("select replaces the selection and sets the lead", () => {
    useFiles.getState().select(a);
    expect(paths(useFiles.getState().selection)).toEqual([a.path]);
    useFiles.getState().select(b);
    expect(paths(useFiles.getState().selection)).toEqual([b.path]);
    expect(useFiles.getState().selected?.path).toBe(b.path);
  });

  it("toggleSelect adds then removes an item", () => {
    useFiles.getState().select(a);
    useFiles.getState().toggleSelect(b);
    expect(useFiles.getState().selection.has(a.path)).toBe(true);
    expect(useFiles.getState().selection.has(b.path)).toBe(true);
    useFiles.getState().toggleSelect(a);
    expect(useFiles.getState().selection.has(a.path)).toBe(false);
    expect(useFiles.getState().selection.size).toBe(1);
  });

  it("rangeSelectTo selects the run from the anchor, both directions", () => {
    useFiles.getState().select(a); // anchor = a
    useFiles.getState().rangeSelectTo(c, ordered);
    expect(paths(useFiles.getState().selection)).toEqual([a.path, b.path, c.path]);

    useFiles.getState().select(d); // anchor = d
    useFiles.getState().rangeSelectTo(b, ordered);
    expect(paths(useFiles.getState().selection)).toEqual([b.path, c.path, d.path]);
  });

  it("selectAll fills; clearSelection empties", () => {
    useFiles.getState().selectAll(ordered);
    expect(useFiles.getState().selection.size).toBe(4);
    useFiles.getState().clearSelection();
    expect(useFiles.getState().selection.size).toBe(0);
    expect(useFiles.getState().selected).toBeNull();
  });

  it("the lead is always part of the selection", () => {
    useFiles.getState().select(a);
    useFiles.getState().toggleSelect(b);
    const { selected, selection } = useFiles.getState();
    expect(selected && selection.has(selected.path)).toBe(true);
  });
});
