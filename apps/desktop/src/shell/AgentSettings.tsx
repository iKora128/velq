import { Star } from "lucide-react";
import { useEffect } from "react";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import { type AgentInfo, agentOpenTerminal } from "@/ipc/acp";
import { useAcp } from "@/store/acp";
import { useSettings } from "@/store/settings";
import { cn } from "@/util/cn";
import { AgentIcon } from "./AgentIcon";

const STATUS: Record<AgentInfo["availability"], { key: MsgKey; cls: string }> = {
  installed: { key: "settings.agents.installed", cls: "is-ok" },
  npx: { key: "settings.agents.npx", cls: "is-warn" },
  missing: { key: "settings.agents.missing", cls: "is-missing" },
};

/** The agent picker + setup rows for the Settings screen. One row per agent: brand
 *  mark, name, local status, "Set as default", and Log in / Install (which open the
 *  agent's own CLI in a terminal — Velq holds no keys, matching shirushi). */
export function AgentSettings() {
  const t = useT();
  const agents = useAcp((s) => s.agents);

  useEffect(() => {
    void useAcp.getState().init();
  }, []);

  if (agents.length === 0) {
    return <p className="settings-field__hint">{t("common.loading")}</p>;
  }
  return (
    <div className="agent-rows">
      {agents.map((a) => (
        <AgentRow key={a.id} agent={a} />
      ))}
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentInfo }) {
  const t = useT();
  const isDefault = useSettings((s) => s.agentLabel === agent.label);
  const status = STATUS[agent.availability];
  return (
    <div className={cn("agent-row", isDefault && "is-default")}>
      <AgentIcon id={agent.id} size={24} />
      <div className="agent-row__meta">
        <div className="agent-row__name">{agent.label}</div>
        <div className={cn("agent-row__status", status.cls)}>
          <span className="agent-row__dot" />
          {t(status.key)}
        </div>
      </div>
      <div className="agent-row__actions">
        {isDefault ? (
          <span className="agent-row__default">
            <Star size={12} fill="currentColor" />
            {t("settings.agents.default")}
          </span>
        ) : (
          <button
            type="button"
            className="agent-row__btn"
            onClick={() => useAcp.getState().setDefaultAgent(agent.label)}
          >
            {t("settings.agents.setDefault")}
          </button>
        )}
        <button
          type="button"
          className="agent-row__btn"
          onClick={() => void agentOpenTerminal(agent.loginCmd)}
        >
          {t("settings.agents.login")}
        </button>
        {agent.availability !== "installed" && (
          <button
            type="button"
            className="agent-row__btn"
            onClick={() => void agentOpenTerminal(agent.installCmd)}
          >
            {t("settings.agents.install")}
          </button>
        )}
      </div>
    </div>
  );
}
