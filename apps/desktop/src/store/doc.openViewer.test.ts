import { beforeEach, describe, expect, it } from "vitest";
import type { FileNode } from "@/ipc/types";
import { useDoc } from "./doc";

const fileNode = (path: string): FileNode => ({
  path,
  name: path.split("/").pop() ?? path,
  kind: "file",
  ext: null,
  size: 0,
  mtime: 0,
  created: 0,
  gitStatus: "none",
  hasChildren: false,
});

/** Opening a document from the file browser is a "view" — it should land in the
 * read-only Preview (viewer), not the source editor. Exercised against the mock. */
describe("opening a file from the browser lands in the viewer", () => {
  beforeEach(() => {
    useDoc.setState({ tabs: [], activeId: null, secondaryId: null, mru: [], closedStack: [] });
  });

  it("a Markdown file opens in Preview mode", async () => {
    await useDoc.getState().openFile(fileNode("/Users/you/Notes/README.md"));
    const tab = useDoc.getState().tabs.find((t) => t.doc.id === "/Users/you/Notes/README.md");
    expect(tab?.mode).toBe("preview");
  });
});
