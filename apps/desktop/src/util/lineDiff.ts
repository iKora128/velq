/** One line of a proposed edit's preview: added, removed, or unchanged context. */
export type DiffLine = { type: "add" | "del" | "ctx"; text: string };

/**
 * A minimal line-level diff for previewing a file edit the assistant proposes (the
 * permission card's "what will change"). Not a full Myers diff — it trims the common
 * prefix/suffix (emitting them as context), then runs an LCS on just the changed middle,
 * so a small edit in a big file stays cheap. A pathologically large changed region falls
 * back to a plain remove-then-add block (bounded cost). A brand-new file (`oldText === ""`)
 * is all adds. The result is a complete diff; the caller decides how much of it to show.
 */
export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText ? oldText.split("\n") : [];
  const b = newText.split("\n");

  // Common prefix / suffix — unchanged, so we keep them as context but don't diff them.
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let ea = a.length;
  let eb = b.length;
  while (ea > p && eb > p && a[ea - 1] === b[eb - 1]) {
    ea--;
    eb--;
  }

  const out: DiffLine[] = [];
  for (let k = 0; k < p; k++) out.push({ type: "ctx", text: a[k] });

  const midA = a.slice(p, ea);
  const midB = b.slice(p, eb);
  // Keep O(n·m) LCS bounded; beyond that, just show the removed block then the added one.
  if (midA.length * midB.length > 40_000) {
    for (const text of midA) out.push({ type: "del", text });
    for (const text of midB) out.push({ type: "add", text });
  } else {
    out.push(...lcsDiff(midA, midB));
  }

  for (let k = ea; k < a.length; k++) out.push({ type: "ctx", text: a[k] });
  return out;
}

/** LCS-based line diff over two (already prefix/suffix-trimmed) line arrays. */
function lcsDiff(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];
  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}
