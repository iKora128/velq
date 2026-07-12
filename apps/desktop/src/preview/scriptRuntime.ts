/**
 * Running the page's own scripts inside the editable preview (W6 extension).
 *
 * Some HTML lays *itself* out in JavaScript — a slide deck whose fixed-size
 * slides a `fit()` routine shrinks to the window, a widget that builds its own
 * chrome. With scripts off (the default sandbox) such a page renders broken, so
 * "edit the rendered result" is unusable on it. Turning scripts on fixes the
 * display, but then the DOM carries nodes the *source never had* — nav dots the
 * script appended, an `active` class it toggled. A structural write-back
 * serializes the live body, so those runtime-only nodes would get baked into the
 * file forever.
 *
 * The fix mirrors `elementSelect`'s clean-write-back: identify what the scripts
 * added (by diffing the live body against a script-free parse of the source),
 * then remove exactly those nodes around each structural serialization and put
 * them straight back. Text-only edits never serialize the DOM (`rebuildHtml`), so
 * they're already safe and don't need any of this.
 *
 * Known limit: only script-*added nodes* under <body> are stripped. A script that
 * mutates an existing source element's attributes over time (toggling a class on
 * a hand-written element) may not fully round-trip through a *structural* edit;
 * text edits always do. Good enough for the deck/widget case, and it never
 * removes hand-written content.
 */

/** Does the source carry a `<script>` that would run once scripts are enabled? */
export function containsScript(source: string): boolean {
  return /<script[\s>]/i.test(source);
}

/** Element identity for alignment: same tag, and same id when either side has one
 * (an id is the strongest signal a hand-written element survived into the DOM). */
function nodesMatch(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === Node.ELEMENT_NODE) {
    const ea = a as Element;
    const eb = b as Element;
    if (ea.tagName !== eb.tagName) return false;
    const ia = ea.getAttribute("id");
    const ib = eb.getAttribute("id");
    if (ia || ib) return ia === ib;
    return true;
  }
  // Text / comment nodes align positionally.
  return true;
}

/**
 * Walk pristine (source) and live (post-script) children in step; any live child
 * with no pristine counterpart was inserted by a script. Greedy forward matching
 * assumes scripts *insert* nodes rather than reorder/remove source ones — the
 * common case for decks and self-building widgets. Matched elements recurse;
 * script-added nodes are recorded whole (their subtree goes with them).
 */
function diffChildren(pristine: Node, live: Node, out: Set<Node>): void {
  const pc = pristine.childNodes;
  let pi = 0;
  for (const ln of Array.from(live.childNodes)) {
    let m = -1;
    for (let k = pi; k < pc.length; k++) {
      if (nodesMatch(pc[k], ln)) {
        m = k;
        break;
      }
    }
    if (m === -1) {
      out.add(ln); // script-generated — don't recurse into it
    } else {
      pi = m + 1;
      if (ln.nodeType === Node.ELEMENT_NODE) diffChildren(pc[m], ln, out);
    }
  }
}

/**
 * The live `<body>` nodes a script generated, found by diffing against a
 * script-free parse of `source`. DOMParser never runs scripts, so its body is the
 * pristine source structure; anything extra in the live body came from JS.
 */
export function collectScriptNodes(liveBody: HTMLElement, source: string): Set<Node> {
  const out = new Set<Node>();
  const pristine = new DOMParser().parseFromString(source, "text/html").body;
  if (!pristine) return out;
  diffChildren(pristine, liveBody, out);
  return out;
}

/**
 * Serialize `body.innerHTML` for a structural write-back with the script-added
 * nodes taken out first and restored right after — so the source never gains what
 * only existed at runtime. Velq's own edit markers are stripped in the same pass.
 * Nested script nodes are handled by the `body.contains` guard: removing an
 * ancestor detaches its descendants, which are then skipped and ride back with it.
 */
export function serializeBodyInnerClean(body: HTMLElement, scriptNodes: Set<Node>): string {
  const detached: Array<[Node, Node, Node | null]> = [];
  for (const n of scriptNodes) {
    const parent = n.parentNode;
    if (parent && body.contains(n)) {
      detached.push([n, parent, n.nextSibling]);
      parent.removeChild(n);
    }
  }
  const inner = body.innerHTML
    .replaceAll(' data-velq-hover=""', "")
    .replaceAll(' data-velq-sel=""', "");
  // Restore in reverse: a node's saved `nextSibling` may itself be a detached
  // node, so re-inserting later siblings first guarantees the anchor is present.
  for (let i = detached.length - 1; i >= 0; i--) {
    const [n, parent, next] = detached[i];
    parent.insertBefore(n, next);
  }
  return inner;
}
