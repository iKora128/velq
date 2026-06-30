import { useEffect, useState } from "react";
import { isTauri } from "@/ipc/tauri";
import { importFile } from "@/ipc/vault";
import { describeError } from "@/store/doc";
import { useFiles } from "@/store/files";
import { useToast } from "@/store/toast";
import { useVault } from "@/store/vault";

function baseName(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() ?? p;
}

/** Copy each dropped file into the open vault's root and refresh it. */
async function importDropped(paths: string[]) {
  const vault = useVault.getState().root;
  if (!vault) {
    useToast.getState().push("Open a folder first, then drop files into it.");
    return;
  }
  let added = 0;
  for (const p of paths) {
    try {
      await importFile(p, vault.path);
      added += 1;
    } catch (e) {
      console.error("import failed", p, e);
      useToast.getState().push(`Couldn't add ${baseName(p)}: ${describeError(e)}`);
    }
  }
  if (added > 0) {
    await useFiles.getState().loadDir(vault.path);
    useToast
      .getState()
      .push(
        added === 1 ? `Added 1 item to ${vault.name}` : `Added ${added} items to ${vault.name}`,
      );
  }
}

/** OS file drag-and-drop onto the window → copy the files into the open vault (so a
 * `.velq` from Finder just lands in your Velq folder). Returns whether a drag is
 * currently hovering, so the shell can show a drop hint. */
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
          void importDropped(event.payload.paths);
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
