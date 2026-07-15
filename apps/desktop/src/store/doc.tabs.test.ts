import { beforeEach, describe, expect, it } from "vitest";
import { type Doc, useDoc } from "./doc";

const doc = (name: string): Doc => ({
  id: `/v/${name}`,
  path: `/v/${name}`,
  name,
  language: "markdown",
});

const openTab = (name: string) => useDoc.getState().open(doc(name), `# ${name}`);
const ids = () => useDoc.getState().tabs.map((t) => t.doc.name);
const active = () => {
  const s = useDoc.getState();
  return s.tabs.find((t) => t.doc.id === s.activeId)?.doc.name ?? null;
};

describe("closing a tab hands you back to where you came from", () => {
  beforeEach(() => {
    useDoc.setState({ tabs: [], activeId: null, secondaryId: null, mru: [] });
  });

  /** The reported bug: working in A, peek at C, close C — you used to land on B,
   * a tab you never touched, because close picked the spatial neighbour. */
  it("returns to the tab you were last in, not the one beside it", () => {
    openTab("a.md");
    openTab("b.md");
    openTab("c.md");
    useDoc.getState().activate("/v/a.md"); // working in A
    useDoc.getState().activate("/v/c.md"); // peek at C

    useDoc.getState().close("/v/c.md");

    expect(ids()).toEqual(["a.md", "b.md"]);
    expect(active()).toBe("a.md"); // was "b.md" before the fix
  });

  it("closing a tab you are not in leaves the active one alone", () => {
    openTab("a.md");
    openTab("b.md");
    useDoc.getState().activate("/v/b.md");

    useDoc.getState().close("/v/a.md");

    expect(active()).toBe("b.md");
  });

  it("walks back through the visit history as tabs close", () => {
    openTab("a.md");
    openTab("b.md");
    openTab("c.md");
    useDoc.getState().activate("/v/a.md");
    useDoc.getState().activate("/v/b.md");
    useDoc.getState().activate("/v/c.md");

    useDoc.getState().close("/v/c.md");
    expect(active()).toBe("b.md");
    useDoc.getState().close("/v/b.md");
    expect(active()).toBe("a.md");
  });

  it("falls back to a neighbour when there is no history to go on", () => {
    openTab("a.md");
    openTab("b.md");
    // Simulate a restored session: tabs exist, history does not.
    useDoc.setState({ mru: [], activeId: "/v/a.md" });

    useDoc.getState().close("/v/a.md");

    expect(active()).toBe("b.md");
  });

  it("closing the last tab leaves nothing active", () => {
    openTab("a.md");
    useDoc.getState().close("/v/a.md");
    expect(useDoc.getState().activeId).toBeNull();
    expect(ids()).toEqual([]);
  });

  it("a renamed tab is still remembered as where you came from", () => {
    openTab("a.md");
    openTab("b.md");
    useDoc.getState().activate("/v/a.md");
    useDoc.getState().activate("/v/b.md");
    useDoc.getState().renameDoc("/v/a.md", "/v/renamed.md", "renamed.md");

    useDoc.getState().close("/v/b.md");

    expect(active()).toBe("renamed.md");
  });
});
