import { readFile } from "@/ipc/vault";
import { langFromName, openVelq, useDoc } from "@/store/doc";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";

/** Reopen the previous session's tabs (W5) — called once after the vault opens
 * on a plain launch. Files that vanished since are skipped without noise. */
export async function restoreSession(): Promise<boolean> {
  const s = useSettings.getState();
  if (!s.sessionTabs.length) return false;
  for (const st of s.sessionTabs) {
    const name = st.path.split(/[/\\]/).pop() ?? st.path;
    const language = langFromName(name);
    try {
      if (language === "velq") {
        await openVelq(st.path, { preview: st.preview });
      } else {
        const fc = await readFile(st.path);
        useDoc.getState().open({ id: st.path, path: st.path, name, language }, fc.content, {
          preview: st.preview,
          pinned: st.pinned,
          mode: st.mode ?? undefined,
        });
      }
    } catch {
      /* moved or deleted since last session — skip */
    }
  }
  const { tabs } = useDoc.getState();
  if (!tabs.length) return false;
  if (s.sessionActive && tabs.some((t) => t.doc.id === s.sessionActive)) {
    useDoc.getState().activate(s.sessionActive);
  }
  if (s.sessionSecondary && tabs.some((t) => t.doc.id === s.sessionSecondary)) {
    useDoc.getState().setSecondary(s.sessionSecondary);
  }
  useUI.getState().setView("editor");
  return true;
}

let persistTimer = 0;

/** Keep the session snapshot in settings fresh (debounced) — cheap enough to
 * run on every tabs/active change; only real files are recorded. */
export function startSessionPersist(): () => void {
  return useDoc.subscribe((s, prev) => {
    if (s.tabs === prev.tabs && s.activeId === prev.activeId && s.secondaryId === prev.secondaryId)
      return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      const { tabs, activeId, secondaryId } = useDoc.getState();
      useSettings.getState().update({
        sessionTabs: tabs
          .filter((t) => t.doc.path)
          .map((t) => ({
            path: t.doc.path as string,
            preview: t.preview,
            pinned: t.pinned,
            mode: t.mode ?? null,
          })),
        sessionActive: activeId,
        sessionSecondary: secondaryId,
      });
    }, 600);
  });
}
