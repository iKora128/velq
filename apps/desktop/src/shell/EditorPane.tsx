import { Editor } from "@/editor/Editor";
import { SplitView } from "@/editor/SplitView";
import { openHtmlAndPackage } from "@/export/htmlPackage";
import { DiffBar } from "@/history/DiffBar";
import { DiffView } from "@/history/DiffView";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { useVault } from "@/store/vault";
import { fmtShortcut } from "@/util/platform";
import { ConflictBanner } from "./ConflictBanner";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";

export function EditorPane() {
  const doc = useDoc((s) => s.doc);
  const content = useDoc((s) => s.content);
  const rev = useDoc((s) => s.rev);
  const conflict = useDoc((s) => s.conflict);
  const hasTabs = useDoc((s) => s.tabs.length > 0);
  const mode = useSettings((s) => s.editorMode);
  const diffVersion = useHistory((s) => s.selected);
  const baseContent = useHistory((s) => s.baseContent);

  // HTML benefits from seeing raw + rendered, so it defaults to Split unless the
  // user explicitly picks Source.
  const effective = doc?.language === "html" && mode !== "source" ? "split" : mode;
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
        ) : showDiff ? (
          <DiffView base={baseContent} current={content} language={doc.language} />
        ) : effective === "split" ? (
          <SplitView key={key} doc={doc} content={content} />
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

  return (
    <div className="welcome anim-fade">
      <div className="welcome__mark" aria-hidden />
      <h1 className="welcome__title">Welcome to Velq</h1>
      <p className="welcome__sub">
        A calm place to write Markdown and HTML — and package documents, dependencies and all, into
        a single offline <code>.velq</code> file.
      </p>
      <div className="welcome__actions">
        <button type="button" className="btn btn--primary" onClick={openScratch}>
          New document
        </button>
        <button type="button" className="btn" onClick={openVault}>
          Open a folder
        </button>
        <button type="button" className="btn" onClick={() => void openHtmlAndPackage()}>
          Package an HTML file
        </button>
      </div>
      <div className="welcome__hints">
        <div className="welcome__hint">
          <span className="kbd">{fmtShortcut("Mod+K")}</span> Command palette
        </div>
        <div className="welcome__hint">
          <span className="kbd">{fmtShortcut("Mod+P")}</span> Quick open a file
        </div>
        <div className="welcome__hint">
          <span className="kbd">Space</span> Preview the selected file
        </div>
      </div>
    </div>
  );
}
