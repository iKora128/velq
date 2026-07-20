import { FileCode, FilePlus, FileText } from "lucide-react";
import { useState } from "react";
import { newDocument } from "@/command/actions";
import { ContextMenu } from "@/filemanager/ContextMenu";
import { useT } from "@/i18n/useT";
import { useFiles } from "@/store/files";

/** The "+" that starts a new document: a small menu to pick **Markdown** or **HTML**.
 * A new doc is always a plain file whose format you choose here (`.velq` is only for
 * explicit sharing). When `dir` is given the file lands there; otherwise it follows
 * the current selection (and falls back to an in-memory scratch with no folder open). */
export function NewDocButton({ dir, size = 16 }: { dir?: string; size?: number }) {
  const t = useT();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const make = (format: "md" | "html") => {
    if (dir) void useFiles.getState().newFile(dir, format);
    else newDocument(format);
  };

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        title={t("common.newDoc")}
        aria-label={t("common.newDoc")}
        aria-haspopup="menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.left, y: r.bottom + 4 });
        }}
      >
        <FilePlus size={size} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          entries={[
            {
              label: t("action.newDoc"),
              icon: <FileText size={14} />,
              onClick: () => make("md"),
            },
            {
              label: t("action.newDocHtml"),
              icon: <FileCode size={14} />,
              onClick: () => make("html"),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
