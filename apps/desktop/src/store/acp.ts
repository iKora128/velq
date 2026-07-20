import { create } from "zustand";
import { t } from "@/i18n";
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
} from "@/ipc/acp";
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

let entrySeq = 0;

interface AcpState {
  open: boolean;
  agents: AgentInfo[];
  agentLabel: string;
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
  tokensUsed: number;
  tokensMax: number;
  input: string;

  toggle: () => void;
  show: () => void;
  hide: () => void;
  init: () => Promise<void>;
  setInput: (v: string) => void;
  setAgent: (label: string) => void;
  send: (text: string) => Promise<void>;
  setMode: (id: string) => void;
  setConfig: (configId: string, valueId: string) => void;
  answer: (index: number) => void;
  stop: () => void;
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

export const useAcp = create<AcpState>((set, get) => ({
  open: false,
  agents: [],
  agentLabel: "Claude Code",
  sessionActive: false,
  running: false,
  entries: [],
  plan: [],
  modes: [],
  currentModeId: null,
  configs: [],
  pending: null,
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
      const agents = await listAgents();
      set({ agents });
      // Default the picker to an agent that's actually ready, if the current one isn't.
      const current = agents.find((a) => a.label === get().agentLabel);
      if (!current || current.availability === "missing") {
        const ready = agents.find((a) => a.availability !== "missing");
        if (ready) set({ agentLabel: ready.label });
      }
    } catch (e) {
      console.error("agent_list_agents failed", e);
    }
  },

  setInput: (v) => set({ input: v }),
  setAgent: (label) => set({ agentLabel: label }),

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
        await startAgentSession(root, get().agentLabel);
        set({ sessionActive: true });
      } catch (e) {
        set((s) => ({
          entries: [...s.entries, { id: entrySeq++, kind: "agent", text: `⚠️ ${String(e)}` }],
        }));
        return;
      }
    }
    set((s) => ({
      entries: [...s.entries, { id: entrySeq++, kind: "user", text: trimmed }],
      input: "",
      running: true,
    }));
    try {
      await sendAgentPrompt(trimmed);
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
    set({ sessionActive: false, running: false, pending: null });
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
      case "turnEnded":
        return set({ running: false });
      case "sessionEnded":
        return set({ sessionActive: false, running: false, pending: null });
      case "failed":
        return set((s) => ({
          entries: [...s.entries, { id: entrySeq++, kind: "agent", text: `⚠️ ${u.message}` }],
          running: false,
        }));
    }
  },
}));
