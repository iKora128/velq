import { useEffect } from "react";
import { Editor } from "@/editor/Editor";
import { PdfView } from "@/editor/PdfView";
import { RenderedView } from "@/editor/RenderedView";
import { SplitView } from "@/editor/SplitView";
import { canConvertToVelq } from "@/export/convert";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import { DiffBar } from "@/history/DiffBar";
import { DiffView } from "@/history/DiffView";
import { t as tr } from "@/i18n";
import { useT } from "@/i18n/useT";
import { containsScript } from "@/preview/scriptRuntime";
import { useConvertBanner } from "@/store/convertBanner";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { effectiveRunScripts, isScriptPromptDismissed, useHtmlRuntime } from "@/store/htmlRuntime";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";
import { fmtShortcut } from "@/util/platform";
import { ConflictBanner } from "./ConflictBanner";
import { ConvertBanner } from "./ConvertBanner";
import { ScriptBanner } from "./ScriptBanner";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";

export function EditorPane() {
  const doc = useDoc((s) => s.doc);
  const content = useDoc((s) => s.content);
  const rev = useDoc((s) => s.rev);
  const conflict = useDoc((s) => s.conflict);
  const hasTabs = useDoc((s) => s.tabs.length > 0);
  const globalMode = useSettings((s) => s.editorMode);
  const tabMode = useDoc((s) => s.tabs.find((t) => t.doc.id === s.activeId)?.mode);
  const mode = tabMode ?? globalMode;
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
  // A PDF is view-only: it renders in the built-in viewer, skipping the editor,
  // diff, and the convert/script banners entirely.
  const isPdf = doc?.viewer === "pdf";
  const showDiff = doc && !isPdf && diffVersion && baseContent != null;

  // A plain Markdown/HTML file (not one already inside a .velq) may be offered a
  // one-click "make a .velq copy" — dismissible, and NEVER automatic.
  const bannerDismissed = useConvertBanner((s) => (doc ? s.dismissed.has(doc.id) : false));
  const showConvertBanner =
    doc != null &&
    doc.path != null &&
    !doc.velqSource &&
    !showDiff &&
    !bannerDismissed &&
    canConvertToVelq(doc.name);

  // A page that paints itself in JavaScript is blank until its scripts run — but we
  // never run them automatically (an external page's JS could be hostile). Offer an
  // explicit "run to display" when the doc is HTML, carries a <script>, isn't already
  // running, and the offer wasn't dismissed.
  const overrides = useHtmlRuntime((s) => s.overrides);
  const scriptPromptDismissed = useHtmlRuntime((s) =>
    isScriptPromptDismissed(s.promptDismissed, doc?.id),
  );
  const showScriptBanner =
    doc != null &&
    doc.language === "html" &&
    !showDiff &&
    containsScript(content) &&
    !effectiveRunScripts(overrides, doc.id, content) &&
    !scriptPromptDismissed;

  return (
    <section className="editor-pane">
      <Toolbar />
      {hasTabs && <TabBar />}
      {conflict && doc?.path && !showDiff && <ConflictBanner path={doc.path} />}
      {showConvertBanner && doc?.path && <ConvertBanner docId={doc.id} path={doc.path} />}
      {showScriptBanner && doc && <ScriptBanner docId={doc.id} velqSource={doc.velqSource} />}
      {showDiff && <DiffBar version={diffVersion} />}
      <div className="editor-body">
        {!doc ? (
          <Welcome />
        ) : isPdf && doc.path ? (
          <PdfView key={key} path={doc.path} name={doc.name} />
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
        <button type="button" className="btn btn--primary" onClick={() => openScratch()}>
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
