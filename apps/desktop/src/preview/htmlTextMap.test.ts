import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  encodeText,
  extractBodyTextRuns,
  extractTextRuns,
  rebuildHtml,
} from "./htmlTextMap";

describe("extractTextRuns", () => {
  it("captures text between tags with correct offsets", () => {
    const runs = extractTextRuns("<p>Hello</p>");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ start: 3, end: 8, raw: "Hello", text: "Hello" });
  });

  it("splits around nested inline tags, in document order", () => {
    const runs = extractTextRuns("<p>Hi <b>there</b>!</p>");
    expect(runs.map((r) => r.text)).toEqual(["Hi ", "there", "!"]);
  });

  it("excludes script and style bodies", () => {
    expect(extractTextRuns("<style>.a{color:red}</style><p>Yo</p>").map((r) => r.text)).toEqual([
      "Yo",
    ]);
    // The `<` in `1<2` must not be mistaken for a tag.
    expect(extractTextRuns("<script>var x=1<2</script><p>Z</p>").map((r) => r.text)).toEqual(["Z"]);
  });

  it("excludes comments", () => {
    expect(extractTextRuns("<!-- note --><p>Q</p>").map((r) => r.text)).toEqual(["Q"]);
  });

  it("does not capture attribute values", () => {
    const runs = extractTextRuns('<a href="https://velq.sh">link</a>');
    expect(runs.map((r) => r.text)).toEqual(["link"]);
  });

  it("decodes entities into comparable text but keeps raw", () => {
    const runs = extractTextRuns("<p>Tom &amp; Jerry</p>");
    expect(runs[0].text).toBe("Tom & Jerry");
    expect(runs[0].raw).toBe("Tom &amp; Jerry");
  });

  it("captures trailing text with no closing tag", () => {
    expect(extractTextRuns("<br>tail").map((r) => r.text)).toEqual(["tail"]);
  });
});

describe("extractBodyTextRuns", () => {
  it("keeps only runs inside <body>, excluding the head/title", () => {
    const src = "<html><head><title>T</title></head><body><p>Hi</p></body></html>";
    const runs = extractBodyTextRuns(src);
    expect(runs.map((r) => r.text)).toEqual(["Hi"]);
    // Offsets stay whole-source relative, so rebuild returns the full document.
    expect(rebuildHtml(src, runs, ["Yo"])).toBe(
      "<html><head><title>T</title></head><body><p>Yo</p></body></html>",
    );
  });

  it("falls back to the whole source when there is no <body>", () => {
    expect(extractBodyTextRuns("<p>x</p>").map((r) => r.text)).toEqual(["x"]);
  });
});

describe("decodeEntities / encodeText", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("a &lt;b&gt; &#39;c&#39; &#x41;")).toBe("a <b> 'c' A");
  });
  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("&bogus; &amp;")).toBe("&bogus; &");
  });
  it("encodes the three text-unsafe characters", () => {
    expect(encodeText('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d "e"');
  });
});

describe("rebuildHtml", () => {
  it("is the identity when nothing changed", () => {
    const src = "<p>Hi <b>there</b>!</p>";
    const runs = extractTextRuns(src);
    expect(
      rebuildHtml(
        src,
        runs,
        runs.map((r) => r.text),
      ),
    ).toBe(src);
  });

  it("writes an edited word back at the right place", () => {
    const src = "<p>Hello</p>";
    const runs = extractTextRuns(src);
    expect(rebuildHtml(src, runs, ["Hi"])).toBe("<p>Hi</p>");
  });

  it("only touches the run that changed, not an identical sibling", () => {
    const src = "<p>OK</p><p>OK</p>";
    const runs = extractTextRuns(src);
    expect(rebuildHtml(src, runs, ["OK", "Done"])).toBe("<p>OK</p><p>Done</p>");
  });

  it("re-encodes unsafe characters in edited text", () => {
    const src = "<p>A</p>";
    const runs = extractTextRuns(src);
    expect(rebuildHtml(src, runs, ["A & B"])).toBe("<p>A &amp; B</p>");
  });

  it("preserves original entity spelling when a run is unchanged", () => {
    const src = "<p>Tom &amp; Jerry</p>";
    const runs = extractTextRuns(src);
    // Same decoded value passed back → raw `&amp;` is kept, not flattened to `&`.
    expect(rebuildHtml(src, runs, ["Tom & Jerry"])).toBe(src);
  });

  it("throws when the counts disagree", () => {
    const runs = extractTextRuns("<p>x</p>");
    expect(() => rebuildHtml("<p>x</p>", runs, [])).toThrow(/mismatch/);
  });
});
