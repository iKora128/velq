import type { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { linkEditorToPreview } from "@/editor/scrollSync";
import { useT } from "@/i18n/useT";
import { renderMarkdown } from "@/ipc/render";
import { useResolvedDark } from "@/util/theme";
import { extractBodyTextRuns, rebuildHtml } from "./htmlTextMap";
import { buildPreviewDoc, htmlDocument } from "./previewStyles";
import "./preview.css";

interface Props {
  /** Source content. Debounce upstream; this renders whatever it's given. */
  source: string;
  /** Markdown is rendered through comrak/marked; HTML is shown as-is. */
  language: "markdown" | "html";
  /** When provided (markdown only), the editor drives preview scroll. */
  viewRef?: RefObject<EditorView | null>;
  /** HTML only: let the reader tweak text directly on the rendered result (W6). */
  editable?: boolean;
  /** Called with the rewritten source after an in-preview text edit. */
  onEdit?: (nextSource: string) => void;
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
 * Make the iframe body editable and, on each text edit, write the change back to the
 * source at the right offsets (W6). If the live text-node count no longer matches the
 * source's runs, the edit was structural (a node added/removed) — we leave the source
 * alone rather than guess, so "tweak the wording" stays safe and structure edits go
 * through the code pane. Returns a teardown. No script runs inside the iframe.
 */
function attachEditable(
  iframe: HTMLIFrameElement,
  liveSource: { current: string },
  onEditRef: { current: ((s: string) => void) | undefined },
): () => void {
  const body = iframe.contentDocument?.body;
  if (!body) return () => {};
  body.contentEditable = "true";
  body.spellcheck = false;

  const onInput = () => {
    const runs = extractBodyTextRuns(liveSource.current);
    const nodes = collectEditableTextNodes(body);
    if (nodes.length !== runs.length) return; // structural edit — don't write back
    const newTexts = nodes.map((n) => n.textContent ?? "");
    let next: string;
    try {
      next = rebuildHtml(liveSource.current, runs, newTexts);
    } catch {
      return;
    }
    if (next === liveSource.current) return;
    liveSource.current = next;
    onEditRef.current?.(next);
  };

  body.addEventListener("input", onInput);
  return () => {
    body.removeEventListener("input", onInput);
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
 * the document (it owns its own <head>/styles). With `editable` (HTML only) the reader
 * can tweak text right on the rendered result and it flows back to source (W6).
 */
export function PreviewPane({ source, language, viewRef, editable = false, onEdit }: Props) {
  const t = useT();
  const dark = useResolvedDark();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialized = useRef(false);
  const lastDark = useRef(dark);
  const lastLang = useRef(language);
  const cleanup = useRef<(() => void) | null>(null);
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

    const writeDoc = (full: string, attachSync: boolean) => {
      const idoc = iframe.contentDocument;
      if (!idoc) return;
      idoc.open();
      idoc.write(full);
      idoc.close();
      initialized.current = true;
      lastDark.current = dark;
      lastLang.current = language;
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
      // shows it, so skip the rewrite that would jump the reader's caret.
      if (editable && initialized.current && source === liveSource.current) return;
      writeDoc(htmlDocument(source), false);
      // Editing works on the body; a full <html> doc keeps head/title out of the map.
      if (editable && /<body[\s>]/i.test(source)) {
        liveSource.current = source;
        const teardown = attachEditable(iframe, liveSource, onEditRef);
        const prev = cleanup.current;
        cleanup.current = () => {
          prev?.();
          teardown();
        };
      }
      return;
    }

    renderMarkdown(source)
      .then((bodyHtml) => {
        if (my !== seq.current) return; // out-of-order render — drop
        const idoc = iframe.contentDocument;
        if (!idoc) return;
        const needsFullWrite =
          !initialized.current || lastDark.current !== dark || lastLang.current !== language;
        if (needsFullWrite) {
          writeDoc(buildPreviewDoc(bodyHtml, { dark }), true);
        } else {
          const prose = idoc.querySelector(".velq-prose");
          if (prose) prose.innerHTML = bodyHtml;
        }
      })
      .catch((e) => console.error("preview render failed", e));
  }, [source, language, dark, viewRef, editable]);

  useEffect(() => () => cleanup.current?.(), []);

  return (
    <iframe
      ref={iframeRef}
      className="preview-iframe"
      title={t("preview.frameTitle")}
      sandbox="allow-same-origin"
    />
  );
}
