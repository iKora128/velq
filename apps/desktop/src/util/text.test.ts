import { describe, expect, it } from "vitest";
import { countChars, countWords, formatCount, isCjkText } from "./text";

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

describe("countChars", () => {
  it("counts letters, not whitespace", () => {
    expect(countChars("hello world")).toBe(10);
    expect(countChars("  a\n\tb  ")).toBe(2);
  });
  it("counts CJK characters incl. punctuation, excl. the ideographic space", () => {
    expect(countChars("日本語")).toBe(3);
    expect(countChars("こんにちは、世界。")).toBe(9);
    expect(countChars("あ　い")).toBe(2); // U+3000 between is not counted
  });
  it("counts an astral code point once", () => {
    expect(countChars("a😀b")).toBe(3);
  });
});

describe("isCjkText", () => {
  it("is true for Japanese prose", () => {
    expect(isCjkText("これは日本語の文章です。")).toBe(true);
    expect(isCjkText("見出し\n\n本文をここに書きます。")).toBe(true);
  });
  it("is false for English prose", () => {
    expect(isCjkText("This is an English sentence.")).toBe(false);
    expect(isCjkText("")).toBe(false);
  });
  it("is true once CJK is a meaningful share, even when mixed", () => {
    expect(isCjkText("Velq は日本語も書ける静かなエディタです")).toBe(true);
    // A lone loanword in an English sentence stays word-counted.
    expect(isCjkText("The word 猫 means cat in Japanese and is common.")).toBe(false);
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(1204)).toBe("1,204");
    expect(formatCount(1000000)).toBe("1,000,000");
  });
});
