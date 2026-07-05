import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { t } from "@/i18n";
import { writeFileBinary } from "@/ipc/vault";
import { useFiles } from "@/store/files";
import { useToast } from "@/store/toast";

/** Paste (or DOM-drop) an image into a Markdown document: the bytes land in an
 * `attachments/` folder beside the file, and a `![](attachments/…)` link is
 * inserted at the caret (W1). Files stay plain on disk — the image is a real
 * file any other app can see. */

const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

function stamp(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(
    d.getMinutes(),
  )}${z(d.getSeconds())}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    s += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

const extOf = (mime: string) => (mime.split("/")[1] || "png").replace("jpeg", "jpg").split("+")[0];

async function insertImage(
  view: EditorView,
  blob: Blob,
  getDocPath: () => string | null,
): Promise<void> {
  const docPath = getDocPath();
  if (!docPath) {
    useToast.getState().push(t("toast.imageNeedsSavedDoc"));
    return;
  }
  const dir = dirOf(docPath);
  const rel = `attachments/img-${stamp()}.${extOf(blob.type)}`;
  try {
    await writeFileBinary(`${dir}/${rel}`, await blobToBase64(blob));
    view.dispatch(view.state.replaceSelection(`![](${rel})`));
    view.focus();
    useToast.getState().push(t("toast.imageAdded", { rel }));
    // The tree may be showing this folder — refresh it quietly.
    void useFiles
      .getState()
      .loadDir(dir)
      .catch(() => {});
  } catch (e) {
    console.error("image save failed", e);
    useToast.getState().push(t("toast.cantAdd", { name: rel, error: String(e) }));
  }
}

function firstImage(list: DataTransferItemList | null | undefined): File | null {
  if (!list) return null;
  for (const it of list) {
    if (it.kind === "file" && it.type.startsWith("image/")) return it.getAsFile();
  }
  return null;
}

/** CM extension: intercept pasted/dropped image blobs. `getDocPath` keeps the
 * handler bound to THIS tab's document (the split pane edits a non-active tab). */
export function imagePasteExtension(getDocPath: () => string | null): Extension {
  return EditorView.domEventHandlers({
    paste: (e, view) => {
      const img = firstImage(e.clipboardData?.items);
      if (!img) return false;
      e.preventDefault();
      void insertImage(view, img, getDocPath);
      return true;
    },
    // DOM drops cover in-webview sources (an image dragged from a page). OS file
    // drops are intercepted by the window-level handler before the DOM sees them.
    drop: (e, view) => {
      const img = firstImage(e.dataTransfer?.items);
      if (!img) return false;
      e.preventDefault();
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos != null) view.dispatch({ selection: { anchor: pos } });
      void insertImage(view, img, getDocPath);
      return true;
    },
  });
}
