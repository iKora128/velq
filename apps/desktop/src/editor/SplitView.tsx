import type { EditorView } from "@codemirror/view";
import { useCallback, useRef, useState } from "react";
import { PreviewPane } from "@/preview/PreviewPane";
import { type Doc, useDoc } from "@/store/doc";
import { effectiveRunScripts, useHtmlRuntime } from "@/store/htmlRuntime";
import { useSettings } from "@/store/settings";
import { CodeMirror } from "./CodeMirror";

/** Source on the left, live HTML preview on the right, scroll-synced. */
export function SplitView({ doc, content }: { doc: Doc; content: string }) {
  const reportChange = useDoc((s) => s.reportChange);
  const vimMode = useSettings((s) => s.vimMode);
  const spellcheck = useSettings((s) => s.spellcheck);
  const proseFont = useSettings((s) => s.proseFont);
  const [previewSource, setPreviewSource] = useState(content);
  const viewRef = useRef<EditorView | null>(null);
  const debounce = useRef(0);

  const onChange = useCallback(
    (text: string) => {
      reportChange(text);
      clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => setPreviewSource(text), 150);
    },
    [reportChange],
  );

  // A text tweak made on the rendered preview (W6): push the rewritten source into
  // the uncontrolled editor. Its update listener then runs `onChange`, and the
  // debounced `setPreviewSource` lands on the string the iframe already shows — so
  // PreviewPane's round-trip guard skips the rewrite and the caret stays put.
  const onPreviewEdit = useCallback((next: string) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  }, []);

  const font = doc.language === "html" || !proseFont ? "mono" : "prose";
  const overrides = useHtmlRuntime((s) => s.overrides);
  const runScripts = doc.language === "html" && effectiveRunScripts(overrides, doc.id, content);

  return (
    <div className="split">
      <div className="split__pane split__editor">
        <CodeMirror
          initialDoc={content}
          language={doc.language}
          vimMode={vimMode}
          live={false}
          spellcheck={spellcheck}
          font={font}
          onChange={onChange}
          onReady={(v) => {
            viewRef.current = v;
          }}
        />
      </div>
      <div className="split__pane split__preview">
        <PreviewPane
          source={previewSource}
          // velq tabs never reach SplitView (EditorPane shows the package viewer).
          language={doc.language === "html" ? "html" : "markdown"}
          viewRef={viewRef}
          editable={doc.language === "html"}
          onEdit={onPreviewEdit}
          runScripts={runScripts}
        />
      </div>
    </div>
  );
}
