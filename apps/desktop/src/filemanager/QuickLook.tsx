import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/useT";
import { renderMarkdown } from "@/ipc/render";
import { readFile } from "@/ipc/vault";
import { buildPreviewDoc, htmlDocument } from "@/preview/previewStyles";
import { langFromName, useDoc } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useSettings } from "@/store/settings";
import { useResolvedDark } from "@/util/theme";
import "./quicklook.css";

function parentOf(p: string): string {
  return p.slice(0, p.lastIndexOf("/"));
}

/** Finder-style Space preview: a floating rendered preview of the selected file.
 * ←/→ step through the folder's files, Enter opens, Space/Esc dismiss. */
export function QuickLook() {
  const t = useT();
  const node = useFiles((s) => s.quickLook);
  const setQuickLook = useFiles((s) => s.setQuickLook);
  const previewsByFolder = useFiles((s) => s.previewsByFolder);
  const openFile = useDoc((s) => s.openFile);
  const dark = useResolvedDark();
  const template = useSettings((s) => s.previewTemplate);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const folder = node ? parentOf(node.path) : null;
  const siblings =
    (folder ? previewsByFolder[folder] : undefined)
      ?.filter((p) => p.node.kind === "file")
      .map((p) => p.node) ?? [];
  const idx = node ? siblings.findIndex((s) => s.path === node.path) : -1;

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    void (async () => {
      const content = (await readFile(node.path)).content;
      const html =
        langFromName(node.name) === "html"
          ? htmlDocument(content)
          : buildPreviewDoc(await renderMarkdown(content), { dark, template });
      if (cancelled) return;
      const idoc = iframeRef.current?.contentDocument;
      if (idoc) {
        idoc.open();
        idoc.write(html);
        idoc.close();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [node, dark, template]);

  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        setQuickLook(null);
      } else if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        setQuickLook(siblings[idx - 1]);
      } else if (e.key === "ArrowRight" && idx < siblings.length - 1) {
        e.preventDefault();
        setQuickLook(siblings[idx + 1]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        void openFile(node, { preview: false });
        setQuickLook(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, idx, siblings, setQuickLook, openFile]);

  if (!node) return null;

  return createPortal(
    <div
      className="ql-backdrop anim-fade"
      onClick={() => setQuickLook(null)}
      onKeyDown={() => {}}
      role="presentation"
    >
      <div
        className="ql-panel anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={node.name}
      >
        <div className="ql-head">
          <span className="ql-title">{node.name}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("quicklook.close")}
            onClick={() => setQuickLook(null)}
          >
            <X size={16} />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          className="ql-frame"
          title={t("quicklook.frameTitle")}
          sandbox="allow-same-origin"
        />
        <div className="ql-foot">
          <span>{t("quicklook.position", { index: idx + 1, total: siblings.length })}</span>
          <span>{t("quicklook.footer")}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
