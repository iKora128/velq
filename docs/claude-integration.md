# Velq × Claude 統合 実装仕様書

> 対象: 実装エージェント / Velq（Tauri v2 デスクトップドキュメントエディタ、`.velq` コンテナ形式）
> 目的: ユーザー自身の Claude を Velq 内で使えるようにする。**BYO（Bring Your Own）を大原則**とし、認証・課金は常に「ユーザー ↔ Anthropic」で完結させる。
> 最終更新: 2026-07（フラグ・規約は変動が速い。実装時に `claude --help` と公式ドキュメントで再確認すること）

---

## 0. 一行サマリ

Velq の Rust バックエンドが **ユーザーのローカル `claude` プロセスを spawn** し、NDJSON を webview にストリーミングする。認証は2モード（**A: ユーザーのサブスク / B: ユーザーの API キー**）。Velq は Anthropic アクセスを一切「提供」しない。これが唯一のコンプライアンス的に安全な形。

---

## 1. 前提: 3つの接続方式と Velq が取る方式

| 方式 | 実体 | 認証 | 規約上の扱い | Velq採用 |
|---|---|---|---|---|
| ① ユーザーのローカル `claude` CLI を subprocess で叩く | Anthropic 純正 CLI をユーザーが自分で実行 | ユーザーの**サブスク or 自前APIキー**（CLIが自己管理） | 「ユーザーが自分の公式CLIを回す」= サブスク利用OKの唯一の道。Zed のターミナル統合と同型 | ✅ **主軸** |
| ② Agent SDK (`@anthropic-ai/claude-agent-sdk`) を自アプリに組み込む | ライブラリとして agent loop を自プロセス内で実行 | **APIキー必須**（第三者プロダクトはサブスク不可） | Commercial Terms の管轄。SDK は native binary を optional dep で同梱 | △ APIキー路線の代替（Node sidecar 必要） |
| ③ Managed Agents / Messages API | Anthropic 側で agent+sandbox をホスト、REST | APIキー | Commercial Terms。本番向け | ✕ 今回スコープ外 |

**判断の核**: 境界は「wrap するか否か」ではなく **「誰のための、誰の認証か」**。
- 自分用ツールを wrap して**ユーザー本人が自分の認証で回す** → サブスクOK（方式①）。
- **他人にClaudeアクセスを提供する**（claude.ai ログイン提供 / トークン使い回し / Velqの鍵を配布）→ 一律アウト、APIキーの世界。

Velq はデスクトップアプリなので、最初から①の「良い側」に置ける。**方式①に統一し、A/B を認証モードとして切り替える**のが最小コスト。

---

## 2. アーキテクチャ（Tauri v2）

```
┌───────────────────────────── Velq (Tauri v2) ─────────────────────────────┐
│                                                                            │
│  webview (frontend)                    Rust backend                        │
│  ┌────────────────┐   invoke("ai_send")  ┌──────────────────────────────┐  │
│  │ Chat / diff UI │ ───────────────────► │ AgentSession                 │  │
│  │  (assistant text,                     │  - tokio::process::Command   │  │
│  │   tool calls,     ◄──── Channel<Event>│    spawns `claude` subprocess │  │
│  │   approvals)    │   (NDJSON events)    │  - stdin  ← NDJSON (user turn)│  │
│  └────────────────┘                      │  - stdout → parse → Channel   │  │
│                                          │  - kill on cancel / timeout   │  │
│                                          └───────────┬──────────────────┘  │
│                                                       │ spawn                │
│                                          ┌────────────▼──────────────────┐  │
│                                          │ Velq MCP server (in-proc/local)│  │ ← 構造化ドキュメント編集
│                                          │  velq_read_document / apply... │  │
│                                          └────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                                       │ subprocess
                                            ┌──────────▼───────────┐
                                            │ user's `claude` CLI  │ ↔ Anthropic
                                            │ (自己管理の認証)      │
                                            └──────────────────────┘
```

- **プロセス管理は Rust バックエンドで**行う（`tokio::process::Command`）。frontend の shell plugin allowlist を経由しないので制御が素直。
- **ストリーミングは `tauri::ipc::Channel<T>`** を使う（高頻度のトークンストリームに最適。`emit` でも可だが Channel 推奨）。
- **APIキーは OS キーチェーンに保存**（`keyring` crate か `tauri-plugin-stronghold`）。平文 config に置かない。

---

## 3. 認証モード

設定画面に排他ラジオを置く。ラベルは規約準拠（§7 参照）。

### Mode A — 「自分の Claude サブスクを使う（Claude Code 経由）」
- ユーザーの**インストール済み `claude` を PATH から検出**（`claude --version` / `which claude`）。無ければインストール導線（`npm i -g @anthropic-ai/claude-code` もしくは native installer）へリンク。
- `claude auth status`（exit 0 = ログイン済 / 1 = 未ログイン）で状態表示。未ログインなら「ターミナルで `claude` を実行してログインしてください」と案内する（**Velq 内でログインさせない**）。
- spawn 時に **`ANTHROPIC_API_KEY` を設定しない**。CLI が自身の認証（サブスク or ユーザー設定）を使う。
- **Velq はトークンに一切触れない・保存しない・転送しない。**

### Mode B — 「自分の Anthropic API キーを使う」
- ユーザーが Console で発行した `sk-ant-...` を Velq 設定に貼付 → キーチェーン保存。
- spawn 時に env `ANTHROPIC_API_KEY=<user key>` を設定して `claude` を起動。課金はユーザーの API アカウント、Commercial Terms 管轄。曖昧さゼロ。
- （代替: agent loop 不要の軽量アシスタントで良ければ Messages API を直叩きでも可。ただしコードパスが増えるので初期は subprocess に統一推奨。）

> **経済性の注意**: サブスク経由の agent 利用は API 比で大幅に補助されてきたが、Anthropic は 2026-06-15 に「第三者/SDK 経由の使用を上限付き・API単価の別枠クレジットへ切り出す」と発表 → 翌16日に一旦撤回、という動きをしている。**Mode A は「オプション」として提供し、有料機能の経済的土台にはしない**こと。塞がれても Velq が死なない作りにする。

---

## 4. `claude` CLI 呼び出し契約

### 基本形（双方向ストリーミング）
```bash
claude -p \
  --input-format stream-json \      # stdin から NDJSON でユーザーターンを送る
  --output-format stream-json \     # stdout に NDJSON でイベント
  --verbose \                       # stream-json に必須
  --include-partial-messages \      # トークン単位デルタが欲しい場合
  --permission-mode default \       # §5 参照。デスクトップ有人なので default/acceptEdits
  --permission-prompt-tool <velq_mcp_approval_tool> \  # 承認を Velq UI に流す
  --mcp-config <path-to-velq-mcp.json> \               # §6 のドキュメント編集ツール
  --allowedTools "Read,Grep,mcp__velq__*" \            # 生の Bash/Write は原則禁止
  --disallowedTools "Bash,Write" \
  --append-system-prompt "You are the AI assistant inside Velq, a document editor. Edit the open .velq document only through the provided Velq tools." \
  --max-turns 40 \
  --max-budget-usd 1.00
```

### 主要フラグ早見
| フラグ | 用途 |
|---|---|
| `-p, --print` | 非対話ワンショット（agent loop は同じ）。全ての土台 |
| `--output-format text\|json\|stream-json` | `json`=末尾に構造化1個 / `stream-json`=NDJSON逐次 |
| `--input-format text\|stream-json` | `stream-json` で多ターンをプログラム的に投入 |
| `--verbose` / `--include-partial-messages` | stream-json 必須 / トークンデルタ |
| `--permission-mode` | `default,acceptEdits,plan,auto,dontAsk,bypassPermissions` |
| `--allowedTools` / `--disallowedTools` | スコープ可（例 `Bash(git status)`） |
| `--permission-prompt-tool <tool>` | 承認プロンプトを MCP ツール（=Velq UI）へ委譲 |
| `--mcp-config <file>` | Velq の MCP サーバを読ませる |
| `--append-system-prompt` | Velq 固有の指示を注入（デフォルト挙動は保持） |
| `--session-id <uuid>` / `-r, --resume` / `-c, --continue` / `--fork-session` | セッション継続・分岐 |
| `--no-session-persistence` | print モードでセッションをディスクに書かない |
| `--max-turns` / `--max-budget-usd` | 暴走ガード |
| `--bare` | ローカルの hooks/MCP/CLAUDE.md 自動読込を無視（再現性重視。ただし Velq MCP は明示 `--mcp-config` で渡す前提） |
| `--model <alias>` / `--effort low\|max` | モデル・思考量 |

### `--output-format json` の結果フィールド
```json
{ "type": "result", "subtype": "success",
  "result": "...", "session_id": "uuid",
  "total_cost_usd": 0.0042, "num_turns": 2, "duration_ms": 3210 }
```
- **`subtype == "error"` を必ずチェック**。加えて**プロセスの非ゼロ exit** もエラー扱い（rate limit 枯渇・tool 失敗・stdin 10MB 超過などで非ゼロ）。
- `total_cost_usd` を UI にコスト表示として出す。
- `session_id` を保持して `--resume` で継続。

### 環境変数
- Mode B: `ANTHROPIC_API_KEY`
- 背景待ちの上限: `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`（デフォルト約10分、`0` で無制限）
- Bedrock/Vertex/Foundry 用フラグ（`CLAUDE_CODE_USE_BEDROCK=1` 等）は今回スコープ外。

---

## 5. 権限（permission）設計

デスクトップで**人が見ている**ので、CI 用の `bypassPermissions` / `--dangerously-skip-permissions` は**使わない**。

- 既定は `--permission-mode default`（未許可ツールは承認を要求）。慣れたら書き込み系だけ `acceptEdits` に緩める選択肢を設定に。
- **承認 UI**: `--permission-prompt-tool` に Velq の MCP ツールを指定。CLI が承認を要求すると、そのツールが呼ばれる → Velq がネイティブのダイアログを出す → allow/deny を返す。これで Zed 同様「hunk 単位で承認」に近い体験を作れる。
- **ツール表面を絞る**: `--allowedTools "Read,Grep,mcp__velq__*"` + `--disallowedTools "Bash,Write"`。ドキュメント変更は §6 の Velq ツール経由に一本化する。

---

## 6. 構造化ドキュメント編集（`.velq` 対応）

汎用エディタの肝。**agent の生ファイルツールを野放しにせず、Velq の操作を MCP サーバとして公開**し、それだけを許可する。

### Velq MCP ツール（例）
| ツール | 説明 |
|---|---|
| `velq_read_document` | 現在開いている `.velq` の構造/本文を返す（ブロック単位） |
| `velq_search` | ドキュメント内検索 |
| `velq_apply_patch` | ブロック/範囲への編集を適用（差分を返す） |
| `velq_insert_block` | 新規ブロック挿入 |
| `velq_request_approval` | `--permission-prompt-tool` 用。承認ダイアログを出して allow/deny |

- 実装は Velq 内蔵の軽量 MCP サーバ（stdio）でよい。`--mcp-config` の JSON で `command`/`args` を指定して spawn させる。
- 編集は必ず**差分を webview に出して**、`velq_apply_patch` の適用前に承認 or プレビュー。`.velq` コンテナの整合性は Velq 側で担保（agent にコンテナ内部フォーマットを触らせない）。
- cwd は対象ドキュメントのプロジェクトディレクトリにスコープ（万一 Read が使われても範囲を限定）。

---

## 7. コンプライアンス・ガードレール（MUST — 逸脱不可）

1. **claude.ai ログインを Velq の機能として提供しない。**「Log in with Claude」ボタンを作らない（事前承認なしでは第三者プロダクトに不可）。Mode A は**ユーザーが自分でターミナルからログイン済みの CLI** を前提にする。
2. **ユーザーのサブスク OAuth トークンを抽出・保存・送信・再利用しない。** Mode A は「ユーザー自身の公式 CLI を spawn するだけ」。（トークン抽出は 2026-01 に OpenClaw がブロックされた事例そのもの。）
3. **Velq 自身の Anthropic 認証情報を同梱してユーザーに使わせない。** 各ユーザーが自分の認証を持ち込む（A=自分のサブスク / B=自分の鍵）。
4. **ブランディング**: 機能名を "Claude Code" にしない / Claude Code の UI・ASCII を模倣しない。使ってよいのは "Claude Agent" / "{Velqの機能名} Powered by Claude" / Velq 独自名。**Velq は自身のブランドを保つ**。
5. **将来「AI 込みの有料ティア」を作るなら**、それは Velq が自社 API キーで提供する形 = Commercial Terms。この場合 **Usage Policy 遵守は Velq の責任**（医療等の high-risk 用途に使うなら人間の監督必須等の条項も Velq 側で担保）。**サブスク認証を有料ティアの土台にしない。**
6. 規約・課金は流動的（上記 6/15→撤回が実例）。**設計着手前に現行の Commercial Terms と Agent SDK legal ページを再確認**すること。

---

## 8. フェーズ分割

- **Phase 0 — 疎通スパイク**: Rust から `claude -p "hi" --output-format json` を spawn → 結果パース。CLI 検出 + `claude auth status`。Mode A/B 両方で疎通確認。
- **Phase 1 — MVP**: 双方向ストリーミング（`--input-format/--output-format stream-json --verbose`）→ assistant テキスト & tool call を Velq UI に描画。認証 A/B 切替、APIキーをキーチェーン保存。ツールは read-only + `velq_apply_patch` 最小。承認は `--permission-prompt-tool`。
- **Phase 2 — 構造化編集フル**: §6 の MCP ブリッジ完成、セッション継続（`--resume`/`--session-id`）、コスト表示（`total_cost_usd`）、ガード（`--max-turns`/`--max-budget-usd`）、diff プレビュー UI。
- **Phase 3（任意・将来）— ACP クライアント化**: Velq に **ACP クライアント**を実装し、Claude Code（`@zed-industries/claude-code-acp` アダプタ経由）に加え Gemini CLI / Codex など**複数 agent を1プロトコルでホスト**（Zed / JetBrains 型）。マルチ agent を狙うなら着手。lift は大きい。

---

## 9. 代替経路のメモ

- **Agent SDK（`@anthropic-ai/claude-agent-sdk`, TS/Python）**: `query({prompt, options})`。options に `allowedTools / permissionMode / hooks / mcpServers / agents / resume / canUseTool(承認callback) / settingSources`。native binary 同梱で CLI 別途不要。**ただし第三者プロダクトは APIキー認証必須**。Tauri で使うなら **Node/Python の sidecar** が要る → ランタイム同梱コスト。Velq が既に Node を積んでいないなら方式①（生 CLI subprocess）の方が軽い。
- **ACP**: エディタ⇄agent の共通プロトコル（agent 版 LSP）。将来のマルチ agent 対応・ロックイン回避に効く。Phase 3 で。

---

## 10. 実装タスクリスト（agent 向け）

- [ ] Rust: `AgentSession`（spawn / stdin NDJSON 送信 / stdout パース / cancel で kill / timeout ラップ）
- [ ] Rust: `tauri::ipc::Channel<Event>` でイベント配信。`Event` = `{assistant_delta | tool_call | tool_result | approval_request | result | error}`
- [ ] Rust: CLI 検出（`claude --version`）+ `claude auth status` ラッパ
- [ ] Rust: キーチェーン（`keyring`）で APIキー保存/取得
- [ ] Velq MCP サーバ（stdio）: `velq_read_document / velq_search / velq_apply_patch / velq_insert_block / velq_request_approval`
- [ ] `--mcp-config` 生成、`--permission-prompt-tool` 接続、`--allowedTools/--disallowedTools` でツール表面を制限
- [ ] frontend: チャット/ストリーム描画、承認ダイアログ、diff プレビュー、コスト表示、認証モード設定 UI（§7 準拠ラベル）
- [ ] セッション: `session_id` 保持 → `--resume`/`--fork-session`
- [ ] エラー処理: `subtype == error` & 非ゼロ exit を UI にフィードバック
- [ ] コンプライアンス確認: §7 の6項目をレビュー観点として PR チェックリスト化

---

## 11. 参照

- Claude Code Headless / プログラム実行: https://code.claude.com/docs/en/headless
- Claude Code CLI reference: https://code.claude.com/docs/en/cli-reference
- Agent SDK overview（認証・compliance・branding・license）: https://code.claude.com/docs/en/agent-sdk/overview
- Managed Agents: https://platform.claude.com/docs/en/managed-agents/overview
- Commercial Terms of Service: https://www.anthropic.com/legal/commercial-terms
- ACP（Zed）/ Claude Code アダプタ: https://zed.dev/docs/ai/external-agents ・ `@zed-industries/claude-code-acp`（npm, Apache-2.0）

> 注: フラグ名・挙動・課金・規約はバージョンと時期で変わる。実装時に `claude --help` と上記公式ページで最終確認すること。
