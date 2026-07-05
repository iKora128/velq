import { Check, Code, Columns2, Eye, History, Palette, PanelLeft } from "lucide-react";
import { useState } from "react";
import { ContextMenu } from "@/filemanager/ContextMenu";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import type { EditorMode, PreviewTemplate } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
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
  const [tplMenu, setTplMenu] = useState<{ x: number; y: number } | null>(null);

  // Templates style the rendered-Markdown iframe, which only Split shows
  // (HTML documents carry their own styles).
  const showTemplates = !diffing && isMarkdown && editorMode === "split";

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);

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
