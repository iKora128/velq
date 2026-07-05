import { PreviewPane } from "@/preview/PreviewPane";
import { useDoc } from "@/store/doc";

/** Full-pane rendered editing for HTML (W6): the page itself is the editor — what a
 * browser only displays, you edit in place. Text edits write back at exact source
 * offsets; structural ones (Enter, ⌘B, deletions, paste) re-serialize the body.
 * Source and Split stay one toggle away in the toolbar. (The one-shot "this is
 * editable" hint lives in EditorPane, so it reaches users in ANY mode.) */
export function RenderedView({ content }: { content: string }) {
  const reportChange = useDoc((s) => s.reportChange);
  return (
    <div className="rendered-view">
      <PreviewPane source={content} language="html" editable onEdit={reportChange} />
    </div>
  );
}
