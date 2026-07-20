import type { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { linkEditorToPreview } from "@/editor/scrollSync";
import { useT } from "@/i18n/useT";
import { renderMarkdown } from "@/ipc/render";
import { useSettings } from "@/store/settings";
import { isMac } from "@/util/platform";
import { useResolvedDark } from "@/util/theme";
import { attachElementSelect } from "./elementSelect";
import { forwardAppShortcuts } from "./forwardShortcuts";
import { extractBodyTextRuns, rebuildHtml, replaceBodyHtml } from "./htmlTextMap";
import { rewriteLocalImages } from "./localAssets";
import { enrichOgpCards } from "./ogpCards";
import { buildPreviewDoc, htmlDocument } from "./previewStyles";
import { collectScriptNodes, serializeBodyInnerClean } from "./scriptRuntime";
import "./preview.css";

interface Props {
  /** Source content. Debounce upstream; this renders whatever it's given. */
  source: string;
  /** Markdown is rendered through comrak/marked; HTML is shown as-is. */
  language: "markdown" | "html";
  /** When provided (markdown only), the editor drives preview scroll. */
  viewRef?: RefObject<EditorView | null>;
  /** HTML only: edit directly on the rendered result — text, structure, ⌘B/I/U (W6). */
  editable?: boolean;
  /** Called with the rewritten source after an in-preview edit. */
  onEdit?: (nextSource: string) => void;
  /** HTML only: run the page's own scripts so a JS-driven layout (a deck that
   * fits its slides to the window, a self-building widget) renders correctly.
   * Runtime-generated nodes are kept out of every write-back (`scriptRuntime`). */
  runScripts?: boolean;
  /** The document's path (markdown only) — resolves relative local image `src`. */
  docPath?: string;
}

/** The iframe's visible text nodes, in document order, minus script/style bodies —
 * the live counterpart to `extractBodyTextRuns` on the source. */
function collectEditableTextNodes(root: HTMLElement): Text[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName.toLowerCase();
      return tag === "script" || tag === "style"
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
}

/**
 * Make the iframe body a real editing surface (W6). On each `input`:
 *   - if the live text-node count still matches the source's runs, the edit was
 *     text-only → write it back at exact offsets (untouched bytes stay identical);
 *   - otherwise the edit was structural (Enter, ⌘B, a deleted element, paste) →
 *     re-serialize the body and splice it over the source's body range; the head
 *     is never touched. Either way the DOM stays authoritative, so a mapping miss
 *     self-heals on the next serialization.
 * ⌘B/I/U format in place; other app shortcuts leave the frame via
 * `forwardAppShortcuts`. Returns a teardown. No script runs inside the iframe.
 */
function attachEditable(
  iframe: HTMLIFrameElement,
  liveSource: { current: string },
  onEditRef: { current: ((s: string) => void) | undefined },
  scriptNodes?: Set<Node>,
): () => void {
  const idoc = iframe.contentDocument;
  const body = idoc?.body;
  if (!idoc || !body) return () => {};
  body.contentEditable = "true";
  body.spellcheck = useSettings.getState().spellcheck;

  // IME (Japanese and friends): don't write half-composed text back to the
  // source — hold until compositionend commits it.
  let composing = false;

  const writeBack = () => {
    if (composing) return;
    const runs = extractBodyTextRuns(liveSource.current);
    const nodes = collectEditableTextNodes(body);
    let next: string | null;
    if (nodes.length === runs.length) {
      try {
        next = rebuildHtml(
          liveSource.current,
          runs,
          nodes.map((n) => n.textContent ?? ""),
        );
      } catch {
        next = null;
      }
    } else {
      // Structural edit → re-serialize the body. With scripts running, strip the
      // nodes they generated first so runtime-only DOM never lands in the file.
      const inner = scriptNodes
        ? serializeBodyInnerClean(body, scriptNodes)
        : body.innerHTML.replaceAll(' data-velq-hover=""', "").replaceAll(' data-velq-sel=""', "");
      next = replaceBodyHtml(liveSource.current, inner);
    }
    if (next == null || next === liveSource.current) return;
    liveSource.current = next;
    onEditRef.current?.(next);
  };

  const onCompositionStart = () => {
    composing = true;
  };
  const onCompositionEnd = () => {
    composing = false;
    writeBack();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "b" || k === "i" || k === "u") {
      e.preventDefault();
      idoc.execCommand(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
      // The DOM mutates synchronously; write back now rather than trusting the
      // engine to fire `input` for execCommand (a later duplicate is a no-op).
      writeBack();
    }
  };

  body.addEventListener("input", writeBack);
  body.addEventListener("compositionstart", onCompositionStart);
  body.addEventListener("compositionend", onCompositionEnd);
  idoc.addEventListener("keydown", onKeyDown, true);
  const detachElementSelect = attachElementSelect(iframe, writeBack);
  return () => {
    detachElementSelect();
    body.removeEventListener("input", writeBack);
    body.removeEventListener("compositionstart", onCompositionStart);
    body.removeEventListener("compositionend", onCompositionEnd);
    idoc.removeEventListener("keydown", onKeyDown, true);
    try {
      body.contentEditable = "false";
    } catch {
      /* iframe already torn down */
    }
  };
}

/**
 * Renders the document into a sandboxed (script-less), isolated iframe — JS never
 * runs in the editor preview (full execution is reserved for the `.velq` viewer, M13).
 * Markdown updates swap `.velq-prose` innerHTML in place (no flicker); HTML rewrites
 * the document (it owns its own <head>/styles). With `editable` (HTML only) the page
 * itself becomes the editor — text, structure, ⌘B/I/U — and every edit flows back
 * to source (W6).
 */
export function PreviewPane({
  source,
  language,
  viewRef,
  editable = false,
  onEdit,
  runScripts = false,
  docPath,
}: Props) {
  const t = useT();
  const dark = useResolvedDark();
  const template = useSettings((s) => s.previewTemplate);
  // Scripts run only for HTML. `allow-scripts` alongside `allow-same-origin` lets
  // the page's JS reach the parent — acceptable for the user's own local files
  // (the same trust any editor extends to a file it opens), and gated behind the
  // per-doc toggle. The iframe is keyed on `sandbox` so flipping it remounts a
  // fresh browsing context (sandbox flags are fixed at context creation).
  const scriptsOn = language === "html" && runScripts;
  const sandbox = scriptsOn ? "allow-same-origin allow-scripts" : "allow-same-origin";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialized = useRef(false);
  const lastSandbox = useRef(sandbox);
  const lastDark = useRef(dark);
  const lastLang = useRef(language);
  const lastTemplate = useRef(template);
  const cleanup = useRef<(() => void) | null>(null);
  // Torn down/re-attached on every document write; kept apart from `cleanup` so it
  // survives the editable path's cleanup composition.
  const fwdCleanup = useRef<(() => void) | null>(null);
  const seq = useRef(0);
  // The source the iframe currently reflects; edits build on it, and it re-syncs to
  // `source` whenever an external (left-pane) change rewrites the frame.
  const liveSource = useRef(source);
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const my = ++seq.current;

    // A sandbox flip remounts the iframe (keyed below) → its document is fresh, so
    // force a full write instead of an in-place update against the old contents.
    if (lastSandbox.current !== sandbox) {
      initialized.current = false;
      lastSandbox.current = sandbox;
    }

    const writeDoc = (full: string, attachSync: boolean) => {
      const idoc = iframe.contentDocument;
      if (!idoc) return;
      idoc.open();
      idoc.write(full);
      idoc.close();
      initialized.current = true;
      lastDark.current = dark;
      lastLang.current = language;
      lastTemplate.current = template;
      // Fresh document → fresh listeners: keep app/tab shortcuts alive while focus
      // is inside the frame (⌘K, ⌘⌥←/→, ⌘1–9, …).
      fwdCleanup.current?.();
      fwdCleanup.current = forwardAppShortcuts(idoc);
      cleanup.current?.();
      cleanup.current = null;
      const view = viewRef?.current;
      if (attachSync && view) {
        requestAnimationFrame(() => {
          if (iframeRef.current) cleanup.current = linkEditorToPreview(view, iframeRef.current);
        });
      }
    };

    if (language === "html") {
      // A preview edit already round-tripped into this exact source — the iframe
      // shows it, so skip the rewrite that would jump the reader's caret. The DOM
      // check covers StrictMode's simulated unmount, whose teardown turned
      // contenteditable off: fall through and re-attach instead of returning.
      if (
        editable &&
        initialized.current &&
        source === liveSource.current &&
        iframe.contentDocument?.body?.isContentEditable
      )
        return;
      writeDoc(htmlDocument(source), false);
      // A full document needs a locatable <body> for the write-back range; a
      // fragment (no <html>) is its own body, so it's always editable.
      const canEdit = /<html[\s>]/i.test(source) ? /<body[\s>]/i.test(source) : true;
      if (editable && canEdit) {
        liveSource.current = source;
        // With scripts on, snapshot what they generated so structural write-backs
        // can strip it. Synchronous scripts (the deck's `fit()` + nav dots) are in
        // by now; a deferred pass catches DOMContentLoaded/onload/rAF additions,
        // still before any user edit so the diff stays clean.
        const lbody = iframe.contentDocument?.body;
        const scriptNodes = scriptsOn && lbody ? collectScriptNodes(lbody, source) : undefined;
        const teardown = attachEditable(iframe, liveSource, onEditRef, scriptNodes);
        if (scriptNodes && lbody) {
          requestAnimationFrame(() => {
            if (my !== seq.current) return;
            for (const n of collectScriptNodes(lbody, source)) scriptNodes.add(n);
          });
        }
        const prev = cleanup.current;
        cleanup.current = () => {
          prev?.();
          teardown();
        };
      }
      return;
    }

    renderMarkdown(source)
      .then(enrichOgpCards) // bare-URL paragraphs → rich OGP link cards
      .then((html) => rewriteLocalImages(html, docPath)) // relative local images → asset URLs
      .then((bodyHtml) => {
        if (my !== seq.current) return; // out-of-order render — drop
        const idoc = iframe.contentDocument;
        if (!idoc) return;
        const needsFullWrite =
          !initialized.current ||
          lastDark.current !== dark ||
          lastLang.current !== language ||
          lastTemplate.current !== template;
        if (needsFullWrite) {
          writeDoc(buildPreviewDoc(bodyHtml, { dark, template }), true);
        } else {
          const prose = idoc.querySelector(".velq-prose");
          if (prose) prose.innerHTML = bodyHtml;
        }
      })
      .catch((e) => console.error("preview render failed", e));
  }, [source, language, dark, template, viewRef, editable, sandbox, scriptsOn, docPath]);

  useEffect(
    () => () => {
      cleanup.current?.();
      fwdCleanup.current?.();
    },
    [],
  );

  return (
    <iframe
      key={sandbox}
      ref={iframeRef}
      className="preview-iframe"
      title={t("preview.frameTitle")}
      sandbox={sandbox}
    />
  );
}
