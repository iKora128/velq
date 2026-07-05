import { useEffect } from "react";
import { Editor } from "@/editor/Editor";
import { RenderedView } from "@/editor/RenderedView";
import { SplitView } from "@/editor/SplitView";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import { DiffBar } from "@/history/DiffBar";
import { DiffView } from "@/history/DiffView";
import { t as tr } from "@/i18n";
import { useT } from "@/i18n/useT";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";
import { fmtShortcut } from "@/util/platform";
import { ConflictBanner } from "./ConflictBanner";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";
import { VelqView } from "./VelqView";

export function EditorPane() {
  const doc = useDoc((s) => s.doc);
  const content = useDoc((s) => s.content);
  const rev = useDoc((s) => s.rev);
  const conflict = useDoc((s) => s.conflict);
  const hasTabs = useDoc((s) => s.tabs.length > 0);
  const mode = useSettings((s) => s.editorMode);
  const diffVersion = useHistory((s) => s.selected);
  const baseContent = useHistory((s) => s.baseContent);

  // HTML: Live means the rendered page itself is the editor (W6) — what a browser
  // only displays, you edit in place. Split keeps raw + rendered side by side.
  const effective = doc?.language === "html" && mode === "live" ? "rendered" : mode;

  // One-shot, ANY mode: the first time an HTML document is opened, say where the
  // rendered-page editing lives. (Firing only inside the rendered view was a
  // chicken-and-egg: users stuck in Source never learned the way out.)
  const isHtmlDoc = doc?.language === "html";
  useEffect(() => {
    if (!isHtmlDoc) return;
    const s = useSettings.getState();
    if (s.hintedRenderedEdit) return;
    s.update({ hintedRenderedEdit: true });
    useToast.getState().push(tr("hint.renderedEdit"));
  }, [isHtmlDoc]);
  const key = doc ? `${doc.id}:${rev}` : "none";
  const showDiff = doc && diffVersion && baseContent != null;

  return (
    <section className="editor-pane">
      <Toolbar />
      {hasTabs && <TabBar />}
      {conflict && doc?.path && !showDiff && <ConflictBanner path={doc.path} />}
      {showDiff && <DiffBar version={diffVersion} />}
      <div className="editor-body">
        {!doc ? (
          <Welcome />
        ) : doc.language === "velq" && doc.path ? (
          <VelqView key={key} path={doc.path} name={doc.name} origin={doc.origin} />
        ) : showDiff ? (
          <DiffView base={baseContent} current={content} language={doc.language} />
        ) : effective === "split" ? (
          <SplitView key={key} doc={doc} content={content} />
        ) : effective === "rendered" ? (
          <RenderedView key={key} content={content} />
        ) : (
          <Editor key={key} doc={doc} content={content} live={effective === "live"} />
        )}
      </div>
    </section>
  );
}

function Welcome() {
  const openVault = useVault((s) => s.open);
  const openScratch = useDoc((s) => s.openScratch);
  const t = useT();

  return (
    <div className="welcome anim-fade">
      <div className="welcome__mark" aria-hidden />
      <h1 className="welcome__title">{t("welcome.title")}</h1>
      <p className="welcome__sub">
        {t("welcome.subtitlePre")}
        <code>.velq</code>
        {t("welcome.subtitlePost")}
      </p>
      <div className="welcome__actions">
        <button type="button" className="btn btn--primary" onClick={openScratch}>
          {t("welcome.newDoc")}
        </button>
        <button type="button" className="btn" onClick={openVault}>
          {t("welcome.openFolder")}
        </button>
        <button type="button" className="btn" onClick={() => void openHtmlAndPackage()}>
          {t("welcome.packageHtml")}
        </button>
      </div>
      <div className="welcome__hints">
        <div className="welcome__hint">
          <span className="kbd">{fmtShortcut("Mod+K")}</span> {t("welcome.hint.palette")}
        </div>
        <div className="welcome__hint">
          <span className="kbd">{fmtShortcut("Mod+P")}</span> {t("welcome.hint.quickOpen")}
        </div>
        <div className="welcome__hint">
          <span className="kbd">Space</span> {t("welcome.hint.preview")}
        </div>
      </div>
    </div>
  );
}
