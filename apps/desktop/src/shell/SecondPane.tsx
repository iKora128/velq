import { X } from "lucide-react";
import { useMemo } from "react";
import { CodeMirror } from "@/editor/CodeMirror";
import { imagePasteExtension } from "@/editor/imagePaste";
import { linkCompleteExtension } from "@/editor/linkComplete";
import { RenderedView } from "@/editor/RenderedView";
import { useT } from "@/i18n/useT";
import { PreviewPane } from "@/preview/PreviewPane";
import { useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { VelqView } from "./VelqView";

/** W3 — the right-hand pane of a split: a full editor for one more open tab.
 * Edits flow through `reportChangeFor`, so dirty state, autosave and history
 * treat it exactly like the primary pane. */
export function SecondPane() {
  const t = useT();
  const tab = useDoc((s) => s.tabs.find((x) => x.doc.id === s.secondaryId));
  const isActiveToo = useDoc((s) => s.secondaryId != null && s.secondaryId === s.activeId);
  const setSecondary = useDoc((s) => s.setSecondary);
  const reportChangeFor = useDoc((s) => s.reportChangeFor);
  const globalMode = useSettings((s) => s.editorMode);
  const vimMode = useSettings((s) => s.vimMode);
  const spellcheck = useSettings((s) => s.spellcheck);
  const proseFont = useSettings((s) => s.proseFont);

  const doc = tab?.doc;
  const extraExt = useMemo(
    () =>
      doc?.language === "markdown"
        ? [imagePasteExtension(() => doc.path), linkCompleteExtension(() => doc.path)]
        : undefined,
    [doc?.language, doc?.path],
  );

  if (!tab || !doc) return null;

  const mode = tab.mode ?? globalMode;
  const effective = doc.language === "html" && mode === "live" ? "rendered" : mode;
  const font = doc.language === "html" || !proseFont ? "mono" : "prose";
  const key = `${doc.id}:${tab.rev}`;

  return (
    <aside className="second-pane">
      <div className="second-pane__bar">
        <span className="second-pane__name">{doc.name}</span>
        {isActiveToo && <span className="second-pane__badge">{t("split.previewBadge")}</span>}
        <button
          type="button"
          className="icon-btn"
          aria-label={t("split.closeAria")}
          title={t("split.closeAria")}
          onClick={() => setSecondary(null)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="second-pane__body">
        {/* The same tab on both sides would mean two uncontrolled editors on one
            buffer — divergence, then data loss. Same-tab split is therefore a
            LIVE PREVIEW: edit left, watch the rendered result track you here. */}
        {isActiveToo && doc.language !== "velq" ? (
          <PreviewPane
            source={tab.content}
            language={doc.language === "html" ? "html" : "markdown"}
          />
        ) : doc.language === "velq" && doc.path ? (
          <VelqView key={key} path={doc.path} name={doc.name} />
        ) : effective === "rendered" ? (
          <RenderedView
            key={key}
            content={tab.content}
            onEdit={(text) => reportChangeFor(doc.id, text)}
          />
        ) : (
          <CodeMirror
            key={key}
            initialDoc={tab.content}
            language={doc.language}
            vimMode={vimMode}
            live={effective === "live"}
            spellcheck={spellcheck}
            font={font}
            extraExt={extraExt}
            onChange={(text) => reportChangeFor(doc.id, text)}
          />
        )}
      </div>
    </aside>
  );
}
