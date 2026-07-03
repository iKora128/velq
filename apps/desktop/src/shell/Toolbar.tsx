import { Code, Columns2, Eye, History } from "lucide-react";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import type { EditorMode } from "@/ipc/types";
import { useDoc } from "@/store/doc";
import { useHistory } from "@/store/history";
import { useSettings } from "@/store/settings";
import { cn } from "@/util/cn";
import { Breadcrumb } from "./Breadcrumb";

const MODES: { id: EditorMode; label: MsgKey; icon: typeof Code }[] = [
  { id: "source", label: "settings.editor.source", icon: Code },
  { id: "split", label: "settings.editor.split", icon: Columns2 },
  { id: "live", label: "settings.editor.live", icon: Eye },
];

export function Toolbar() {
  const t = useT();
  const editorMode = useSettings((s) => s.editorMode);
  const update = useSettings((s) => s.update);
  const historyOpen = useHistory((s) => s.open);
  const diffing = useHistory((s) => !!s.selected);
  const hasDoc = useDoc((s) => !!s.doc);

  return (
    <div className="editor-toolbar">
      <nav className="crumbs" aria-label={t("toolbar.locationAria")}>
        <Breadcrumb />
      </nav>
      <div className="editor-toolbar__spacer" />
      <button
        type="button"
        className={cn("icon-btn", historyOpen && "icon-btn--active")}
        title={t("common.versionHistory")}
        aria-label={t("common.versionHistory")}
        disabled={!hasDoc}
        onClick={() => useHistory.getState().toggle()}
      >
        <History size={16} />
      </button>
      {!diffing && (
        <div className="seg" role="group" aria-label={t("toolbar.viewModeAria")}>
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                className="seg__item"
                aria-pressed={editorMode === m.id}
                onClick={() => update({ editorMode: m.id })}
              >
                <Icon size={13} />
                {t(m.label)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
