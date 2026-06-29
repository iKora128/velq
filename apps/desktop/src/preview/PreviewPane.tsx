import type { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { linkEditorToPreview } from "@/editor/scrollSync";
import { renderMarkdown } from "@/ipc/render";
import { useResolvedDark } from "@/util/theme";
import { buildPreviewDoc, htmlDocument } from "./previewStyles";
import "./preview.css";

interface Props {
  /** Source content. Debounce upstream; this renders whatever it's given. */
  source: string;
  /** Markdown is rendered through comrak/marked; HTML is shown as-is. */
  language: "markdown" | "html";
  /** When provided (markdown only), the editor drives preview scroll. */
  viewRef?: RefObject<EditorView | null>;
}

/**
 * Renders the document into a sandboxed (script-less), isolated iframe — JS never
 * runs in the editor preview (full execution is reserved for the `.velq` viewer, M13).
 * Markdown updates swap `.velq-prose` innerHTML in place (no flicker); HTML rewrites
 * the document (it owns its own <head>/styles).
 */
export function PreviewPane({ source, language, viewRef }: Props) {
  const dark = useResolvedDark();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialized = useRef(false);
  const lastDark = useRef(dark);
  const lastLang = useRef(language);
  const cleanup = useRef<(() => void) | null>(null);
  const seq = useRef(0);

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
      writeDoc(htmlDocument(source), false);
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
  }, [source, language, dark, viewRef]);

  useEffect(() => () => cleanup.current?.(), []);

  return (
    <iframe
      ref={iframeRef}
      className="preview-iframe"
      title="Preview"
      sandbox="allow-same-origin"
    />
  );
}
