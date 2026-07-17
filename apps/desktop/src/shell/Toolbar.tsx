import {
  Check,
  Code,
  Columns2,
  Eye,
  History,
  List,
  Palette,
  PanelLeft,
  PenLine,
  Play,
} from "lucide-react";
import { useState } from "react";
import { ContextMenu } from "@/filemanager/ContextMenu";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import type { EditorMode, PreviewTemplate } from "@/ipc/types";
import { containsScript } from "@/preview/scriptRuntime";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { effectiveRunScripts, isEditing, useHtmlRuntime } from "@/store/htmlRuntime";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { cn } from "@/util/cn";
import { fmtShortcut } from "@/util/platform";
import { Breadcrumb } from "./Breadcrumb";

const MODES: { id: EditorMode; label: MsgKey; icon: typeof Code }[] = [
  { id: "source", label: "settings.editor.source", icon: Code },
  { id: "split", label: "settings.editor.split", icon: Columns2 },
  { id: "live", label: "settings.editor.live", icon: Eye },
];

const TEMPLATES: { id: PreviewTemplate; label: MsgKey }[] = [
  { id: "paper", label: "settings.previewTemplate.paper" },
  { id: "docs", label: "settings.previewTemplate.docs" },
  { id: "note", label: "settings.previewTemplate.note" },
  { id: "magazine", label: "settings.previewTemplate.magazine" },
  { id: "tech", label: "settings.previewTemplate.tech" },
  { id: "sky", label: "settings.previewTemplate.sky" },
  { id: "glass", label: "settings.previewTemplate.glass" },
];

export function Toolbar() {
  const t = useT();
  const globalMode = useSettings((s) => s.editorMode);
  const activeId = useDoc((s) => s.activeId);
  const tabMode = useDoc((s) => s.tabs.find((t) => t.doc.id === s.activeId)?.mode);
  const editorMode = tabMode ?? globalMode;
  const previewTemplate = useSettings((s) => s.previewTemplate);
  const update = useSettings((s) => s.update);
  const historyOpen = useHistory((s) => s.open);
  const diffing = useHistory((s) => !!s.selected);
  const hasDoc = useDoc((s) => !!s.doc);
  const isHtml = useDoc((s) => s.doc?.language === "html");
  const isMarkdown = useDoc((s) => s.doc?.language === "markdown");
  const isVelq = useDoc((s) => s.doc?.language === "velq");
  const activeDocId = useDoc((s) => s.doc?.id);
  const content = useDoc((s) => s.content);
  const overrides = useHtmlRuntime((s) => s.overrides);
  const setRunScripts = useHtmlRuntime((s) => s.setRunScripts);
  const editingMap = useHtmlRuntime((s) => s.editing);
  const setEditing = useHtmlRuntime((s) => s.setEditing);
  const [tplMenu, setTplMenu] = useState<{ x: number; y: number } | null>(null);

  // Templates style the rendered-Markdown iframe, which only Split shows
  // (HTML documents carry their own styles).
  const showTemplates = !diffing && isMarkdown && editorMode === "split";

  // A JS-driven HTML page (a deck that fits itself to the window) only renders
  // right with its scripts alive. Offer the toggle when the page has any and a
  // preview is on screen (Source shows raw text — scripts are moot there).
  const showRunScripts = !diffing && isHtml && editorMode !== "source" && containsScript(content);
  const runScripts = effectiveRunScripts(overrides, activeDocId, content);

  // The explicit Edit toggle for the rendered ("見たまま") HTML page: the page is a
  // thing you look at until you press this, then it clearly becomes editable.
  const showEdit = !diffing && isHtml && editorMode === "live";
  const editing = isEditing(editingMap, activeDocId);

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const fileListCollapsed = useUI((s) => s.fileListCollapsed);

  return (
    <div className="editor-toolbar">
      <button
        type="button"
        className={cn("icon-btn", !sidebarCollapsed && "icon-btn--active")}
        title={`${t("common.toggleSidebar")} (${fmtShortcut("Mod+\\")})`}
        aria-label={t("common.toggleSidebar")}
        aria-pressed={!sidebarCollapsed}
        onClick={() => useUI.getState().toggleSidebar()}
      >
        <PanelLeft size={16} />
      </button>
      <button
        type="button"
        className={cn("icon-btn", !fileListCollapsed && "icon-btn--active")}
        title={t("toolbar.toggleFileList")}
        aria-label={t("toolbar.toggleFileList")}
        aria-pressed={!fileListCollapsed}
        onClick={() => useUI.getState().toggleFileList()}
      >
        <List size={16} />
      </button>
      <nav className="crumbs" aria-label={t("toolbar.locationAria")}>
        <Breadcrumb />
      </nav>
      <div className="editor-toolbar__spacer" />
      {showTemplates && (
        <button
          type="button"
          className={cn("icon-btn", tplMenu && "icon-btn--active")}
          title={t("toolbar.previewTemplate")}
          aria-label={t("toolbar.previewTemplate")}
          aria-haspopup="menu"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTplMenu({ x: r.left, y: r.bottom + 4 });
          }}
        >
          <Palette size={16} />
        </button>
      )}
      {showRunScripts && (
        <button
          type="button"
          className={cn("edit-toggle", runScripts && "edit-toggle--on")}
          aria-pressed={runScripts}
          title={t("toolbar.runScripts")}
          onClick={() => activeDocId && setRunScripts(activeDocId, !runScripts)}
        >
          <Play size={14} />
          <span className="toggle-label">
            {runScripts ? t("toolbar.scriptsOn") : t("toolbar.scriptsOff")}
          </span>
        </button>
      )}
      <button
        type="button"
        className={cn("icon-btn", historyOpen && "icon-btn--active")}
        title={t("common.versionHistory")}
        aria-label={t("common.versionHistory")}
        disabled={!hasDoc || isVelq}
        onClick={() => useHistory.getState().toggle()}
      >
        <History size={16} />
      </button>
      {showEdit && (
        <button
          type="button"
          className={cn("edit-toggle", editing && "edit-toggle--on")}
          aria-pressed={editing}
          title={editing ? t("editState.editingHint") : t("editState.editHint")}
          onClick={() => activeDocId && setEditing(activeDocId, !editing)}
        >
          <PenLine size={14} />
          <span className="toggle-label">
            {editing ? t("editState.editing") : t("editState.edit")}
          </span>
        </button>
      )}
      {!diffing && !isVelq && (
        <div className="seg" role="group" aria-label={t("toolbar.viewModeAria")}>
          {MODES.map((m) => {
            const Icon = m.icon;
            // For HTML, Live edits the rendered page itself — label it that way.
            const label = m.id === "live" && isHtml ? "settings.editor.rendered" : m.label;
            return (
              <button
                key={m.id}
                type="button"
                className="seg__item"
                aria-pressed={editorMode === m.id}
                onClick={() => {
                  // A tab with its own view (an OS-opened HTML page) keeps its
                  // override local; other tabs move the global default.
                  if (tabMode && activeId) useDoc.getState().setTabMode(activeId, m.id);
                  else update({ editorMode: m.id });
                }}
              >
                <Icon size={13} />
                {t(label)}
              </button>
            );
          })}
        </div>
      )}
      {tplMenu && (
        <ContextMenu
          x={tplMenu.x}
          y={tplMenu.y}
          entries={TEMPLATES.map((tp) => ({
            label: t(tp.label),
            icon: (
              <Check
                size={14}
                style={{ visibility: tp.id === previewTemplate ? "visible" : "hidden" }}
              />
            ),
            onClick: () => update({ previewTemplate: tp.id }),
          }))}
          onClose={() => setTplMenu(null)}
        />
      )}
    </div>
  );
}
