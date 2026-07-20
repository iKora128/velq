/**
 * Typed IPC for the AI agent (ACP). Mirrors the Rust `commands/agent.rs` DTOs
 * (camelCase). The session streams `agent:update` events; everything else is a
 * plain command. Nobody outside this file talks to the agent commands directly.
 */
import { invoke, listen } from "./tauri";

/** One selectable agent + how ready it is locally (for a picker / setup screen). */
export interface AgentInfo {
  id: string;
  label: string;
  availability: "installed" | "npx" | "missing";
  installCmd: string;
  loginCmd: string;
}

export interface AgentMode {
  id: string;
  name: string;
}
export interface AgentChoice {
  valueId: string;
  name: string;
}
export interface AgentConfig {
  configId: string;
  category: "model" | "thoughtLevel" | "other";
  current: string;
  choices: AgentChoice[];
}
/** What the agent proposes to change to a file (old is null for a new file). */
export interface AgentDiff {
  path: string;
  oldText: string | null;
  newText: string;
}
export interface AgentPermissionOption {
  label: string;
  kind: "allow" | "allowAlways" | "reject" | "rejectAlways" | "other";
}
export interface AgentPlanItem {
  content: string;
  status: "pending" | "inProgress" | "completed";
}

/** A streamed update from the session (mirrors Rust `AgentUpdate`, tag = `kind`). */
export type AgentUpdate =
  | { kind: "agentChunk"; text: string }
  | { kind: "thoughtChunk"; text: string }
  | { kind: "toolStarted"; title: string }
  | { kind: "usage"; used: number; size: number }
  | { kind: "modes"; modes: AgentMode[]; current: string }
  | { kind: "modeChanged"; modeId: string }
  | { kind: "configs"; configs: AgentConfig[] }
  | {
      kind: "permissionRequest";
      id: number;
      title: string;
      diffs: AgentDiff[];
      options: AgentPermissionOption[];
    }
  | { kind: "plan"; items: AgentPlanItem[] }
  | { kind: "turnEnded" }
  | { kind: "sessionEnded" }
  | { kind: "failed"; message: string };

export const listAgents = () => invoke<AgentInfo[]>("agent_list_agents");
export const startAgentSession = (cwd: string, agentLabel: string) =>
  invoke<void>("agent_start_session", { cwd, agentLabel });
export const sendAgentPrompt = (prompt: string) => invoke<void>("agent_send_prompt", { prompt });
export const setAgentMode = (modeId: string) => invoke<void>("agent_set_mode", { modeId });
export const setAgentConfig = (configId: string, valueId: string) =>
  invoke<void>("agent_set_config", { configId, valueId });
export const answerAgentPermission = (id: number, index: number) =>
  invoke<void>("agent_answer_permission", { id, index });
export const stopAgentSession = () => invoke<void>("agent_stop_session");
/** Open the OS terminal running a setup command (install / interactive login). */
export const agentOpenTerminal = (command: string) =>
  invoke<void>("agent_open_terminal", { command });

/** Subscribe to the streamed session updates. Returns an unlisten fn. */
export const onAgentUpdate = (cb: (u: AgentUpdate) => void) =>
  listen<AgentUpdate>("agent:update", cb);
