import { t } from "@/i18n";

/** W7 — grab an element on the rendered page (⌥click), DevTools-style: hover
 * with ⌥ held shows an outline, ⌥click selects and floats a tiny toolbar
 * (delete / duplicate). Mutations happen on the live DOM; the caller's
 * `writeBack` serializes the body, so no source mapping is needed here.
 *
 * Everything this module adds lives OUTSIDE the serialized region: the style
 * tag and the toolbar sit under <html>, not <body>, and the marker attributes
 * are stripped before every write-back (and re-applied after).
 */

const HOVER_ATTR = "data-velq-hover";
const SEL_ATTR = "data-velq-sel";

const STYLE = `
  [${HOVER_ATTR}] { outline: 1.5px dashed #2563eb99 !important; outline-offset: 2px; cursor: default; }
  [${SEL_ATTR}] { outline: 2px solid #2563eb !important; outline-offset: 2px; }
  .velq-elsel {
    position: absolute; z-index: 2147483647; display: flex; gap: 4px; align-items: center;
    background: #0e1726; color: #fff; border-radius: 8px; padding: 4px 6px;
    font: 12px/1 -apple-system, "Hiragino Sans", sans-serif;
    box-shadow: 0 6px 20px -6px rgba(14,23,38,.45);
  }
  .velq-elsel b { font-weight: 600; color: #93b4f8; margin: 0 4px 0 2px; text-transform: lowercase; }
  .velq-elsel button {
    all: unset; cursor: pointer; padding: 4px 8px; border-radius: 5px; color: #fff;
  }
  .velq-elsel button:hover { background: #ffffff22; }
`;

function clearAttr(doc: Document, attr: string): void {
  for (const el of doc.querySelectorAll(`[${attr}]`)) el.removeAttribute(attr);
}

/** Wraps `writeBack` so our marker attributes never reach the file. */
function makeCleanWriteBack(doc: Document, writeBack: () => void): () => void {
  return () => {
    const sel = doc.querySelector(`[${SEL_ATTR}]`);
    clearAttr(doc, SEL_ATTR);
    clearAttr(doc, HOVER_ATTR);
    writeBack();
    sel?.setAttribute(SEL_ATTR, "");
  };
}

export function attachElementSelect(iframe: HTMLIFrameElement, writeBack: () => void): () => void {
  const idoc = iframe.contentDocument;
  const body = idoc?.body;
  const root = idoc?.documentElement;
  if (!idoc || !body || !root) return () => {};

  const style = idoc.createElement("style");
  style.textContent = STYLE;
  idoc.head.appendChild(style);

  // The toolbar lives under <html> so body.innerHTML serialization never sees it.
  const bar = idoc.createElement("div");
  bar.className = "velq-elsel";
  bar.style.display = "none";
  const tag = idoc.createElement("b");
  const del = idoc.createElement("button");
  del.textContent = t("elsel.delete");
  const dup = idoc.createElement("button");
  dup.textContent = t("elsel.duplicate");
  bar.append(tag, del, dup);
  root.appendChild(bar);

  const cleanWriteBack = makeCleanWriteBack(idoc, writeBack);
  let selected: Element | null = null;

  const targetOf = (e: MouseEvent): Element | null => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el || el === body || el === root || bar.contains(el)) return null;
    return el;
  };

  const place = () => {
    if (!selected) return;
    const r = selected.getBoundingClientRect();
    const win = idoc.defaultView;
    const x = r.left + (win?.scrollX ?? 0);
    const y = r.top + (win?.scrollY ?? 0);
    bar.style.left = `${Math.max(4, x)}px`;
    bar.style.top = `${Math.max(4, y - 34)}px`;
  };

  const deselect = () => {
    selected?.removeAttribute(SEL_ATTR);
    selected = null;
    bar.style.display = "none";
  };

  const select = (el: Element) => {
    deselect();
    selected = el;
    el.setAttribute(SEL_ATTR, "");
    tag.textContent = el.tagName.toLowerCase();
    bar.style.display = "flex";
    place();
  };

  const onMouseMove = (e: MouseEvent) => {
    clearAttr(idoc, HOVER_ATTR);
    if (!e.altKey) return;
    targetOf(e)?.setAttribute(HOVER_ATTR, "");
  };

  const onClick = (e: MouseEvent) => {
    if (e.altKey) {
      const el = targetOf(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      select(el);
      return;
    }
    // A plain click outside the toolbar returns to normal editing.
    if (selected && !bar.contains(e.target as Node)) deselect();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && selected) {
      e.preventDefault();
      deselect();
    }
  };

  del.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selected) return;
    const el = selected;
    deselect();
    el.remove();
    cleanWriteBack();
  });
  dup.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selected) return;
    const copy = selected.cloneNode(true) as Element;
    copy.removeAttribute(SEL_ATTR);
    selected.insertAdjacentElement("afterend", copy);
    cleanWriteBack();
    place();
  });

  idoc.addEventListener("mousemove", onMouseMove, true);
  idoc.addEventListener("click", onClick, true);
  idoc.addEventListener("keydown", onKeyDown, true);
  const win = idoc.defaultView;
  win?.addEventListener("scroll", place, true);

  return () => {
    deselect();
    clearAttr(idoc, HOVER_ATTR);
    idoc.removeEventListener("mousemove", onMouseMove, true);
    idoc.removeEventListener("click", onClick, true);
    idoc.removeEventListener("keydown", onKeyDown, true);
    win?.removeEventListener("scroll", place, true);
    style.remove();
    bar.remove();
  };
}
