import { Bot, CircleCheck, CircleDashed, CircleDot, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/useT";
import { type Entry, useAcp } from "@/store/acp";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import { fmtShortcut } from "@/util/platform";
import { AgentIcon } from "./AgentIcon";
import { AgentMarkdown } from "./AgentMarkdown";
import "./agent.css";

/** The AI assistant: a right dock where you ask, in plain language, for edits to the
 *  files in the open folder. The agent writes to disk; the open document reloads to
 *  show the change (via the same external-change path any edit uses). */
export function AgentPanel() {
  const t = useT();
  const entries = useAcp((s) => s.entries);
  const plan = useAcp((s) => s.plan);
  const pending = useAcp((s) => s.pending);
  const running = useAcp((s) => s.running);
  const input = useAcp((s) => s.input);
  const hasVault = useVault((s) => !!s.root);
  const agents = useAcp((s) => s.agents);
  const defaultLabel = useSettings((s) => s.agentLabel);
  const agentInfo = agents.find((a) => a.label === defaultLabel);
  const needsSetup = agentInfo?.availability === "missing";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void useAcp.getState().init();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keep the newest content in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, plan, pending, running]);

  const submit = () => void useAcp.getState().send(useAcp.getState().input);

  return (
    <aside className="agent-panel">
      <div className="pane-head">
        <span className="agent-panel__title">
          <Bot size={15} />
          {t("agent.title")}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={t("agent.close")}
          onClick={() => useAcp.getState().hide()}
        >
          <X size={16} />
        </button>
      </div>

      <div className="agent-scroll" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="agent-empty">
            {agentInfo ? (
              <AgentIcon id={agentInfo.id} size={28} />
            ) : (
              <Bot size={22} className="agent-empty__icon" />
            )}
            {needsSetup ? (
              <>
                <p className="agent-empty__hint">{t("agent.notReady", { agent: defaultLabel })}</p>
                <button
                  type="button"
                  className="agent-setup-btn"
                  onClick={() => {
                    useAcp.getState().hide();
                    useUI.getState().setView("settings");
                  }}
                >
                  {t("agent.openSettings")}
                </button>
              </>
            ) : (
              <p className="agent-empty__hint">
                {hasVault ? t("agent.emptyHint") : t("agent.emptyNoVault")}
              </p>
            )}
          </div>
        ) : (
          entries.map((e) => <EntryRow key={e.id} entry={e} />)
        )}

        {plan.length > 0 && (
          <div className="agent-plan">
            <div className="agent-plan__title">{t("agent.plan")}</div>
            {plan.map((p) => (
              <div key={p.content} className={cn("agent-plan__item", `is-${p.status}`)}>
                {p.status === "completed" ? (
                  <CircleCheck size={13} />
                ) : p.status === "inProgress" ? (
                  <CircleDot size={13} />
                ) : (
                  <CircleDashed size={13} />
                )}
                <span>{p.content}</span>
              </div>
            ))}
          </div>
        )}

        {running && !pending && (
          <div className="agent-working">
            <Loader2 size={13} className="agent-spin" />
            {t("agent.thinking")}
          </div>
        )}

        {pending && <PermissionCard />}
      </div>

      <Selectors />

      <form
        className="agent-compose"
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
      >
        <div className="agent-compose__row">
          <textarea
            className="agent-compose__input"
            value={input}
            rows={2}
            placeholder={t("agent.placeholder")}
            onChange={(ev) => useAcp.getState().setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key !== "Enter") return;
              // Cmd/Ctrl+Enter always sends — reliable even mid-IME-composition.
              if (ev.metaKey || ev.ctrlKey) {
                ev.preventDefault();
                submit();
                return;
              }
              // Plain Enter sends too, but not while an IME is composing (that Enter
              // confirms the conversion — essential for Japanese input) nor with Shift.
              if (!ev.shiftKey && !ev.nativeEvent.isComposing) {
                ev.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="submit"
            className={cn("agent-compose__send", input.trim() && !running && "is-ready")}
            aria-label={running ? t("agent.thinking") : t("agent.send")}
            disabled={!input.trim() || running}
          >
            {running ? <Loader2 size={15} className="agent-spin" /> : <Send size={15} />}
          </button>
        </div>
        <div className="agent-compose__hint">
          {t("agent.sendHint", { key: fmtShortcut("Mod+Enter") })}
        </div>
      </form>
    </aside>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  switch (entry.kind) {
    case "user":
      return <div className="agent-msg agent-msg--user">{entry.text}</div>;
    case "thought":
      return <div className="agent-thought">{entry.text}</div>;
    case "tool":
      return (
        <div className="agent-tool">
          <span className="agent-tool__dot">⏺</span>
          <span className="agent-tool__title">{entry.title}</span>
        </div>
      );
    default:
      return (
        <div className="agent-msg agent-msg--agent">
          <AgentMarkdown text={entry.text} />
        </div>
      );
  }
}

function PermissionCard() {
  const t = useT();
  const pending = useAcp((s) => s.pending);
  if (!pending) return null;
  return (
    <div className="agent-permission">
      <div className="agent-permission__title">{pending.title}</div>
      {pending.diffs.length > 0 && (
        <div className="agent-permission__files">
          {pending.diffs.map((d) => (
            <div key={d.path} className="agent-permission__file">
              <span className="agent-permission__path">{shortPath(d.path)}</span>
              {d.oldText == null && (
                <span className="agent-permission__badge">{t("agent.newFile")}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="agent-permission__actions">
        {pending.options.map((o, i) => (
          <button
            key={`${o.kind}-${o.label}`}
            type="button"
            className={cn(
              "agent-permission__btn",
              o.kind.startsWith("allow") ? "is-allow" : "is-reject",
            )}
            onClick={() => useAcp.getState().answer(i)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Compact mode / model / thinking-level pickers, populated from what the agent advertises. */
function Selectors() {
  const modes = useAcp((s) => s.modes);
  const currentModeId = useAcp((s) => s.currentModeId);
  const configs = useAcp((s) => s.configs);
  const selectable = configs.filter((c) => c.category === "model" || c.category === "thoughtLevel");
  if (modes.length === 0 && selectable.length === 0) return null;
  return (
    <div className="agent-selectors">
      {modes.length > 0 && (
        <select
          className="agent-select"
          value={currentModeId ?? ""}
          onChange={(e) => useAcp.getState().setMode(e.target.value)}
        >
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      {selectable.map((c) => (
        <select
          key={c.configId}
          className="agent-select"
          value={c.current}
          onChange={(e) => useAcp.getState().setConfig(c.configId, e.target.value)}
        >
          {c.choices.map((ch) => (
            <option key={ch.valueId} value={ch.valueId}>
              {ch.name}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

/** Trim a full path to its last two segments so the permission card stays readable. */
function shortPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length <= 2 ? path : `…/${parts.slice(-2).join("/")}`;
}
