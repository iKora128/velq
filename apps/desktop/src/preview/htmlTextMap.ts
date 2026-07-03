/**
 * The heart of "edit the rendered result, write it back to source" (proposals W6).
 *
 * The preview renders HTML into an iframe; the user edits *text* there and we must
 * put that edit back at the *right place* in the original source — a naive string
 * replace would clobber a second identical word ("OK" appearing twice…). So we walk
 * the source once and record, in document order, every run of text that sits between
 * tags (its source offsets + raw slice + decoded value). The iframe's text nodes come
 * out in the same document order, so the Nth text node maps to the Nth run.
 *
 * This is a deliberately small hand-rolled scan, not a full HTML parser — good enough
 * for "tweak the wording" (the W6 goal). Known limits, acceptable for that scope:
 *   - a literal `>` inside a quoted attribute value can end a tag early;
 *   - only text between tags is editable (not attributes, not script/style bodies);
 *   - structural edits (adding/removing nodes) change the count and are rejected by
 *     the caller, which compares run count to live text-node count.
 */

export interface TextRun {
  /** Source offset where the run starts (inclusive). */
  start: number;
  /** Source offset where the run ends (exclusive). */
  end: number;
  /** The raw source slice — may still contain entities like `&amp;`. */
  raw: string;
  /** Decoded text, comparable to a DOM text node's `textContent`. */
  text: string;
}

/** Elements whose content is raw text, not markup — their body is not editable. */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decode the handful of entities that survive into visible text. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

/** Re-encode the characters that must not be literal in HTML text content. */
export function encodeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pushRun(runs: TextRun[], html: string, start: number, end: number): void {
  if (end <= start) return;
  const raw = html.slice(start, end);
  runs.push({ start, end, raw, text: decodeEntities(raw) });
}

/** Every run of between-tags text, in document order. */
export function extractTextRuns(html: string): TextRun[] {
  const runs: TextRun[] = [];
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      pushRun(runs, html, i, n);
      break;
    }
    if (lt > i) pushRun(runs, html, i, lt);

    // A comment — skip to its end.
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }

    // A tag — skip past its `>`, then read its name to spot raw-text elements.
    const gt = html.indexOf(">", lt);
    const tagInner = html.slice(lt + 1, gt < 0 ? n : gt);
    i = gt < 0 ? n : gt + 1;

    const isClosing = /^\s*\//.test(tagInner);
    const nameMatch = /^\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(tagInner);
    const name = nameMatch ? nameMatch[1].toLowerCase() : "";
    if (!isClosing && RAW_TEXT_ELEMENTS.has(name)) {
      // Jump to the matching close tag; the body is not a text run.
      const close = new RegExp(`</${name}[\\s/>]`, "i");
      const m = close.exec(html.slice(i));
      i = m ? i + m.index : n;
    }
  }
  return runs;
}

/**
 * Only the runs inside `<body>…</body>`. Editing happens on the iframe's `body`, and
 * browsers drop whitespace text nodes in `<head>` while our scan keeps them — so
 * restricting to the body is what keeps run count and live text-node count in step.
 * Offsets stay relative to the whole source, so `rebuildHtml` still returns the full
 * document (head untouched).
 */
export function extractBodyTextRuns(source: string): TextRun[] {
  const open = /<body[\s>]/i.exec(source);
  const close = /<\/body\s*>/i.exec(source);
  const start = open ? open.index : 0;
  const end = close ? close.index : source.length;
  return extractTextRuns(source).filter((r) => r.start >= start && r.end <= end);
}

/**
 * Rebuild the source with each run replaced by its (possibly edited) text. A run
 * whose decoded text is unchanged keeps its original raw slice verbatim — so
 * entities and original spacing survive untouched; only genuinely edited runs are
 * re-encoded. Throws if the counts disagree (the caller treats that as "structure
 * changed, don't write back").
 */
export function rebuildHtml(source: string, runs: TextRun[], newTexts: string[]): string {
  if (runs.length !== newTexts.length) {
    throw new Error(`text run count mismatch: ${runs.length} runs vs ${newTexts.length} texts`);
  }
  let out = "";
  let cursor = 0;
  for (let k = 0; k < runs.length; k++) {
    const run = runs[k];
    out += source.slice(cursor, run.start);
    out += newTexts[k] === run.text ? run.raw : encodeText(newTexts[k]);
    cursor = run.end;
  }
  out += source.slice(cursor);
  return out;
}
