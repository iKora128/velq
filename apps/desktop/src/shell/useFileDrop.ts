import { useEffect, useState } from "react";
import { editorBus } from "@/editor/editorBus";
import { convertDroppedToVelq, convertible, importRawIntoVault } from "@/export/dropActions";
import { t } from "@/i18n";
import { isTauri } from "@/ipc/tauri";
import { importFile } from "@/ipc/vault";
import { useConvertPrompt } from "@/store/convertPrompt";
import { describeError, useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { useToast } from "@/store/toast";

function baseName(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() ?? p;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

/** Images dropped ON the editor while a Markdown doc is open: copy into
 * `attachments/` beside the doc and insert links at the caret (W1). */
async function importImagesIntoDoc(paths: string[]): Promise<boolean> {
  const doc = useDoc.getState().doc;
  if (!doc?.path || doc.language !== "markdown" || doc.viewer) return false;
  if (!paths.every((p) => IMAGE_EXT.test(p))) return false;
  const destDir = `${dirOf(doc.path)}/attachments`;
  let ok = 0;
  for (const p of paths) {
    try {
      const node = await importFile(p, destDir);
      editorBus.insertAtCursor(`![](attachments/${node.name})`);
      ok += 1;
    } catch (e) {
      console.error("image import failed", p, e);
      useToast.getState().push(t("toast.cantAdd", { name: baseName(p), error: describeError(e) }));
    }
  }
  return ok > 0;
}

/** Handle an OS drop. Markdown/HTML files are OFFERED as a `.velq` (a copy into
 * Documents/Velq — the original is never touched): if the user opted into "always",
 * we convert straight away, otherwise a modal asks. Everything else — a `.velq` from
 * Finder, notes, images — is copied into the open vault as-is. Converting NEVER
 * happens silently on a plain drop unless the user chose "always". */
async function importDropped(paths: string[], overEditor: boolean) {
  // Images aimed at the editor go into the document, not the vault root.
  if (overEditor && (await importImagesIntoDoc(paths))) return;
  const toConvert = convertible(paths);
  const others = paths.filter((p) => !toConvert.includes(p));

  if (toConvert.length > 0) {
    if (useSettings.getState().autoPackageHtml) await convertDroppedToVelq(toConvert);
    else useConvertPrompt.getState().open(toConvert); // ask first — the modal decides
  }
  await importRawIntoVault(others);
}

/** OS file drag-and-drop onto the window. Markdown/HTML is offered as a `.velq`
 * (asks first, unless "always" is set); anything else — a `.velq` from Finder,
 * notes, images — is copied into the open vault. Returns whether a drag is currently
 * hovering, so the shell can show a drop hint. */
export function useFileDrop(): boolean {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const un = await getCurrentWebview().onDragDropEvent((event) => {
        const t = event.payload.type;
        if (t === "enter" || t === "over") setDragging(true);
        else if (t === "leave") setDragging(false);
        else if (t === "drop") {
          setDragging(false);
          const pos = event.payload.position;
          const scale = window.devicePixelRatio || 1;
          const el = document.elementFromPoint(pos.x / scale, pos.y / scale);
          void importDropped(event.payload.paths, !!el?.closest(".cm-editor"));
        }
      });
      if (cancelled) un();
      else unlisten = un;
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
  return dragging;
}
