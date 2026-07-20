//! AI agent (ACP) glue. Thin Tauri layer over `velq-acp`: one resident agent session,
//! driven by two channels. UI → session via `agent_send_prompt` / `agent_set_mode` /
//! `agent_set_config` (pushed onto the command channel); session → UI as `agent:update`
//! events streamed from a background drain. Permission requests carry a Rust-side
//! responder we stash by id; the UI answers with `agent_answer_permission(id, index)`.
//!
//! File edits happen by the agent writing to disk directly (we never advertise the ACP
//! `fs` capability) — the existing `fs:changed` watcher reflects them in the open document.

use std::collections::HashMap;
use std::sync::Mutex;

use futures::channel::mpsc;
use futures::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use velq_acp::{AgentEvent, ConfigOption, SessionCommand};

/// The one live agent session. Replacing `command_tx` (a fresh `agent_start_session`)
/// drops the old sender, which closes the old session's command channel and tears it down.
#[derive(Default)]
pub struct AcpState {
    inner: Mutex<AcpInner>,
}

#[derive(Default)]
struct AcpInner {
    /// UI → session command sink for the active session.
    command_tx: Option<mpsc::UnboundedSender<SessionCommand>>,
    /// In-flight permission requests: id → the responder the ACP loop is blocked on.
    pending: HashMap<u64, mpsc::UnboundedSender<usize>>,
    next_id: u64,
}

// ---- DTOs (camelCase for the frontend; serde renames variants + their fields) ----

/// One streamed update from the agent session. Tag field is `kind`.
#[derive(Serialize, Clone)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum AgentUpdate {
    /// Incremental body text from the agent.
    AgentChunk { text: String },
    /// Incremental "thinking" text.
    ThoughtChunk { text: String },
    /// A tool call started (human-readable title, e.g. "Edit index.html").
    ToolStarted { title: String },
    /// Context/token usage update.
    Usage { used: u64, size: u64 },
    /// Advertised permission modes + the current one (at session start).
    Modes {
        modes: Vec<ModeDto>,
        current: String,
    },
    /// The current mode changed.
    ModeChanged { mode_id: String },
    /// Advertised config options (model / thinking level).
    Configs { configs: Vec<ConfigDto> },
    /// The agent is asking to run a tool / apply an edit. Answer via `agent_answer_permission`.
    PermissionRequest {
        id: u64,
        title: String,
        diffs: Vec<DiffDto>,
        options: Vec<OptionDto>,
    },
    /// The agent's full plan (replace the checklist each time).
    Plan { items: Vec<PlanItemDto> },
    /// One prompt→response turn finished.
    TurnEnded,
    /// The session itself ended (agent exited or was stopped).
    SessionEnded,
    /// A hard error (spawn/connection/protocol).
    Failed { message: String },
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModeDto {
    id: String,
    name: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigDto {
    config_id: String,
    /// "model" | "thoughtLevel" | "other"
    category: String,
    current: String,
    choices: Vec<ChoiceDto>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChoiceDto {
    value_id: String,
    name: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiffDto {
    path: String,
    old_text: Option<String>,
    new_text: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OptionDto {
    label: String,
    /// "allow" | "allowAlways" | "reject" | "rejectAlways" | "other"
    kind: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlanItemDto {
    content: String,
    /// "pending" | "inProgress" | "completed"
    status: String,
}

/// One selectable agent, for the setup UI.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    id: String,
    label: String,
    /// "installed" | "npx" | "missing"
    availability: String,
    install_cmd: String,
    login_cmd: String,
}

// ---- commands ----

/// The agents Velq can talk to, with local availability (for a setup/picker screen).
#[tauri::command]
pub fn agent_list_agents() -> Vec<AgentInfo> {
    velq_acp::AGENTS
        .iter()
        .map(|a| AgentInfo {
            id: a.id.to_string(),
            label: a.label.to_string(),
            availability: availability_str(a.availability()).to_string(),
            install_cmd: a.install_cmd.to_string(),
            login_cmd: a.login_cmd.to_string(),
        })
        .collect()
}

/// Start (or restart) the resident agent session with `cwd` as the working folder.
/// Runs the session on a dedicated thread + futures executor (isolated from Tauri's tokio;
/// the transport I/O rides the `blocking` crate's pool either way), and drains its events
/// into `agent:update`.
#[tauri::command]
pub fn agent_start_session(
    app: AppHandle,
    state: State<AcpState>,
    cwd: String,
    agent_label: String,
) -> Result<(), String> {
    let kind = velq_acp::AgentKind::by_label(&agent_label)
        .ok_or_else(|| format!("unknown agent: {agent_label}"))?;
    let command = kind
        .command(&cwd)
        .ok_or_else(|| format!("{agent_label} isn't set up yet. Install it, then try again."))?;

    let (command_tx, command_rx) = mpsc::unbounded::<SessionCommand>();
    let (event_tx, event_rx) = mpsc::unbounded::<AgentEvent>();

    {
        let mut inner = state.inner.lock().unwrap();
        // Replacing the sender drops the old one → the previous session (if any) winds down.
        inner.command_tx = Some(command_tx);
        inner.pending.clear();
    }

    let app_for_session = app.clone();
    std::thread::spawn(move || {
        let result =
            futures::executor::block_on(velq_acp::run_session(command, command_rx, event_tx));
        if let Err(error) = result {
            let _ = app_for_session.emit(
                "agent:update",
                AgentUpdate::Failed {
                    message: error.to_string(),
                },
            );
        }
        let _ = app_for_session.emit("agent:update", AgentUpdate::SessionEnded);
    });

    let app_for_drain = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut event_rx = event_rx;
        while let Some(event) = event_rx.next().await {
            forward_event(&app_for_drain, event);
        }
    });

    Ok(())
}

/// Send a prompt to the active session.
#[tauri::command]
pub fn agent_send_prompt(state: State<AcpState>, prompt: String) -> Result<(), String> {
    with_command_tx(&state, |tx| {
        tx.unbounded_send(SessionCommand::Prompt(prompt))
            .map_err(|_| "the agent session has ended".to_string())
    })
}

/// Change the permission mode (e.g. accept-edits / plan / manual).
#[tauri::command]
pub fn agent_set_mode(state: State<AcpState>, mode_id: String) -> Result<(), String> {
    with_command_tx(&state, |tx| {
        tx.unbounded_send(SessionCommand::SetMode(mode_id))
            .map_err(|_| "the agent session has ended".to_string())
    })
}

/// Change a config option (model / thinking level).
#[tauri::command]
pub fn agent_set_config(
    state: State<AcpState>,
    config_id: String,
    value_id: String,
) -> Result<(), String> {
    with_command_tx(&state, |tx| {
        tx.unbounded_send(SessionCommand::SetConfig {
            config_id,
            value_id,
        })
        .map_err(|_| "the agent session has ended".to_string())
    })
}

/// Answer a pending permission request with the chosen option `index`.
#[tauri::command]
pub fn agent_answer_permission(
    state: State<AcpState>,
    id: u64,
    index: usize,
) -> Result<(), String> {
    let mut inner = state.inner.lock().unwrap();
    if let Some(tx) = inner.pending.remove(&id) {
        let _ = tx.unbounded_send(index);
    }
    Ok(())
}

/// Stop the active session (drops the command sink → the session tears down).
#[tauri::command]
pub fn agent_stop_session(state: State<AcpState>) -> Result<(), String> {
    let mut inner = state.inner.lock().unwrap();
    inner.command_tx = None;
    inner.pending.clear();
    Ok(())
}

/// Open the OS terminal running `command` — used to install or log in to an agent's
/// CLI, which is interactive (e.g. `claude` opens a browser login). We hold no keys,
/// so setup rides the vendor CLI's own flow (same as shirushi). Best-effort per platform.
#[tauri::command]
pub fn agent_open_terminal(command: String) -> Result<(), String> {
    open_terminal_impl(&command).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn open_terminal_impl(command: &str) -> std::io::Result<()> {
    let escaped = command.replace('\\', "\\\\").replace('"', "\\\"");
    let script =
        format!("tell application \"Terminal\"\nactivate\ndo script \"{escaped}\"\nend tell");
    std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .spawn()?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_terminal_impl(command: &str) -> std::io::Result<()> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "cmd", "/K", command])
        .spawn()?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn open_terminal_impl(command: &str) -> std::io::Result<()> {
    let inner = command.replace('\'', "'\\''");
    std::process::Command::new("x-terminal-emulator")
        .arg("-e")
        .arg(format!("sh -c '{inner}; exec bash'"))
        .spawn()?;
    Ok(())
}

/// Extract a `.velq`'s current editable content to a plain working file the ACP agent can
/// edit — the agent can't read the inner document out of the ZIP. Returns the working
/// file's absolute path (in a hidden `.velq-agent/` beside the package); the frontend packs
/// it back into the `.velq` (rendering Markdown→HTML) after the agent's turn.
#[tauri::command]
pub fn velq_agent_extract(
    velq_path: String,
    content: String,
    language: String,
) -> Result<String, String> {
    let velq = std::path::Path::new(&velq_path);
    let parent = velq
        .parent()
        .ok_or_else(|| "invalid .velq path".to_string())?;
    let dir = parent.join(".velq-agent");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stem = velq
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "document".to_string());
    let ext = if language == "html" { "html" } else { "md" };
    let working = dir.join(format!("{stem}.{ext}"));
    std::fs::write(&working, content).map_err(|e| e.to_string())?;
    Ok(working.to_string_lossy().to_string())
}

// ---- helpers ----

fn with_command_tx<F>(state: &State<AcpState>, f: F) -> Result<(), String>
where
    F: FnOnce(&mpsc::UnboundedSender<SessionCommand>) -> Result<(), String>,
{
    let inner = state.inner.lock().unwrap();
    let tx = inner.command_tx.as_ref().ok_or("no active agent session")?;
    f(tx)
}

/// Convert a session event into a serializable update and emit it. For a permission
/// request we stash the Rust responder by id first (the UI answers against that id).
fn forward_event(app: &AppHandle, event: AgentEvent) {
    let update = match event {
        AgentEvent::AgentChunk(text) => AgentUpdate::AgentChunk { text },
        AgentEvent::ThoughtChunk(text) => AgentUpdate::ThoughtChunk { text },
        AgentEvent::ToolStarted(title) => AgentUpdate::ToolStarted { title },
        AgentEvent::Usage { used, size } => AgentUpdate::Usage { used, size },
        AgentEvent::Modes { modes, current } => AgentUpdate::Modes {
            modes: modes
                .into_iter()
                .map(|(id, name)| ModeDto { id, name })
                .collect(),
            current,
        },
        AgentEvent::ModeChanged(mode_id) => AgentUpdate::ModeChanged { mode_id },
        AgentEvent::Configs(configs) => AgentUpdate::Configs {
            configs: configs.iter().map(config_to_dto).collect(),
        },
        AgentEvent::Plan(items) => AgentUpdate::Plan {
            items: items
                .into_iter()
                .map(|it| PlanItemDto {
                    content: it.content,
                    status: plan_status_str(it.status).to_string(),
                })
                .collect(),
        },
        AgentEvent::PermissionRequest {
            title,
            diffs,
            options,
            respond,
        } => {
            let id = {
                let state = app.state::<AcpState>();
                let mut inner = state.inner.lock().unwrap();
                let id = inner.next_id;
                inner.next_id = inner.next_id.wrapping_add(1);
                inner.pending.insert(id, respond);
                id
            };
            AgentUpdate::PermissionRequest {
                id,
                title,
                diffs: diffs
                    .into_iter()
                    .map(|d| DiffDto {
                        path: d.path,
                        old_text: d.old_text,
                        new_text: d.new_text,
                    })
                    .collect(),
                options: options
                    .into_iter()
                    .map(|o| OptionDto {
                        label: o.label,
                        kind: permission_kind_str(o.kind).to_string(),
                    })
                    .collect(),
            }
        }
        AgentEvent::TurnEnded => AgentUpdate::TurnEnded,
        AgentEvent::Failed(message) => AgentUpdate::Failed { message },
    };
    let _ = app.emit("agent:update", update);
}

fn config_to_dto(c: &ConfigOption) -> ConfigDto {
    ConfigDto {
        config_id: c.config_id.clone(),
        category: config_category_str(c.category).to_string(),
        current: c.current.clone(),
        choices: c
            .choices
            .iter()
            .map(|(value_id, name)| ChoiceDto {
                value_id: value_id.clone(),
                name: name.clone(),
            })
            .collect(),
    }
}

fn availability_str(a: velq_acp::Availability) -> &'static str {
    match a {
        velq_acp::Availability::Installed => "installed",
        velq_acp::Availability::Npx => "npx",
        velq_acp::Availability::Missing => "missing",
    }
}

fn config_category_str(c: velq_acp::ConfigCategory) -> &'static str {
    match c {
        velq_acp::ConfigCategory::Model => "model",
        velq_acp::ConfigCategory::ThoughtLevel => "thoughtLevel",
        velq_acp::ConfigCategory::Other => "other",
    }
}

fn plan_status_str(s: velq_acp::PlanStatus) -> &'static str {
    match s {
        velq_acp::PlanStatus::Pending => "pending",
        velq_acp::PlanStatus::InProgress => "inProgress",
        velq_acp::PlanStatus::Completed => "completed",
    }
}

fn permission_kind_str(k: velq_acp::PermissionKind) -> &'static str {
    match k {
        velq_acp::PermissionKind::Allow => "allow",
        velq_acp::PermissionKind::AllowAlways => "allowAlways",
        velq_acp::PermissionKind::Reject => "reject",
        velq_acp::PermissionKind::RejectAlways => "rejectAlways",
        velq_acp::PermissionKind::Other => "other",
    }
}
