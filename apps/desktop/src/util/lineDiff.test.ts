import { describe, expect, it } from "vitest";
import { type DiffLine, lineDiff } from "./lineDiff";

const types = (lines: DiffLine[]) => lines.map((l) => l.type).join(" ");

describe("lineDiff", () => {
  it("treats a brand-new file (empty old) as all additions", () => {
    const out = lineDiff("", "a\nb\nc");
    expect(out).toEqual([
      { type: "add", text: "a" },
      { type: "add", text: "b" },
      { type: "add", text: "c" },
    ]);
  });

  it("emits nothing changed when the text is identical", () => {
    const out = lineDiff("a\nb", "a\nb");
    expect(types(out)).toBe("ctx ctx");
  });

  it("shows a one-line replacement as del + add", () => {
    const out = lineDiff("hello world", "GOODBYE");
    expect(out).toEqual([
      { type: "del", text: "hello world" },
      { type: "add", text: "GOODBYE" },
    ]);
  });

  it("keeps surrounding lines as context around an insertion", () => {
    const out = lineDiff("a\nc", "a\nb\nc");
    expect(types(out)).toBe("ctx add ctx");
    expect(out.find((l) => l.type === "add")?.text).toBe("b");
  });

  it("marks a removed line as del between context", () => {
    const out = lineDiff("a\nb\nc", "a\nc");
    expect(types(out)).toBe("ctx del ctx");
    expect(out.find((l) => l.type === "del")?.text).toBe("b");
  });

  it("reconstructs the new text from ctx + add lines", () => {
    const before = "one\ntwo\nthree\nfour";
    const after = "one\n2\nthree\nfour\nfive";
    const rebuilt = lineDiff(before, after)
      .filter((l) => l.type !== "del")
      .map((l) => l.text)
      .join("\n");
    expect(rebuilt).toBe(after);
  });

  it("stays cheap on a large edit via the block fallback", () => {
    const before = Array.from({ length: 500 }, (_, i) => `old-${i}`).join("\n");
    const after = Array.from({ length: 500 }, (_, i) => `new-${i}`).join("\n");
    const out = lineDiff(before, after);
    // 500×500 = 250k > 40k guard → plain del-block then add-block.
    expect(out.filter((l) => l.type === "del")).toHaveLength(500);
    expect(out.filter((l) => l.type === "add")).toHaveLength(500);
    expect(out[0]).toEqual({ type: "del", text: "old-0" });
    expect(out[out.length - 1]).toEqual({ type: "add", text: "new-499" });
  });
});
