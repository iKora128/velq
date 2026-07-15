import { describe, expect, it } from "vitest";
import { canDrop } from "./useFileDnd";

describe("canDrop", () => {
  it("allows a plain move into another folder", () => {
    expect(canDrop(["/v/a.md"], "/v/docs")).toBe(true);
  });

  it("refuses a drop with nothing being dragged", () => {
    expect(canDrop([], "/v/docs")).toBe(false);
  });

  it("refuses dropping a folder onto itself", () => {
    expect(canDrop(["/v/docs"], "/v/docs")).toBe(false);
  });

  /** Moving a folder inside its own subtree would orphan it. */
  it("refuses dropping a folder into its own descendant", () => {
    expect(canDrop(["/v/docs"], "/v/docs/sub")).toBe(false);
    expect(canDrop(["/v/docs"], "/v/docs/sub/deeper")).toBe(false);
  });

  it("refuses a no-op drop back into the folder it already lives in", () => {
    expect(canDrop(["/v/docs/a.md"], "/v/docs")).toBe(false);
  });

  it("allows a mixed selection as long as one item actually moves", () => {
    expect(canDrop(["/v/docs/a.md", "/v/b.md"], "/v/docs")).toBe(true);
  });

  it("is not fooled by a sibling folder sharing a name prefix", () => {
    // /v/docs2 is NOT inside /v/docs, despite the string prefix.
    expect(canDrop(["/v/docs"], "/v/docs2")).toBe(true);
  });
});
