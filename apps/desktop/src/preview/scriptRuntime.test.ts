import { describe, expect, it } from "vitest";
import { replaceBodyHtml } from "./htmlTextMap";
import { collectScriptNodes, containsScript, serializeBodyInnerClean } from "./scriptRuntime";

describe("containsScript", () => {
  it("detects a script the page would run", () => {
    expect(containsScript("<body><script>fit()</script></body>")).toBe(true);
    expect(containsScript('<script src="a.js"></script>')).toBe(true);
    expect(containsScript("<p>no scripts here</p>")).toBe(false);
    // Not fooled by the word appearing in prose.
    expect(containsScript("<p>a transcript of the meeting</p>")).toBe(false);
  });
});

/** Parse `source` into a real body, then mutate it the way the page's own script
 * would at runtime (jsdom doesn't execute the script itself). */
function liveBodyFrom(source: string, mutate: (body: HTMLBodyElement) => void): HTMLBodyElement {
  const doc = new DOMParser().parseFromString(source, "text/html");
  mutate(doc.body as HTMLBodyElement);
  return doc.body as HTMLBodyElement;
}

/** Append `n` empty nav-dot buttons to `#navDots`, the way the deck's script does. */
function addNavDots(body: HTMLBodyElement, n: number): void {
  const dots = body.querySelector("#navDots");
  if (!dots) throw new Error("fixture missing #navDots");
  for (let i = 0; i < n; i++) {
    const btn = body.ownerDocument.createElement("button");
    btn.setAttribute("aria-label", `slide ${i + 1}`);
    if (i === 0) btn.classList.add("active");
    dots.appendChild(btn);
  }
}

function rewrite(source: string, body: HTMLBodyElement): string {
  const out = replaceBodyHtml(
    source,
    serializeBodyInnerClean(body, collectScriptNodes(body, source)),
  );
  if (out == null) throw new Error("replaceBodyHtml could not locate the body");
  return out;
}

const DECK = `<!doctype html><html><head><title>Deck</title></head><body><h1>Title</h1><div class="nav-dots" id="navDots"></div><script>/* builds nav dots */</script></body></html>`;

describe("collectScriptNodes + serializeBodyInnerClean", () => {
  it("finds the nodes a script appended and keeps them out of the saved source", () => {
    const body = liveBodyFrom(DECK, (b) => addNavDots(b, 3));

    expect(collectScriptNodes(body, DECK).size).toBe(3);
    const saved = rewrite(DECK, body);

    // The runtime-only buttons never reach the file…
    expect(saved).not.toContain("<button");
    expect(saved).not.toContain("aria-label");
    // …the hand-written structure survives, byte-for-byte where it matters…
    expect(saved).toContain("<h1>Title</h1>");
    expect(saved).toContain('<div class="nav-dots" id="navDots"></div>');
    expect(saved).toContain("<title>Deck</title>");
    // …and reopening it is stable (no accumulation on a second round-trip).
    expect(rewrite(saved, body)).toBe(saved);
  });

  it("restores the stripped nodes to the live DOM after serializing", () => {
    const body = liveBodyFrom(DECK, (b) => addNavDots(b, 2));
    serializeBodyInnerClean(body, collectScriptNodes(body, DECK));
    // The live view still shows what the script built — only the file omits it.
    expect(body.querySelectorAll("button")).toHaveLength(2);
    expect(body.querySelector("#navDots")?.childElementCount).toBe(2);
  });

  it("keeps a user's own structural edit (a node the script did not add)", () => {
    // Script added a dot; then the user also added a real paragraph.
    const body = liveBodyFrom(DECK, (b) => addNavDots(b, 1));
    const scriptNodes = collectScriptNodes(body, DECK); // snapshot before the user edit
    const p = body.ownerDocument.createElement("p");
    p.textContent = "User added this";
    body.appendChild(p);

    const inner = serializeBodyInnerClean(body, scriptNodes);
    expect(inner).toContain("<p>User added this</p>");
    expect(inner).not.toContain("<button");
  });

  it("no scripts added anything → serialization is just the clean body", () => {
    const body = liveBodyFrom(DECK, () => {});
    const scriptNodes = collectScriptNodes(body, DECK);
    expect(scriptNodes.size).toBe(0);
    const inner = serializeBodyInnerClean(body, scriptNodes);
    expect(inner).toContain('<div class="nav-dots" id="navDots"></div>');
    expect(inner).not.toContain("<button");
  });
});
