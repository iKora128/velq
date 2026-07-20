import { create } from "zustand";
import { resolveLocale, t } from "@/i18n";
import {
  type AgentConfig,
  type AgentInfo,
  type AgentMode,
  type AgentPlanItem,
  type AgentUpdate,
  answerAgentPermission,
  listAgents,
  sendAgentPrompt,
  setAgentConfig,
  setAgentMode,
  startAgentSession,
  stopAgentSession,
  velqAgentExtract,
} from "@/ipc/acp";
import { renderMarkdown } from "@/ipc/render";
import { readFile } from "@/ipc/vault";
import { saveVelqIndex, saveVelqMd } from "@/ipc/velq";
import { useDoc } from "./doc";
import { useSettings } from "./settings";
import { useToast } from "./toast";
import { useVault } from "./vault";

/** One line in the assistant transcript. `id` keeps React stable while chunks stream. */
export type Entry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "agent"; text: string }
  | { id: number; kind: "thought"; text: string }
  | { id: number; kind: "tool"; title: string };

interface PendingPermission {
  id: number;
  title: string;
  diffs: { path: string; oldText: string | null; newText: string }[];
  options: { label: string; kind: string }[];
}

/** An in-flight packaged-doc edit: the agent edits `workingPath`, which we pack back
 *  into `velqPath` (rendering md→html) once its turn ends. */
interface VelqEdit {
  workingPath: string;
  velqPath: string;
  language: string;
  docId: string;
  baseline: string;
}

let entrySeq = 0;

interface AcpState {
  open: boolean;
  agents: AgentInfo[];
  /** A resident session is running for the current folder. */
  sessionActive: boolean;
  /** A prompt→response turn is in flight. */
  running: boolean;
  entries: Entry[];
  plan: AgentPlanItem[];
  modes: AgentMode[];
  currentModeId: string | null;
  configs: AgentConfig[];
  pending: PendingPermission | null;
  velqEdit: VelqEdit | null;
  tokensUsed: number;
  tokensMax: number;
  input: string;

  toggle: () => void;
  show: () => void;
  hide: () => void;
  init: () => Promise<void>;
  setInput: (v: string) => void;
  /** Change the persisted default agent (drops any running session so the next prompt restarts). */
  setDefaultAgent: (label: string) => void;
  send: (text: string) => Promise<void>;
  setMode: (id: string) => void;
  setConfig: (configId: string, valueId: string) => void;
  answer: (index: number) => void;
  stop: () => void;
  /** Repack the .velq the agent just edited (on turn end) and reflect it in the editor. */
  finishVelqEdit: () => Promise<void>;
  /** Reduce one streamed update into the transcript/state. */
  receive: (u: AgentUpdate) => void;
}

/** Append streaming text to the last same-kind entry, or start a new one. */
function appendText(entries: Entry[], kind: "agent" | "thought", text: string): Entry[] {
  const last = entries[entries.length - 1];
  if (last && last.kind === kind) {
    return [...entries.slice(0, -1), { ...last, text: last.text + text }];
  }
  return [...entries, { id: entrySeq++, kind, text }];
}

/**
 * A short context block prepended to each prompt: which file the user is viewing (so the
 * agent edits the right one) plus the UI language to prefer. For a `.velq` — a ZIP whose
 * inner document isn't a plain file — the agent edits the working file we extracted
 * (`velqWorking`); it's packed back into the .velq after the turn.
 */
function editorContext(velqWorking: string | null): string {
  const doc = useDoc.getState().doc;
  const root = useVault.getState().root?.path ?? "";
  const rel = (p: string) => (root && p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p);
  const parts: string[] = [];
  if (doc?.velqSource && velqWorking) {
    parts.push(
      `The document "${doc.name}" is a packaged .velq. Its editable ${doc.language} content is in this working file: \`${rel(velqWorking)}\`. To change the document, edit THAT file — it is packed back into the .velq automatically after your turn. Do not edit the .velq file itself.`,
    );
  } else if (doc?.path) {
    parts.push(
      `The user is currently viewing \`${rel(doc.path)}\` (${doc.language}) in the editor. Unless they say otherwise, make your changes to this file.`,
    );
  }
  const locale = resolveLocale(useSettings.getState().locale);
  parts.push(
    `The user's interface language is ${locale === "ja" ? "Japanese" : "English"}; prefer that language in your replies unless they write in another language.`,
  );
  return `<editor-context>\n${parts.join("\n\n")}\n</editor-context>\n\n`;
}

export const useAcp = create<AcpState>((set, get) => ({
  open: false,
  agents: [],
  sessionActive: false,
  running: false,
  entries: [],
  plan: [],
  modes: [],
  currentModeId: null,
  configs: [],
  pending: null,
  velqEdit: null,
  tokensUsed: 0,
  tokensMax: 0,
  input: "",

  toggle: () => {
    const next = !get().open;
    set({ open: next });
    if (next && get().agents.length === 0) void get().init();
  },
  show: () => {
    set({ open: true });
    if (get().agents.length === 0) void get().init();
  },
  hide: () => set({ open: false }),

  init: async () => {
    try {
      set({ agents: await listAgents() });
    } catch (e) {
      console.error("agent_list_agents failed", e);
    }
  },

  setInput: (v) => set({ input: v }),
  setDefaultAgent: (label) => {
    useSettings.getState().update({ agentLabel: label });
    // A running session keeps its agent; drop it so the next prompt restarts with the new one.
    if (get().sessionActive) get().stop();
  },

  send: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const root = useVault.getState().root?.path;
    if (!root) {
      useToast.getState().push(t("agent.emptyNoVault"));
      return;
    }
    // Lazily (re)start the resident session with the open folder as its working dir.
    if (!get().sessionActive) {
      try {
        const agentLabel = useSettings.getState().agentLabel || "Claude Code";
        await startAgentSession(root, agentLabel);
        set({ sessionActive: true });
      } catch (e) {
        set((s) => ({
          entries: [...s.entries, { id: entrySeq++, kind: "agent", text: `⚠️ ${String(e)}` }],
        }));
        return;
      }
    }
    // For a packaged .velq, hand the agent a plain working file it can edit (it can't
    // read the inner document out of the ZIP); it's repacked into the .velq on turn end.
    let velqWorking: string | null = null;
    const doc = useDoc.getState().doc;
    if (doc?.velqSource) {
      try {
        const content = useDoc.getState().content;
        velqWorking = await velqAgentExtract(doc.velqSource, content, doc.language);
        set({
          velqEdit: {
            workingPath: velqWorking,
            velqPath: doc.velqSource,
            language: doc.language,
            docId: doc.id,
            baseline: content,
          },
        });
      } catch (e) {
        console.error("velq extract failed", e);
        set({ velqEdit: null });
      }
    } else {
      set({ velqEdit: null });
    }
    set((s) => ({
      entries: [...s.entries, { id: entrySeq++, kind: "user", text: trimmed }],
      input: "",
      running: true,
    }));
    try {
      await sendAgentPrompt(editorContext(velqWorking) + trimmed);
    } catch (e) {
      set((s) => ({
        entries: [...s.entries, { id: entrySeq++, kind: "agent", text: `⚠️ ${String(e)}` }],
        running: false,
      }));
    }
  },

  setMode: (id) => {
    set({ currentModeId: id });
    void setAgentMode(id).catch((e) => console.error("agent_set_mode failed", e));
  },
  setConfig: (configId, valueId) => {
    void setAgentConfig(configId, valueId).catch((e) =>
      console.error("agent_set_config failed", e),
    );
  },

  answer: (index) => {
    const pending = get().pending;
    if (!pending) return;
    set({ pending: null });
    void answerAgentPermission(pending.id, index).catch((e) =>
      console.error("agent_answer_permission failed", e),
    );
  },

  stop: () => {
    void stopAgentSession().catch(() => {});
    set({ sessionActive: false, running: false, pending: null, velqEdit: null });
  },

  finishVelqEdit: async () => {
    const edit = get().velqEdit;
    if (!edit) return;
    set({ velqEdit: null });
    try {
      const next = (await readFile(edit.workingPath)).content;
      if (next === edit.baseline) return; // the agent didn't change the content
      if (edit.language === "markdown") {
        await saveVelqMd(edit.velqPath, next, await renderMarkdown(next));
      } else {
        await saveVelqIndex(edit.velqPath, next);
      }
      // reloadTab re-reads the .velq's inner content and remounts the editor.
      await useDoc.getState().reloadTab(edit.velqPath);
    } catch (e) {
      console.error("velq repack failed", e);
    }
  },

  receive: (u) => {
    switch (u.kind) {
      case "agentChunk":
        return set((s) => ({ entries: appendText(s.entries, "agent", u.text) }));
      case "thoughtChunk":
        return set((s) => ({ entries: appendText(s.entries, "thought", u.text) }));
      case "toolStarted":
        return set((s) => ({
          entries: [...s.entries, { id: entrySeq++, kind: "tool", title: u.title }],
        }));
      case "usage":
        return set({ tokensUsed: u.used, tokensMax: u.size || get().tokensMax });
      case "modes":
        return set({ modes: u.modes, currentModeId: u.current });
      case "modeChanged":
        return set({ currentModeId: u.modeId });
      case "configs":
        return set({ configs: u.configs });
      case "plan":
        return set({ plan: u.items });
      case "permissionRequest":
        return set({ pending: { id: u.id, title: u.title, diffs: u.diffs, options: u.options } });
      case "turnEnded": {
        set({ running: false });
        if (get().velqEdit) void get().finishVelqEdit();
        return;
      }
      case "sessionEnded":
        return set({ sessionActive: false, running: false, pending: null, velqEdit: null });
      case "failed":
        return set((s) => ({
          entries: [...s.entries, { id: entrySeq++, kind: "agent", text: `⚠️ ${u.message}` }],
          running: false,
        }));
    }
  },
}));
