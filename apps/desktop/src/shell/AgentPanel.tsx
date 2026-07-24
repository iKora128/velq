import {
  Bot,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ContextMenu, type MenuEntry } from "@/filemanager/ContextMenu";
import { useT } from "@/i18n/useT";
import { type Entry, useAcp } from "@/store/acp";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import { type DiffLine, lineDiff } from "@/util/lineDiff";
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

  // Open the session as soon as the panel mounts so the model / mode / token readouts
  // are populated before the first prompt (best-effort; no-ops without a folder/agent).
  useEffect(() => {
    void useAcp.getState().ensureSession();
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
          entries.map((e, i) => (
            <EntryRow key={e.id} entry={e} streaming={running && i === entries.length - 1} />
          ))
        )}

        {plan.length > 0 && <PlanChecklist />}

        {pending && <PermissionCard />}
      </div>

      <div className="agent-toolbar">
        <Selectors />
        <MetaBar />
      </div>

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

function EntryRow({ entry, streaming }: { entry: Entry; streaming: boolean }) {
  switch (entry.kind) {
    case "user":
      return <div className="agent-msg agent-msg--user">{entry.text}</div>;
    case "thought":
      return (
        <div className="agent-thought">
          <AgentMarkdown text={entry.text} streaming={streaming} />
        </div>
      );
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
          <AgentMarkdown text={entry.text} streaming={streaming} />
        </div>
      );
  }
}

/** The agent's plan, shown as a persistent checklist above the transcript tail. */
function PlanChecklist() {
  const t = useT();
  const plan = useAcp((s) => s.plan);
  const done = plan.filter((p) => p.status === "completed").length;
  return (
    <div className="agent-plan">
      <div className="agent-plan__head">
        <span className="agent-plan__title">{t("agent.plan")}</span>
        <span className="agent-plan__count">
          {done}/{plan.length}
        </span>
      </div>
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
  );
}

/** Live status (thinking / writing / waiting) + an always-visible context-usage meter.
 *  Ported from shirushi's meta row: the token count was invisible in Zed+ACP — here it's
 *  in view whenever a session is live, so you can see how much room is left. */
function MetaBar() {
  const t = useT();
  const running = useAcp((s) => s.running);
  const pending = useAcp((s) => s.pending);
  const entries = useAcp((s) => s.entries);
  const tokensUsed = useAcp((s) => s.tokensUsed);
  const tokensMax = useAcp((s) => s.tokensMax);
  const sessionActive = useAcp((s) => s.sessionActive);
  const turnStartedAt = useAcp((s) => s.turnStartedAt);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running || !turnStartedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed((Date.now() - turnStartedAt) / 1000);
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running, turnStartedAt]);

  // Nothing worth showing until there's a live session (or a turn in flight).
  if (!sessionActive && !running && tokensMax === 0) return null;

  const last = entries[entries.length - 1];
  const thinking = running && last?.kind === "thought";
  const state = pending ? "blocked" : running ? (thinking ? "thinking" : "writing") : "idle";
  const label = pending
    ? t("agent.stateWaiting")
    : thinking
      ? t("agent.stateThinking")
      : running
        ? t("agent.stateWriting")
        : t("agent.stateReady");

  const ratio = tokensMax > 0 ? Math.min(1, tokensUsed / tokensMax) : 0;
  return (
    <div className="agent-meta">
      <div className={cn("agent-status", `is-${state}`)}>
        <span className="agent-status__dot" />
        <span className="agent-status__label">{label}</span>
        {running && <span className="agent-status__elapsed">{elapsed.toFixed(1)}s</span>}
      </div>
      {tokensMax > 0 && (
        <div
          className={cn("agent-tokens", ratio > 0.9 && "is-full")}
          title={t("agent.tokensTitle", {
            used: tokensUsed.toLocaleString(),
            max: tokensMax.toLocaleString(),
          })}
        >
          <span className="agent-tokens__bar">
            <span className="agent-tokens__fill" style={{ width: `${ratio * 100}%` }} />
          </span>
          <span className="agent-tokens__label">
            {humanTokens(tokensUsed)}/{humanTokens(tokensMax)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Compact assistant / model / thinking-level / mode pickers. The assistant pill is always
 *  available (from the installed-agents list); model / effort / mode appear once the running
 *  agent advertises them (right after the session opens). */
function Selectors() {
  const t = useT();
  const agents = useAcp((s) => s.agents);
  const defaultLabel = useSettings((s) => s.agentLabel);
  const modes = useAcp((s) => s.modes);
  const currentModeId = useAcp((s) => s.currentModeId);
  const configs = useAcp((s) => s.configs);
  const running = useAcp((s) => s.running);

  const model = configs.find((c) => c.category === "model");
  const effort = configs.find((c) => c.category === "thoughtLevel");
  const currentAgent = agents.find((a) => a.label === defaultLabel);
  const currentMode = modes.find((m) => m.id === currentModeId);

  const agentItems: MenuEntry[] = agents.map((a) => ({
    label: a.label,
    icon: <AgentIcon id={a.id} size={15} />,
    active: a.label === defaultLabel,
    onClick: () => {
      if (a.label === defaultLabel) return;
      useAcp.getState().setDefaultAgent(a.label);
      void useAcp.getState().ensureSession();
    },
  }));

  return (
    <div className="agent-selectors">
      <Pill
        label={currentAgent?.label ?? defaultLabel ?? "Claude Code"}
        title={t("agent.pickAssistant")}
        icon={currentAgent ? <AgentIcon id={currentAgent.id} size={14} /> : undefined}
        items={agentItems}
      />
      {model && (
        <Pill
          label={choiceName(model.choices, model.current)}
          title={t("agent.pickModel")}
          items={model.choices.map((ch) => ({
            label: ch.name,
            active: ch.valueId === model.current,
            onClick: () => useAcp.getState().setConfig(model.configId, ch.valueId),
          }))}
        />
      )}
      {effort && (
        <Pill
          label={choiceName(effort.choices, effort.current)}
          title={t("agent.pickEffort")}
          items={effort.choices.map((ch) => ({
            label: ch.name,
            active: ch.valueId === effort.current,
            onClick: () => useAcp.getState().setConfig(effort.configId, ch.valueId),
          }))}
        />
      )}
      {modes.length > 0 && (
        <Pill
          label={currentMode?.name ?? t("agent.mode")}
          title={t("agent.pickMode")}
          disabled={running}
          items={modes.map((m) => ({
            label: m.name,
            active: m.id === currentModeId,
            onClick: () => useAcp.getState().setMode(m.id),
          }))}
        />
      )}
    </div>
  );
}

/** A single selector pill that opens its menu upward (it sits at the bottom of the panel). */
function Pill({
  label,
  title,
  icon,
  items,
  disabled,
}: {
  label: string;
  title: string;
  icon?: ReactNode;
  items: MenuEntry[];
  disabled?: boolean;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        type="button"
        className="agent-pill"
        title={title}
        aria-haspopup="menu"
        disabled={disabled || items.length === 0}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.left, y: r.top - 4 });
        }}
      >
        {icon}
        <span className="agent-pill__label">{label}</span>
        <ChevronDown size={12} className="agent-pill__chev" />
      </button>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} openUp entries={items} onClose={() => setMenu(null)} />
      )}
    </>
  );
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
              <div className="agent-permission__filehead">
                <span className="agent-permission__path">{shortPath(d.path)}</span>
                {d.oldText == null && (
                  <span className="agent-permission__badge">{t("agent.newFile")}</span>
                )}
              </div>
              <DiffPreview oldText={d.oldText} newText={d.newText} />
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

/** How many changed lines the permission card shows before collapsing the rest. */
const DIFF_CAP = 18;

/** A compact "what will change" preview for a proposed file edit: the added / removed
 *  lines (context trimmed), capped so a big rewrite doesn't flood the card. */
function DiffPreview({ oldText, newText }: { oldText: string | null; newText: string }) {
  const t = useT();
  const changed = lineDiff(oldText ?? "", newText).filter((l) => l.type !== "ctx");
  if (changed.length === 0) return null;
  const shown = changed.slice(0, DIFF_CAP);
  const more = changed.length - shown.length;
  return (
    <div className="agent-diff">
      {shown.map((l: DiffLine, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static per-render diff, index is stable.
          key={i}
          className={cn("agent-diff__line", `is-${l.type}`)}
        >
          <span className="agent-diff__sign">{l.type === "add" ? "+" : "−"}</span>
          <span className="agent-diff__text">{l.text || " "}</span>
        </div>
      ))}
      {more > 0 && <div className="agent-diff__more">{t("agent.diffMore", { count: more })}</div>}
    </div>
  );
}

/** Token count → a compact human string: `22964` → `23k`, `1000000` → `1M`. */
function humanTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return Math.abs(k - Math.round(k)) < 0.05 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return Math.abs(m - Math.round(m)) < 0.05 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`;
}

/** The display name for a config value id (falls back to the id if unknown). */
function choiceName(choices: { valueId: string; name: string }[], current: string): string {
  return choices.find((c) => c.valueId === current)?.name ?? current;
}

/** Trim a full path to its last two segments so the permission card stays readable. */
function shortPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length <= 2 ? path : `…/${parts.slice(-2).join("/")}`;
}
