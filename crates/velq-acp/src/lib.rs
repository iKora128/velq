//! velq-acp — connect Velq to an AI coding agent over ACP (Agent Client Protocol).
//!
//! Spawns an ACP agent (Claude Code et al.) as a child process, opens one resident
//! session, and drives it over two channels: [`SessionCommand`] (UI → session) and
//! [`AgentEvent`] (session → UI). File edits are made by the agent writing to disk
//! directly — we deliberately do NOT advertise the ACP `fs` capability, so Velq's
//! existing file watcher is what reflects the change in the open document. This layer
//! is UI/Tauri-independent pure logic (`cargo test`-able).
//!
//! Ported from shirushi's `acp_client` (same author); the `Host` remote abstraction is
//! dropped in favor of a direct local `std::process::Command` spawn. The Japanese
//! comments are kept from the original so this reads 1:1 against shirushi's version.

#![forbid(unsafe_code)]

use acp::schema::v1;
use acp::schema::ProtocolVersion;
use agent_client_protocol as acp;
use anyhow::{Context as _, Result};
use futures::channel::mpsc;
use futures::StreamExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};

/// 権限リクエストの選択肢の種類（UI のスタイル分け用。ACP `PermissionOptionKind` を簡約）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionKind {
    /// 今回だけ許可。
    Allow,
    /// 常に許可（記憶する）。
    AllowAlways,
    /// 今回だけ拒否。
    Reject,
    /// 常に拒否（記憶する）。
    RejectAlways,
    /// 未知（プロトコル拡張）。中立スタイルで出す。
    Other,
}

/// 権限リクエストの 1 選択肢（許可 / 常に許可 / 拒否 など）。UI がボタンにする。
#[derive(Debug, Clone)]
pub struct PermissionChoice {
    pub label: String,
    pub kind: PermissionKind,
}

/// セッション設定オプションの意味カテゴリ（UI が Model / Effort セレクタへ振り分ける）。
/// ACP `SessionConfigOptionCategory` を簡約（Mode/ModelConfig/Other は今は `Other` に畳む）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigCategory {
    /// モデル選択。
    Model,
    /// 思考/推論レベル（effort 相当）。
    ThoughtLevel,
    /// その他（今は UI で扱わない）。
    Other,
}

/// エージェントが広告する 1 つの選択式設定（モデル・思考レベル等）。
/// ACP `SessionConfigOption` の Select を簡約。UI はこれでセレクタを実選択肢に置き換える。
#[derive(Debug, Clone)]
pub struct ConfigOption {
    pub config_id: String,
    pub category: ConfigCategory,
    /// 現在の value_id。
    pub current: String,
    /// 選択肢 `(value_id, 表示名)`。
    pub choices: Vec<(String, String)>,
}

/// 権限リクエストに含まれるファイル編集の差分（accept/reject の diff レビュー用）。
#[derive(Debug, Clone)]
pub struct PermissionDiff {
    pub path: String,
    /// 変更前の内容（新規ファイルなら `None`）。
    pub old_text: Option<String>,
    pub new_text: String,
}

/// プラン 1 項目の状態（ACP `PlanEntryStatus` の写し）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanStatus {
    /// 未着手。
    Pending,
    /// 進行中（UI では ● スレッド色）。
    InProgress,
    /// 完了。
    Completed,
}

/// エージェントの実行プラン 1 項目（ACP `SessionUpdate::Plan` の写し）。
/// プランは毎回**全量置換**で届く（差分ではない）。
#[derive(Debug, Clone)]
pub struct PlanItem {
    pub content: String,
    pub status: PlanStatus,
}

/// UI へ流すストリーミングイベント（ACP の `SessionUpdate` を UI 非依存に簡約したもの）。
/// パネルはこれを受けて transcript を逐次更新する。
#[derive(Debug, Clone)]
pub enum AgentEvent {
    /// エージェント本文の増分テキスト（`AgentMessageChunk`）。
    AgentChunk(String),
    /// 思考の増分テキスト（`AgentThoughtChunk`）。
    ThoughtChunk(String),
    /// ツール呼び出しの開始（`ToolCall`）。`title` は人間可読の説明（例「Read src/main.rs」）。
    ToolStarted(String),
    /// コンテキスト使用量の更新（`UsageUpdate`）。`used`/`size` はトークン数。
    Usage { used: u64, size: u64 },
    /// エージェントが広告する権限モード一覧 + 現在モード（セッション開始時）。`(mode_id, 表示名)`。
    Modes {
        modes: Vec<(String, String)>,
        current: String,
    },
    /// 現在モードが変わった（`CurrentModeUpdate`）。mode_id。
    ModeChanged(String),
    /// エージェントが広告する設定オプション（モデル・思考レベル等）。セッション開始時 + 変更時。
    /// 空でも「広告あり（＝実反映できる）」の意味で送る。UI は該当セレクタを実選択肢に置き換える。
    Configs(Vec<ConfigOption>),
    /// エージェントがツール実行/ファイル編集の許可を求めてきた（`session/request_permission`）。
    /// `respond` に**選んだ選択肢の添字**を送ると応答する。sender を drop するとキャンセル扱い。
    /// このイベントの間、当該ターンはエージェント側でブロックしている（応答するまで進まない）。
    PermissionRequest {
        title: String,
        diffs: Vec<PermissionDiff>,
        options: Vec<PermissionChoice>,
        respond: mpsc::UnboundedSender<usize>,
    },
    /// エージェントの実行プラン全量（`SessionUpdate::Plan`）。UI は常設チェックリストへ置換反映する。
    Plan(Vec<PlanItem>),
    /// 1 ターン（prompt→応答）が完了した（`StopReason`）。
    TurnEnded,
    /// エラー（接続断・プロトコル異常・起動失敗など）。
    Failed(String),
}

/// UI → 常駐セッションへの指示（[`run_session`] が単一チャネルで受ける）。
#[derive(Debug, Clone)]
pub enum SessionCommand {
    /// prompt を送る。
    Prompt(String),
    /// 権限モードを変更する（`session/set_mode`。引数は mode_id）。
    SetMode(String),
    /// 設定オプション（モデル・思考レベル等）を変更する（`session/set_config_option`）。
    SetConfig { config_id: String, value_id: String },
}

/// ACP エージェント（claude-agent-acp 等）の起動設定。
pub struct AgentCommand {
    pub path: PathBuf,
    pub args: Vec<String>,
    pub cwd: PathBuf,
}

impl AgentCommand {
    /// 既定エージェント（Claude）の起動コマンド。`cwd` はプロジェクトルート。互換用。
    pub fn claude(cwd: impl Into<PathBuf>) -> Option<AgentCommand> {
        AGENTS.first()?.command(cwd)
    }
}

/// 選べる ACP エージェント（Zed の external_agents レジストリ準拠）。
/// `bin` は Zed の npx キャッシュ `.bin/` 名、`package` は npx で落とすパッケージ、`extra_args` は
/// ACP モードに入るための追加引数（`-acp` パッケージは不要、gemini/copilot/qwen は `--acp` 等）。
pub struct AgentKind {
    pub id: &'static str,
    pub label: &'static str,
    bin: &'static str,
    /// npx フォールバック用の npm パッケージ。**npm 外（kimi=PyPI 等）は None**。
    package: Option<&'static str>,
    extra_args: &'static [&'static str],
    /// セットアップ画面の「入れ方」でターミナルに流す導入コマンド（vendor の CLI 本体を入れる）。
    pub install_cmd: &'static str,
    /// セットアップ画面の「ログイン」でターミナルに流す認証コマンド（vendor 自身のログイン導線）。
    /// Velq は鍵を持たず、CLI 側の認証にそのまま乗る（Zed の ACP と同じ流儀）。
    pub login_cmd: &'static str,
}

/// エージェントのローカル導入状況（設定画面のステータス表示）。認証状態は見ない（CLI 任せ）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Availability {
    /// bin がローカルにある（PATH / Zed の npx キャッシュ）。すぐ使える。
    Installed,
    /// bin は無いが npm パッケージがあり npx で初回取得できる。
    Npx,
    /// bin も無く npm 外＝手動導入が要る（例: Kimi=uv/pip）。
    Missing,
}

/// 対応エージェント一覧。先頭（Claude）が既定。Claude 以外は初回 npx/導入 + 各サービス認証が要る。
/// `package` は npx フォールバック用（npm 外＝Kimi は None＝PATH の bin を使う）。`install_cmd`/
/// `login_cmd` はセットアップ画面がターミナルに流す人間向けコマンド（vendor 自身の導線に委譲）。
pub const AGENTS: &[AgentKind] = &[
    AgentKind {
        id: "claude",
        label: "Claude Code",
        bin: "claude-agent-acp",
        package: Some("@agentclientprotocol/claude-agent-acp@0.58.1"),
        extra_args: &[],
        install_cmd: "npm i -g @anthropic-ai/claude-code",
        login_cmd: "claude",
    },
    AgentKind {
        id: "codex",
        label: "Codex",
        bin: "codex-acp",
        package: Some("@agentclientprotocol/codex-acp@1.1.2"),
        extra_args: &[],
        install_cmd: "npm i -g @openai/codex",
        login_cmd: "codex",
    },
    AgentKind {
        id: "copilot",
        label: "GitHub Copilot",
        bin: "copilot",
        package: Some("@github/copilot@1.0.70"),
        extra_args: &["--acp"],
        install_cmd: "npm i -g @github/copilot",
        login_cmd: "copilot",
    },
    AgentKind {
        id: "qwen",
        label: "Qwen Code",
        bin: "qwen",
        package: Some("@qwen-code/qwen-code@0.19.9"),
        extra_args: &["--acp", "--experimental-skills"],
        install_cmd: "npm i -g @qwen-code/qwen-code",
        login_cmd: "qwen",
    },
    AgentKind {
        id: "opencode",
        label: "OpenCode",
        bin: "opencode",
        package: Some("opencode-ai"),
        extra_args: &["acp"],
        install_cmd: "npm i -g opencode-ai",
        login_cmd: "opencode",
    },
    AgentKind {
        id: "kimi",
        label: "Kimi CLI",
        bin: "kimi",
        package: None,
        extra_args: &["acp"],
        install_cmd: "uv tool install kimi-cli",
        login_cmd: "kimi",
    },
    AgentKind {
        id: "grok",
        label: "Grok Build",
        bin: "grok",
        package: None,
        extra_args: &["acp"],
        install_cmd: "curl -fsSL https://x.ai/cli/install.sh | bash",
        login_cmd: "grok",
    },
];

/// UI のエージェントセレクタに出すラベル一覧（[`AGENTS`] と 1:1 対応・Zed の registry 表示名準拠）。
pub const AGENT_LABELS: &[&str] = &[
    "Claude Code",
    "Codex",
    "GitHub Copilot",
    "Qwen Code",
    "OpenCode",
    "Kimi CLI",
    "Grok Build",
];

impl AgentKind {
    /// ラベル（例 "Claude Code"）から引く。
    pub fn by_label(label: &str) -> Option<&'static AgentKind> {
        AGENTS.iter().find(|agent| agent.label == label)
    }

    /// このエージェントの起動コマンドを解決する。
    /// 探索順: (1) PATH の単体バイナリ → (2) Zed の npx キャッシュ(.bin) → (3) `npx <package> <args>`。
    pub fn command(&self, cwd: impl Into<PathBuf>) -> Option<AgentCommand> {
        let cwd = cwd.into();
        let extra: Vec<String> = self.extra_args.iter().map(|arg| arg.to_string()).collect();
        // 1) PATH の単体バイナリ
        if let Some(path) = find_in_path(self.bin) {
            return Some(AgentCommand {
                path,
                args: extra,
                cwd,
            });
        }
        // 2) Zed が展開済みの npx キャッシュ（ネット不要）
        if let Some(bin) = zed_cached_agent(self.bin) {
            return Some(AgentCommand {
                path: bin,
                args: extra,
                cwd,
            });
        }
        // 3) npx フォールバック（npm パッケージがある agent のみ。node/npx が PATH に要る）
        let package = self.package?;
        let npx = find_in_path("npx")?;
        let mut args = vec!["-y".to_string(), package.to_string()];
        args.extend(extra);
        Some(AgentCommand {
            path: npx,
            args,
            cwd,
        })
    }

    /// ローカルでの導入状況（設定画面のステータス表示用）。認証状態までは見ない（＝CLI 任せ）。
    pub fn availability(&self) -> Availability {
        if find_in_path(self.bin).is_some() || zed_cached_agent(self.bin).is_some() {
            Availability::Installed
        } else if self.package.is_some() && find_in_path("npx").is_some() {
            Availability::Npx // bin は無いが npx で初回取得できる
        } else {
            Availability::Missing // bin も無く npm 外（要手動導入。例: Kimi=uv）
        }
    }
}

/// Zed の npx キャッシュから指定 `.bin/<name>` を探す（macOS）。node シェバングなので node が PATH に要る。
/// `~/Library/Application Support/Zed/node/cache/_npx/<hash>/node_modules/.bin/<name>`。
fn zed_cached_agent(bin: &str) -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    let cache = PathBuf::from(home).join("Library/Application Support/Zed/node/cache/_npx");
    for entry in std::fs::read_dir(&cache).ok()?.flatten() {
        let candidate = entry.path().join("node_modules/.bin").join(bin);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

/// PATH からバイナリを探す。
pub fn find_in_path(binary: &str) -> Option<PathBuf> {
    let paths = std::env::var_os("PATH")?;
    std::env::split_paths(&paths)
        .map(|dir| dir.join(binary))
        .find(|candidate| candidate.is_file())
}

/// 我々（クライアント）の能力を広告する initialize リクエスト。
/// **設定オプション（モデル・思考レベル）** を受け取るには config_options 能力の広告が要る
/// （広告しないとエージェントが `config_options` を送ってこないことがある）。
/// なお `fs` 能力は**あえて広告しない** — エージェントは自前でディスクへ書き、Velq の watcher が
/// 開いているドキュメントをリロードして反映する（shirushi と同じ流儀）。
fn initialize_request() -> v1::InitializeRequest {
    v1::InitializeRequest::new(ProtocolVersion::V1).client_capabilities(
        v1::ClientCapabilities::new().session(
            v1::ClientSessionCapabilities::new().config_options(
                v1::SessionConfigOptionsCapabilities::new()
                    .boolean(v1::BooleanConfigOptionCapabilities::new()),
            ),
        ),
    )
}

/// ACP の `SessionConfigOption` 群を UI 非依存の [`ConfigOption`] へ簡約する（Select のみ扱う）。
fn map_config_options(options: &[v1::SessionConfigOption]) -> Vec<ConfigOption> {
    options.iter().filter_map(map_config_option).collect()
}

fn map_config_option(option: &v1::SessionConfigOption) -> Option<ConfigOption> {
    let category = match &option.category {
        Some(v1::SessionConfigOptionCategory::Model) => ConfigCategory::Model,
        Some(v1::SessionConfigOptionCategory::ThoughtLevel) => ConfigCategory::ThoughtLevel,
        _ => ConfigCategory::Other,
    };
    match &option.kind {
        v1::SessionConfigKind::Select(select) => {
            let choices = match &select.options {
                v1::SessionConfigSelectOptions::Ungrouped(options) => options
                    .iter()
                    .map(|option| (option.value.to_string(), option.name.clone()))
                    .collect(),
                v1::SessionConfigSelectOptions::Grouped(groups) => groups
                    .iter()
                    .flat_map(|group| {
                        group
                            .options
                            .iter()
                            .map(|option| (option.value.to_string(), option.name.clone()))
                    })
                    .collect(),
                _ => Vec::new(),
            };
            Some(ConfigOption {
                config_id: option.id.to_string(),
                category,
                current: select.current_value.to_string(),
                choices,
            })
        }
        _ => None, // Boolean は今は UI で扱わない
    }
}

/// エージェントを起動し、ACP の initialize ハンドシェイクまで行う。
/// 返り値は初期化応答（プロトコル版・エージェント能力）。疎通確認用。
pub async fn connect_and_initialize(command: &AgentCommand) -> Result<v1::InitializeResponse> {
    let mut child = Command::new(&command.path)
        .args(&command.args)
        .current_dir(&command.cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit()) // エージェントのログは我々の stderr へ（検証しやすく）
        .spawn()
        .with_context(|| format!("ACP agent を起動できない: {}", command.path.display()))?;

    let stdin = child.stdin.take().context("子プロセスの stdin が無い")?;
    let stdout = child.stdout.take().context("子プロセスの stdout が無い")?;
    // 同期パイプを futures の AsyncWrite / AsyncRead へ（ACP crate 自身の stdio と同じ blocking::Unblock 手法）
    let transport = acp::ByteStreams::new(
        blocking::Unblock::new(stdin),
        blocking::Unblock::new(stdout),
    );

    let response = acp::Client
        .builder()
        .connect_with(transport, async |connection| {
            connection
                .send_request(initialize_request())
                .block_task()
                .await
        })
        .await
        .context("ACP initialize に失敗")?;

    Ok(response)
}

/// エージェントを起動し、initialize → 新規セッション → 1 プロンプト送信 → 応答テキストを集約して返す。
/// 1 回で完結する非ストリーミング版（毎回プロセスを起動する簡易実装）。疎通確認・ユーティリティ用。
pub async fn prompt_once(command: &AgentCommand, prompt: &str) -> Result<String> {
    let mut child = Command::new(&command.path)
        .args(&command.args)
        .current_dir(&command.cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .with_context(|| format!("ACP agent を起動できない: {}", command.path.display()))?;

    let stdin = child.stdin.take().context("子プロセスの stdin が無い")?;
    let stdout = child.stdout.take().context("子プロセスの stdout が無い")?;
    let transport = acp::ByteStreams::new(
        blocking::Unblock::new(stdin),
        blocking::Unblock::new(stdout),
    );

    // クロージャは 'static になり得るよう所有データを move する（借用を持ち込まない）。
    let prompt = prompt.to_string();
    let cwd = command.cwd.clone();
    let result = acp::Client
        .builder()
        .connect_with(transport, async move |connection| {
            connection
                .send_request(initialize_request())
                .block_task()
                .await?;
            let mut session = connection
                .build_session(&cwd)
                .block_task()
                .start_session()
                .await?;
            session.send_prompt(prompt)?;
            session.read_to_string().await
        })
        .await
        .context("ACP prompt に失敗");

    // 後始末: 子プロセスを終了して回収する。既に終了済みなら kill は失敗する（想定内）。
    let _killed = child.kill();
    if let Err(error) = child.wait() {
        eprintln!("ACP agent の回収に失敗: {error}");
    }
    result
}

/// **常駐セッション + 逐次ストリーミング**。エージェントを起動して 1 セッションを開き、`command_rx` から
/// 届く各指示（prompt / モード変更 / 設定変更）を送っては `session/update` を [`AgentEvent`] に簡約して
/// `event_tx` へ逐次流す。`command_rx` が閉じる（＝送信ハンドルが全て drop）まで常駐し、プロセス・
/// セッションを保持する（同一セッション内は文脈が続く）。ターン境界は `StopReason` = [`AgentEvent::TurnEnded`]。
///
/// shirushi の `run_session_on` からの移植。Velq はローカル専用なので `Host` 抽象を外し、
/// `std::process::Command` で直接起動する（`prompt_once` と同じ手法）。
pub async fn run_session(
    command: AgentCommand,
    mut command_rx: mpsc::UnboundedReceiver<SessionCommand>,
    event_tx: mpsc::UnboundedSender<AgentEvent>,
) -> Result<()> {
    let mut child = Command::new(&command.path)
        .args(&command.args)
        .current_dir(&command.cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .with_context(|| format!("ACP agent を起動できない: {}", command.path.display()))?;

    let stdin = child.stdin.take().context("子プロセスの stdin が無い")?;
    let stdout = child.stdout.take().context("子プロセスの stdout が無い")?;
    let transport = acp::ByteStreams::new(
        blocking::Unblock::new(stdin),
        blocking::Unblock::new(stdout),
    );

    let cwd = command.cwd.clone();
    let outcome = acp::Client
        .builder()
        .connect_with(transport, async move |connection| {
            connection
                .send_request(initialize_request())
                .block_task()
                .await?;
            // セッションを手動生成する（`start_session` は応答の `config_options` を捨てるため）。
            // NewSessionResponse から config_options を取り出してから attach する。
            let response = connection
                .send_request(v1::NewSessionRequest::new(&cwd))
                .block_task()
                .await?;
            let config_options = response.config_options.clone();
            let mut session = connection.attach_session(response, Vec::new())?;

            // エージェントが広告する権限モード一覧 + 現在モードを UI へ（セレクタを実モードで組む）。
            if let Some(state) = session.modes() {
                let modes = state
                    .available_modes
                    .iter()
                    .map(|mode| (mode.id.to_string(), mode.name.clone()))
                    .collect();
                event_tx
                    .unbounded_send(AgentEvent::Modes {
                        modes,
                        current: state.current_mode_id.to_string(),
                    })
                    .ok();
            }
            // 設定オプション（モデル・思考レベル）を UI へ（あればセレクタを実選択肢に置き換える）。
            if let Some(options) = &config_options {
                event_tx
                    .unbounded_send(AgentEvent::Configs(map_config_options(options)))
                    .ok();
            }

            // UI からの指示（prompt / モード変更 / 設定変更）を単一チャネルで捌く。
            while let Some(session_command) = command_rx.next().await {
                let prompt = match session_command {
                    SessionCommand::Prompt(prompt) => prompt,
                    SessionCommand::SetMode(mode_id) => {
                        connection
                            .send_request(v1::SetSessionModeRequest::new(
                                session.session_id().clone(),
                                mode_id,
                            ))
                            .block_task()
                            .await
                            .ok();
                        continue;
                    }
                    SessionCommand::SetConfig {
                        config_id,
                        value_id,
                    } => {
                        // モデル/思考レベル等を変更。応答は更新後の一覧なので UI へ反映する。
                        if let Ok(response) = connection
                            .send_request(v1::SetSessionConfigOptionRequest::new(
                                session.session_id().clone(),
                                config_id,
                                v1::SessionConfigOptionValue::value_id(value_id),
                            ))
                            .block_task()
                            .await
                        {
                            event_tx
                                .unbounded_send(AgentEvent::Configs(map_config_options(
                                    &response.config_options,
                                )))
                                .ok();
                        }
                        continue;
                    }
                };
                if session.send_prompt(prompt).is_err() {
                    break;
                }
                loop {
                    let update = match session.read_update().await {
                        Ok(update) => update,
                        Err(error) => {
                            event_tx
                                .unbounded_send(AgentEvent::Failed(error.to_string()))
                                .ok();
                            break;
                        }
                    };
                    match update {
                        acp::SessionMessage::SessionMessage(dispatch) => {
                            acp::util::MatchDispatch::new(dispatch)
                                .if_notification(async |notification: v1::SessionNotification| {
                                    match notification.update {
                                        v1::SessionUpdate::AgentMessageChunk(
                                            v1::ContentChunk {
                                                content: v1::ContentBlock::Text(text),
                                                ..
                                            },
                                        ) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::AgentChunk(text.text))
                                                .ok();
                                        }
                                        v1::SessionUpdate::AgentThoughtChunk(
                                            v1::ContentChunk {
                                                content: v1::ContentBlock::Text(text),
                                                ..
                                            },
                                        ) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::ThoughtChunk(text.text))
                                                .ok();
                                        }
                                        v1::SessionUpdate::ToolCall(tool_call) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::ToolStarted(
                                                    tool_call.title,
                                                ))
                                                .ok();
                                        }
                                        v1::SessionUpdate::UsageUpdate(usage) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::Usage {
                                                    used: usage.used,
                                                    size: usage.size,
                                                })
                                                .ok();
                                        }
                                        v1::SessionUpdate::CurrentModeUpdate(update) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::ModeChanged(
                                                    update.current_mode_id.to_string(),
                                                ))
                                                .ok();
                                        }
                                        v1::SessionUpdate::ConfigOptionUpdate(update) => {
                                            event_tx
                                                .unbounded_send(AgentEvent::Configs(
                                                    map_config_options(&update.config_options),
                                                ))
                                                .ok();
                                        }
                                        v1::SessionUpdate::Plan(plan) => {
                                            let items = plan
                                                .entries
                                                .iter()
                                                .map(|entry| PlanItem {
                                                    content: entry.content.clone(),
                                                    status: match entry.status {
                                                        v1::PlanEntryStatus::InProgress => {
                                                            PlanStatus::InProgress
                                                        }
                                                        v1::PlanEntryStatus::Completed => {
                                                            PlanStatus::Completed
                                                        }
                                                        // Pending + 将来の未知値は未着手扱い（non_exhaustive）。
                                                        _ => PlanStatus::Pending,
                                                    },
                                                })
                                                .collect();
                                            event_tx.unbounded_send(AgentEvent::Plan(items)).ok();
                                        }
                                        _ => {}
                                    }
                                    Ok(())
                                })
                                .await
                                // エージェントからの **リクエスト**（権限確認）を捌く。応答するまでこの
                                // await は返らない＝ターンは正しくブロックされる（agent 側も待っている）。
                                .if_request(
                                    async |request: v1::RequestPermissionRequest,
                                           responder: acp::Responder<
                                        v1::RequestPermissionResponse,
                                    >| {
                                        handle_permission_request(request, responder, &event_tx)
                                            .await
                                    },
                                )
                                .await
                                .otherwise_ignore()?;
                        }
                        acp::SessionMessage::StopReason(_) => {
                            event_tx.unbounded_send(AgentEvent::TurnEnded).ok();
                            break;
                        }
                        // 将来のバリアント（enum は #[non_exhaustive]）は無視して読み続ける。
                        _ => {}
                    }
                }
            }
            Ok::<(), acp::Error>(())
        })
        .await
        .context("ACP セッションが異常終了");

    // 後始末: 子プロセスを終了して回収する。
    let _killed = child.kill();
    if let Err(error) = child.wait() {
        eprintln!("ACP agent の回収に失敗: {error}");
    }
    outcome
}

/// `session/request_permission` を UI へ橋渡しして応答する。
/// タイトル・編集差分・選択肢を [`AgentEvent::PermissionRequest`] で流し、UI が選んだ**添字**を
/// `respond` 経由で受け取って `Selected(option_id)` を返す。UI が sender を drop したら `Cancelled`。
async fn handle_permission_request(
    request: v1::RequestPermissionRequest,
    responder: acp::Responder<v1::RequestPermissionResponse>,
    event_tx: &mpsc::UnboundedSender<AgentEvent>,
) -> Result<(), acp::Error> {
    let title = request
        .tool_call
        .fields
        .title
        .clone()
        .unwrap_or_else(|| "ツールの実行許可".to_string());
    // 編集ツールなら差分が載る（diff レビュー用）。
    let diffs: Vec<PermissionDiff> = request
        .tool_call
        .fields
        .content
        .iter()
        .flatten()
        .filter_map(|content| match content {
            v1::ToolCallContent::Diff(diff) => Some(PermissionDiff {
                path: diff.path.display().to_string(),
                old_text: diff.old_text.clone(),
                new_text: diff.new_text.clone(),
            }),
            _ => None,
        })
        .collect();
    let options: Vec<PermissionChoice> = request
        .options
        .iter()
        .map(|option| PermissionChoice {
            label: option.name.clone(),
            kind: match option.kind {
                v1::PermissionOptionKind::AllowOnce => PermissionKind::Allow,
                v1::PermissionOptionKind::AllowAlways => PermissionKind::AllowAlways,
                v1::PermissionOptionKind::RejectOnce => PermissionKind::Reject,
                v1::PermissionOptionKind::RejectAlways => PermissionKind::RejectAlways,
                _ => PermissionKind::Other,
            },
        })
        .collect();

    let (respond_tx, mut respond_rx) = mpsc::unbounded::<usize>();
    event_tx
        .unbounded_send(AgentEvent::PermissionRequest {
            title,
            diffs,
            options,
            respond: respond_tx,
        })
        .ok();

    // ユーザーの決定（選択肢の添字）を待つ。sender を drop されたら None＝キャンセル。
    let chosen = respond_rx.next().await;
    let outcome = match chosen.and_then(|index| request.options.get(index)) {
        Some(option) => v1::RequestPermissionOutcome::Selected(v1::SelectedPermissionOutcome::new(
            option.option_id.clone(),
        )),
        None => v1::RequestPermissionOutcome::Cancelled,
    };
    responder.respond(v1::RequestPermissionResponse::new(outcome))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_command_lookup_is_optional() {
        // PATH に無い環境でも None を返すだけ（パニックしない）
        let _ = AgentCommand::claude(".");
        assert!(find_in_path("definitely-not-a-real-binary-xyz").is_none());
    }

    #[test]
    fn agents_registry_is_consistent() {
        // ラベル一覧は AGENTS と 1:1（先頭は既定の Claude Code）。
        assert_eq!(AGENTS.len(), AGENT_LABELS.len());
        assert_eq!(AGENTS[0].label, "Claude Code");
        for (agent, label) in AGENTS.iter().zip(AGENT_LABELS) {
            assert_eq!(&agent.label, label);
            assert!(AgentKind::by_label(label).is_some());
        }
    }

    /// 実プロセス検証: claude-agent-acp を起動して initialize が返るか。
    /// `cargo test -p velq-acp -- --ignored --nocapture live_initialize`
    #[test]
    #[ignore = "claude-agent-acp（実プロセス）が要る"]
    fn live_initialize() {
        let cwd = std::env::current_dir().expect("cwd");
        let command = AgentCommand::claude(&cwd).expect("claude-agent-acp が PATH に無い");
        let result = futures::executor::block_on(connect_and_initialize(&command));
        println!("initialize 結果: {result:?}");
        assert!(result.is_ok(), "initialize が成功する: {result:?}");
    }

    /// 実プロセス検証: 1 プロンプトを送って応答テキストが返るか。
    /// `cargo test -p velq-acp -- --ignored --nocapture live_prompt`
    #[test]
    #[ignore = "claude-agent-acp（実プロセス）+ 認証が要る"]
    fn live_prompt() {
        let cwd = std::env::current_dir().expect("cwd");
        let command = AgentCommand::claude(&cwd).expect("claude-agent-acp が PATH に無い");
        let result =
            futures::executor::block_on(prompt_once(&command, "1+1は？ 数字だけで答えて。"));
        println!("prompt 応答: {result:?}");
        let text = result.expect("prompt が成功する");
        assert!(!text.trim().is_empty(), "応答が空でない");
    }

    /// 実プロセス検証（**実ファイル編集まで**）: 一時ディレクトリにファイルを置き、常駐セッションへ
    /// 「書き換えて」と頼み、権限を自動許可して、ディスク上のファイルが実際に変わることを確かめる。
    /// これが「AI Agent で実際に編集できる」ことの端から端までの証明。
    /// `cargo test -p velq-acp -- --ignored --nocapture live_edit`
    #[test]
    #[ignore = "claude-agent-acp（実プロセス）+ 認証が要る"]
    fn live_edit() {
        let dir = std::env::temp_dir().join(format!("velq-acp-live-edit-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("temp dir");
        let file = dir.join("note.md");
        std::fs::write(&file, "hello world\n").expect("seed file");

        let command = AgentCommand::claude(&dir).expect("claude-agent-acp が PATH に無い");
        let (prompt_tx, prompt_rx) = mpsc::unbounded();
        let (event_tx, mut event_rx) = mpsc::unbounded();
        prompt_tx
            .unbounded_send(SessionCommand::Prompt(
                "note.md の中身を、ちょうど「GOODBYE」の一語だけに書き換えて。確認は不要、そのまま実行して。"
                    .to_string(),
            ))
            .expect("send prompt");
        drop(prompt_tx); // このターンが終わったら run_session は終了する

        futures::executor::block_on(async move {
            let session = run_session(command, prompt_rx, event_tx);
            let drain = async move {
                while let Some(event) = event_rx.next().await {
                    match event {
                        AgentEvent::AgentChunk(text) => print!("{text}"),
                        AgentEvent::ToolStarted(title) => eprintln!("[tool] {title}"),
                        AgentEvent::PermissionRequest { title, respond, .. } => {
                            eprintln!("[permission] {title} → 自動許可");
                            respond.unbounded_send(0).ok(); // 先頭（許可）を選んで進める
                        }
                        AgentEvent::TurnEnded => eprintln!("\n[turn ended]"),
                        AgentEvent::Failed(error) => eprintln!("[failed] {error}"),
                        _ => {}
                    }
                }
            };
            let (session_result, ()) = futures::join!(session, drain);
            session_result.expect("session が正常終了する");
        });

        let after = std::fs::read_to_string(&file).expect("read back");
        let _ = std::fs::remove_dir_all(&dir);
        println!("\n--- 編集後の中身: {after:?}");
        assert!(
            after.to_uppercase().contains("GOODBYE"),
            "エージェントがファイルを実際に書き換えた（中身に GOODBYE を含む）: {after:?}"
        );
    }

    /// 診断: セッション開始時にエージェントが広告する権限モード・設定オプション（モデル/思考レベル）を
    /// 実際に何を送ってくるか覗く。UI のセレクタに出せる材料があるかの確認用（一時）。
    /// `cargo test -p velq-acp -- --ignored --nocapture live_capabilities`
    #[test]
    #[ignore = "claude-agent-acp（実プロセス）+ 認証が要る"]
    fn live_capabilities() {
        let dir = std::env::temp_dir().join(format!("velq-acp-live-caps-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("temp dir");
        let command = AgentCommand::claude(&dir).expect("claude-agent-acp が PATH に無い");
        let (prompt_tx, prompt_rx) = mpsc::unbounded();
        let (event_tx, mut event_rx) = mpsc::unbounded();
        // 何も prompt せず、開始時に流れる Modes / Configs / Usage だけ拾って即終了する。
        prompt_tx
            .unbounded_send(SessionCommand::Prompt("hi".to_string()))
            .expect("send");
        drop(prompt_tx);

        futures::executor::block_on(async move {
            let session = run_session(command, prompt_rx, event_tx);
            let drain = async move {
                while let Some(event) = event_rx.next().await {
                    match event {
                        AgentEvent::Modes { modes, current } => {
                            eprintln!("[MODES] current={current} 一覧={modes:?}");
                        }
                        AgentEvent::Configs(configs) => {
                            eprintln!("[CONFIGS] {configs:#?}");
                        }
                        AgentEvent::Usage { used, size } => {
                            eprintln!("[USAGE] used={used} size={size}");
                        }
                        AgentEvent::TurnEnded => eprintln!("[turn ended]"),
                        AgentEvent::Failed(error) => eprintln!("[failed] {error}"),
                        _ => {}
                    }
                }
            };
            let (session_result, ()) = futures::join!(session, drain);
            let _ = session_result;
        });
        let _ = std::fs::remove_dir_all(&dir);
    }
}
