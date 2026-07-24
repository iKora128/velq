import { PreviewPane } from "@/preview/PreviewPane";
import { effectiveRunScripts, useHtmlRuntime } from "@/store/htmlRuntime";

/** A standalone, read-only preview with the template skin applied — full-width, no
 * editor. Markdown renders through the chosen template; HTML renders as the page
 * itself. Distinct from Live (which edits in place): this is just the finished look. */
export function PreviewView({
  content,
  docId,
  language,
}: {
  content: string;
  /** Whose run-scripts choice to honor (HTML only). */
  docId?: string;
  language: "markdown" | "html";
}) {
  const overrides = useHtmlRuntime((s) => s.overrides);
  const runScripts = language === "html" && effectiveRunScripts(overrides, docId, content);
  return (
    <div className="rendered-view">
      <PreviewPane source={content} language={language} runScripts={runScripts} />
    </div>
  );
}
