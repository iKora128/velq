/** Count words the way a writer expects: Unicode letters/numbers, apostrophes and
 * hyphens kept inside words. Used for the live status-bar count. */
export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}’'-]+/gu);
  return m ? m.length : 0;
}
