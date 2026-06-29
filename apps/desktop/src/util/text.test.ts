import { describe, expect, it } from "vitest";
import { countWords } from "./text";

describe("countWords", () => {
  it("counts plain words", () => {
    expect(countWords("hello world")).toBe(2);
  });
  it("treats hyphenated and apostrophe words as one", () => {
    expect(countWords("it's a well-known fact")).toBe(4);
  });
  it("ignores punctuation and extra whitespace", () => {
    expect(countWords("  one,   two…  three!  ")).toBe(3);
  });
  it("counts CJK runs", () => {
    // No spaces between CJK chars → one run. Good enough for a live counter.
    expect(countWords("日本語")).toBe(1);
    expect(countWords("hello 世界")).toBe(2);
  });
  it("is zero for empty / whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
  });
});
