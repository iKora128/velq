/** Count words the way a writer expects: Unicode letters/numbers, apostrophes and
 * hyphens kept inside words. Used for the live status-bar count. */
export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}’'-]+/gu);
  return m ? m.length : 0;
}

/** Characters a writer counts: Unicode code points minus all whitespace (spaces,
 * tabs, newlines, and the ideographic space U+3000). This is the number that
 * matters when word count is meaningless — Japanese 文字数 / manuscript counts
 * work the same way, since CJK has no inter-word spaces to count. */
export function countChars(text: string): number {
  return [...text.replace(/\s/gu, "")].length;
}

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/** True when the text is CJK-dominant enough that a word count misleads and a
 * character count ("文字") is the honest metric. Heuristic: at least a fifth of
 * the non-whitespace characters are Han, Hiragana or Katakana. */
export function isCjkText(text: string): boolean {
  const cjk = (text.match(CJK_RE) || []).length;
  if (cjk === 0) return false;
  const nonSpace = text.replace(/\s/gu, "").length;
  return nonSpace > 0 && cjk / nonSpace >= 0.2;
}

/** Group digits for the status-bar counts, e.g. 1204 → "1,204". */
export function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
