import { unifiedMergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { type Lang, langExtension } from "@/editor/extensions";
import { velqEditorTheme, velqSyntax } from "@/editor/theme";
import { mergeDiffTheme } from "./diffTheme";

/** Read-only unified diff: the current document with changes since `base` (the
 * selected version) highlighted. Rendered with @codemirror/merge (plan §10). */
export function DiffView({
  base,
  current,
  language,
}: {
  base: string;
  current: string;
  language: Lang;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const state = EditorState.create({
      doc: current,
      extensions: [
        unifiedMergeView({ original: base, mergeControls: false, gutter: false }),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
        langExtension(language),
        velqSyntax,
        velqEditorTheme,
        mergeDiffTheme,
      ],
    });
    const view = new EditorView({ state, parent });
    return () => view.destroy();
  }, [base, current, language]);

  return <div ref={host} className="cm-host diff-view" style={{ height: "100%" }} />;
}
