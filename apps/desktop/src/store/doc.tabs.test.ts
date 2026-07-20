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

describe("Chrome-style tab navigation", () => {
  beforeEach(() => {
    useDoc.setState({ tabs: [], activeId: null, secondaryId: null, mru: [], closedStack: [] });
  });

  it("closeActive closes the current tab and is a no-op when empty", () => {
    openTab("a.md");
    openTab("b.md");
    useDoc.getState().closeActive();
    expect(ids()).toEqual(["a.md"]);
    useDoc.getState().closeActive();
    expect(ids()).toEqual([]);
    expect(() => useDoc.getState().closeActive()).not.toThrow();
  });

  it("⌘⌥→ / ⌘⌥← walk the strip and wrap at both ends", () => {
    openTab("a.md");
    openTab("b.md");
    openTab("c.md");
    useDoc.getState().activate("/v/a.md");
    useDoc.getState().activateNext();
    expect(active()).toBe("b.md");
    useDoc.getState().activateNext();
    expect(active()).toBe("c.md");
    useDoc.getState().activateNext(); // wraps
    expect(active()).toBe("a.md");
    useDoc.getState().activatePrev(); // wraps back
    expect(active()).toBe("c.md");
  });

  it("⌘1–9 jump to a tab by position; ⌘9 always lands on the last", () => {
    openTab("a.md");
    openTab("b.md");
    openTab("c.md");
    useDoc.getState().activateIndex(0);
    expect(active()).toBe("a.md");
    useDoc.getState().activateIndex(1);
    expect(active()).toBe("b.md");
    useDoc.getState().activateIndex(Number.MAX_SAFE_INTEGER); // ⌘9 → last, clamped
    expect(active()).toBe("c.md");
  });

  it("reopens closed tabs in reverse order (⌘⇧T)", () => {
    openTab("a.md");
    openTab("b.md");
    useDoc.getState().close("/v/a.md");
    useDoc.getState().close("/v/b.md");
    expect(ids()).toEqual([]);

    useDoc.getState().reopenClosed();
    expect(active()).toBe("b.md"); // last closed comes back first
    useDoc.getState().reopenClosed();
    expect(ids()).toEqual(["b.md", "a.md"]);

    // Nothing left to reopen → no-op, no throw.
    expect(() => useDoc.getState().reopenClosed()).not.toThrow();
  });

  it("restores an unsaved scratch tab's content on reopen", () => {
    const scratch: Doc = { id: "scratch:1", path: null, name: "Untitled", language: "markdown" };
    useDoc.getState().open(scratch, "keep me");
    useDoc.getState().reportChange("keep me — edited");
    useDoc.getState().close("scratch:1");

    useDoc.getState().reopenClosed();
    const back = useDoc.getState().tabs.find((t) => t.doc.id === "scratch:1");
    expect(back?.content).toBe("keep me — edited");
  });
});
