import { useT } from "@/i18n/useT";
import { PreviewPane } from "@/preview/PreviewPane";
import { useDoc } from "@/store/doc";
import { effectiveRunScripts, isEditing, useHtmlRuntime } from "@/store/htmlRuntime";
import { cn } from "@/util/cn";

/** Full-pane rendered editing for HTML (W6): the page itself is the editor — what a
 * browser only displays, you edit in place. Text edits write back at exact source
 * offsets; structural ones (Enter, ⌘B, deletions, paste) re-serialize the body.
 * Source and Split stay one toggle away in the toolbar. (The one-shot "this is
 * editable" hint lives in EditorPane, so it reaches users in ANY mode.) */
export function RenderedView({
  content,
  onEdit,
  docId,
}: {
  content: string;
  /** Defaults to editing the ACTIVE tab; the split pane passes its own sink. */
  onEdit?: (nextSource: string) => void;
  /** Whose run-scripts choice to honor. Defaults to the active tab; the second
   * pane shows a different doc, so it passes its own id. */
  docId?: string;
}) {
  const t = useT();
  const reportChange = useDoc((s) => s.reportChange);
  const activeId = useDoc((s) => s.doc?.id);
  const id = docId ?? activeId;
  const overrides = useHtmlRuntime((s) => s.overrides);
  const editingMap = useHtmlRuntime((s) => s.editing);
  const runScripts = effectiveRunScripts(overrides, id, content);
  const editing = isEditing(editingMap, id);
  return (
    <div className={cn("rendered-view", editing && "rendered-view--editing")}>
      {editing && <div className="rendered-view__editing-tag">{t("editState.editing")}</div>}
      <PreviewPane
        source={content}
        language="html"
        editable={editing}
        onEdit={onEdit ?? reportChange}
        runScripts={runScripts}
      />
    </div>
  );
}
