import { useMemo } from "react";
import { usePlugins } from "@/plugins/runtime";
import { type Doc, useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { CodeMirror } from "./CodeMirror";
import { imagePasteExtension } from "./imagePaste";
import { linkCompleteExtension } from "./linkComplete";
import "./editor.css";

/** Single-pane editor. `live` turns on inline WYSIWYG decorations (markdown only).
 * Switching documents remounts via the `key` in EditorPane; `content` is the active
 * tab's live text, so reopening a tab restores its edits. */
export function Editor({
  doc,
  content,
  live = false,
}: {
  doc: Doc;
  content: string;
  live?: boolean;
}) {
  const reportChange = useDoc((s) => s.reportChange);
  const vimMode = useSettings((s) => s.vimMode);
  const spellcheck = useSettings((s) => s.spellcheck);
  const proseFont = useSettings((s) => s.proseFont);
  const pluginExt = usePlugins((s) => s.extensions);

  const font = doc.language === "html" || !proseFont ? "mono" : "prose";

  // Markdown niceties: paste an image → attachments/ + link (W1); type [[ →
  // internal-link completion (W2). Bound to THIS doc, not the active one.
  const extraExt = useMemo(
    () =>
      doc.language === "markdown"
        ? [imagePasteExtension(() => doc.path), linkCompleteExtension(() => doc.path)]
        : undefined,
    [doc.language, doc.path],
  );

  return (
    <CodeMirror
      initialDoc={content}
      language={doc.language}
      vimMode={vimMode}
      live={live}
      spellcheck={spellcheck}
      font={font}
      pluginExt={live ? pluginExt : undefined}
      extraExt={extraExt}
      onChange={reportChange}
    />
  );
}
