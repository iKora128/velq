# Velq 実装計画書（plan.md）

> Markdown / HTML ビューワー・エディタ + `.velq` パッケージング
> 対象: **Phase 1 — コア MVP（OSS / Apache-2.0）を「最後まで」完成させる**ための実装手順書
> 作成日: 2026-06-28 / ステータス: Implementation-ready v1
> 関連文書: [requirements.md](docs/requirements.md)（要件定義）, [ui-ux-spec.md](docs/ui-ux-spec.md)（UI/UX 設計・ベンチマーク）

---

## 0. このドキュメントの読み方（AI 実装者への指示）

このファイルは「AI が上から順に実行すれば Velq の Phase 1 を完成できる」手順書である。

**実装の進め方（厳守）:**

1. **§14 のマイルストーン M0 → M20 を順番に実装する。** 各マイルストーンは「目的 / 主な作業 / 受け入れ基準 / 検証」を持ち、**受け入れ基準を満たし検証が通るまで次に進まない。**
2. **各ステージ末（M1, M5, M9, M12, M15, M17）で必ず Tauri を起動し、`cargo tauri dev` でウィンドウが立ち上がることを目視＋ログで確認する**（§15.1）。起動しない状態でコードを積み上げない。
3. **UI を触る各マイルストーンの最後に §13 の「UI/UX 改善ループ」を 1〜2 周回す。** スクリーンショットを撮り、[ui-ux-spec.md](docs/ui-ux-spec.md) と有名アプリ（Obsidian / Finder / VS Code / Bear）の挙動に照らして差分を洗い出し、直す。
4. 不確実な技術判断は §2 と §16 に集約済み。**勝手にスタックを変えない**（特に DB は §2-D2 の判断に従う）。
5. コード規約・命名は既存の [karui プロジェクト](../karui/karui-app)（同じ作者の Tauri v2 アプリ）に合わせる。Tauri command の組み方、`commands/` モジュール分割、capabilities、Makefile リリースフローは karui を踏襲する。

**「完成（Definition of Done）」の定義は §1。** ここに全部チェックが付いたら Phase 1 完了。

---

## 1. ゴールと完成の定義（Definition of Done）

Velq Phase 1 は次がすべて満たされたとき完成とする。

### 1.1 機能要件（requirements.md 由来）

- [x] Vault（ルートフォルダ）を開き、ファイルツリー / 2 ペイン・ファイルリストで閲覧できる
- [x] Markdown を編集でき、ライブプレビュー（GFM 完全対応: テーブル・タスクリスト・脚注・コードブロック）が出る
- [x] HTML を閲覧・編集できる
- [x] ファイル CRUD（作成・リネーム・削除・移動）+ ドラッグ&ドロップができる
- [x] ファイル名のインクリメンタル検索ができる
- [x] 保存時に自動でバージョン（git commit）が作られ、**「保存履歴」UI**から過去版の閲覧・差分・復元ができる（ユーザーは git を一切意識しない）
- [x] 外部エディタでの変更をファイル監視で検知し、安全に反映できる
- [x] HTML を依存ファイル（CSS / JS / 画像 / CDN リソース）ごと `.velq` に**完全オフラインで動くよう**パッケージ化できる
- [x] `.velq` を**権限ゼロの隔離 WebView** で安全にプレビューできる（JS 実行可・FS/通信不可）
- [x] Markdown → `.velq` 変換ができる
- [x] エクスポート: Markdown / HTML / `.velq` / PDF
- [x] テーマ切替（ダーク / ライト）
- [x] JS ベースのプラグイン API が動き、例として KaTeX と Mermaid プラグインが動作する

### 1.2 品質・体験要件（この計画の肝）

- [x] **`cargo tauri dev` と `cargo tauri build` の両方でアプリが起動する**（macOS で検証必須、可能なら Win/Linux も）← dev は各 ★ ゲートで、build は M19 で `Velq.app` を生成→起動まで確認。Win/Linux は CI マトリクス
- [x] **ファイルマネージャの UX が Finder / Obsidian と比べて遜色ない**（[ui-ux-spec.md](docs/ui-ux-spec.md) §2 の必須項目をすべて実装）: Quick Look（Space プレビュー）、インライン rename、spring-loaded DnD、パンくず、常時可視の検索、プレビュー付きファイルリスト
- [x] **差分表示が GitHub 品質**（行＋単語レベル、色＋記号の冗長表現、非破壊復元）
- [x] 初回起動が「空の冷たい画面」にならない（Welcome ドキュメント seed・空状態の文言）
- [x] ダーク/ライト両対応、`prefers-reduced-motion` 対応、キーボード操作可能、主要テキストが WCAG AA ← コントラストは実測 AA（M18）
- [x] 大きな Vault（1 万ファイル想定）でツリー描画・検索が破綻しない（仮想スクロール）

### 1.3 リリース要件

- [x] Apache-2.0 LICENSE / CLA.md / README.md / プラグイン例外条項（LICENSE 末尾 PLUGIN EXCEPTION）
- [x] velq.sh ランディング（Astro + Cloudflare Pages、wrangler デプロイ）← `lp/` ビルド成功・`wrangler.toml`+`pnpm deploy` 用意済み。実デプロイは CF 認証＋ドメインが要る最終手動ステップ
- [x] 自動アップデータ（tauri-plugin-updater + GitHub Releases、karui と同方式）← 署名済み更新成果物まで生成確認（M19）
- [x] docs/ 一式（§17）← architecture / file-manager-ux / distribution を含め全項目

---

## 2. 重要な技術判断（Key Decisions）

> 全バージョンは 2026-06-28 に crates.io / npm で実在確認済み。**ここを勝手に変えない。**

### 2.1 確定スタック

| レイヤー | 採用 | バージョン | 備考 |
|---|---|---|---|
| フレームワーク | **Tauri v2** | `2.11.x` | マルチ WebView・capabilities による隔離が安定 |
| フロント言語/UI | **React 19 + TypeScript** | React `19.x`, TS `~5.8` | karui 踏襲。アイコンは `lucide-react` |
| ビルド | **Vite 8 + Rolldown** | Vite `8.x` | Rolldown が既定バンドラ。`build.target:"esnext"` |
| パッケージ管理 | **pnpm workspaces** | `10.x` | monorepo（apps/crates/plugins）に最適。karui は npm だが Velq は pnpm |
| エディタ | **CodeMirror 6**（à la carte） | §8.1 参照 | メタパッケージ `codemirror` は使わない |
| MD レンダリング | **comrak**（Rust） | `0.52` | GFM 完全対応・**デフォルト安全**（raw HTML/JS をエスケープ） |
| HTML 解析/書換 | **lol_html**（Rust） | `3.0` | リンク抽出＋ローカルパス書換を 1 パスで。補助に `scraper` も可 |
| ZIP | **zip**（Rust） | `8.6` | `.velq` コンテナ。`9.0.0-preX` は使わない |
| DB / 検索 | **Turso Database（旧 Limbo）** | crate `turso` | requirements §4 通り。Pure Rust・SQLite 互換・FTS/ベクトル内蔵・**WASM 対応（Web 版と同一エンジン）**。詳細 §2.2-D2 |
| バージョン管理 | **git2**（Rust） | `0.21`（`vendored-libgit2`） | system Git 不要 |
| Diff | **similar**（Rust） | `3.1`（`inline` feature） | 行＋単語レベル |
| ファイル監視 | **notify + notify-debouncer-full** | `8.2` / `0.7` | エディタの atomic save（rename）に強い debouncer |
| HTML サニタイズ | **ammonia**（Rust） | `4.1` | raw HTML を有効化した場合のみ |

### 2.2 要件からの逸脱・補強（理由つき）

**D1. フロントは React 19。** requirements.md は「Vite 8 + CodeMirror 6」のみ指定。CodeMirror 6 はフレームワーク非依存だが、作者の既存資産（karui = React 19）とエコシステム成熟度から React を採用。CM6 は薄い自前コンポーネントで包む（§8.3）。

**D2. DB は requirements 通り Turso Database（旧 Limbo）で確定。** 他エンジンには替えない。
選定理由（要件の設計意図）: **Pure Rust**（C 依存なしでクロスコンパイル/配布が綺麗）・**SQLite 互換**（ロックインなし）・**FTS とベクトル検索を内蔵**・**WASM 対応で Web 版（requirements §4）とデスクトップが同一エンジン**。検索・全文検索・将来のセマンティック検索を 1 エンジンで賄え、DB スタックが分裂しないのが最大の利点。
- 検索機能は要件通り**段階導入**: MVP = ファイル名一致 → 全文検索（Turso FTS）→ セマンティック（Turso ベクトル検索）。すべて Turso 上で完結。
- ファイル/バージョンのメタデータ・検索インデックスは Turso に保持。
- `SearchIndex` trait（§9.5）は**検索ドメインをストレージから疎結合にするための通常の設計**であって、DB を差し替えるための逃げ道ではない。バックエンドは Turso 一本。
- 運用注意（リスク §16-R1）: Turso は比較的新しく、FTS/ベクトル等の機能が時期により beta 挙動のことがある。**実装中に機能制約に当たっても勝手に別 DB へ替えず、必ずユーザーに相談して方針を決める。**

**D3. エディタは「2 ペイン分割」と「単一ペイン・ライブプレビュー」の両方を実装する。**
requirements.md §2.1 は「2 ペイン（ソース + プレビュー）」を指定。一方 UI/UX リサーチ（[ui-ux-spec.md](docs/ui-ux-spec.md) §3.1）は初心者には Obsidian/Typora 型の**単一ペイン・ライブプレビュー**が圧倒的に親切と結論。
→ **両方作る。** 表示モードを `Source / Split / Live` のトグルにする。**Split を先に実装（M3、低リスク・comrak が Rust で全部描画）→ Live を後で追加（M5、CM6 decorations）。** ライブプレビューの decoration 機構は**プラグイン API と同じ基盤**なので無駄にならない。既定モードは dogfooding 後に決定（暫定 Live）。

**D4. crate 構成は requirements の 3 つ + `velq-vcs` を追加。**
バージョン履歴ロジック（git2 + similar）は Tauri 非依存でヘッドレステストしたいので独立 crate にする。最終構成: `velq-core` / `velq-bundler` / `velq-search` / `velq-vcs`（§4.2）。Vault の FS CRUD は Tauri 依存が強いので `src-tauri/commands/vault.rs` に置く（将来 crate 化可）。

**D5. PDF エクスポートは WebView の print-to-PDF を使う。**
外部バイナリ（Chrome/wkhtmltopdf）依存は避ける。MVP は preview WebView の `window.print()`（ユーザーが「PDF で保存」）。ファストフォローで `with_webview` のプラットフォーム別 print-to-PDF（macOS: WKWebView `createPDF`）でワンクリック化。リスクは §16-R4。

---

## 3. アーキテクチャ全体像

```
┌────────────────────────────── Tauri アプリ（apps/desktop）──────────────────────────────┐
│                                                                                          │
│  ┌─ メインウィンドウ（trusted, label="main"）────────────────────────────────────────┐  │
│  │  React 19 + Vite 8 フロント                                                        │  │
│  │   ├ App シェル（サイドバー / ファイルリスト / エディタ / 右アウトライン / 状態バー）  │  │
│  │   ├ <CodeMirror> 薄ラッパ（EditorView を ref 保有、Compartment で再構成）          │  │
│  │   ├ プレビュー（iframe sandbox, comrak 出力）/ ライブプレビュー（CM6 decorations）  │  │
│  │   ├ コマンドパレット / Quick Look / バージョン履歴パネル / 差分（@codemirror/merge）│  │
│  │   └ プラグインランタイム（registry + Compartment）                                  │  │
│  │            │ invoke()                       ▲ events（fs変更・進捗）                 │  │
│  └────────────┼──────────────────────────────┼────────────────────────────────────────┘  │
│               ▼                               │                                            │
│  ┌─ Rust バックエンド（src-tauri）────────────┴──────────────────────────────────────┐  │
│  │  commands/  vault・render・search・vcs・velq・bundle・export・watch・plugins・app   │  │
│  │     │            │           │          │         │          │                      │  │
│  │  velq-core   velq-bundler  velq-search  velq-vcs  notify   (各 crate は headless)    │  │
│  │  (.velq/zip) (lol_html)    (Turso)      (git2+    (debounced)                         │  │
│  │                                          similar)                                     │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌─ .velq ビューワ WebView（untrusted, label="velq-viewer-*"）──────────────────────┐    │
│  │  どの capability にも属さない = IPC/FS/通信ゼロ。CSP は on_web_resource_request で │    │
│  │  default-src 'none'; connect-src 'none' を注入。JS は実行可（プロセス分離）。       │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**設計原則（requirements §9 準拠）:** ①シンプルに保つ（Notion 化しない）②`.velq` の普及最優先 ③オフラインファースト ④標準（ZIP/SQLite）の上に独自を載せる ⑤コアとプロプラはプラグイン API で疎結合。

**拡張性の担保:**
- 純粋ロジックは全部 crate（Tauri 非依存・`cargo test` 可能）。Tauri 層は薄い glue。
- 検索は `SearchIndex` trait、プラグインは `EditorPlugin` registry、エクスポートは `Exporter` trait で抽象化 → 追加は実装を 1 個足すだけ。
- IPC は型付き contract（§5）。フロント側に `src/ipc/` で薄いラッパを置き、コマンド名の散在を防ぐ。

---

## 4. リポジトリ構成 & ツールチェーン

### 4.1 ディレクトリ（requirements §7 を具体化）

```
velq/
├── package.json                 # pnpm workspace ルート（scripts: dev/build/lint/test）
├── pnpm-workspace.yaml          # packages: apps/*, plugins/*
├── Cargo.toml                   # Cargo workspace（members: apps/desktop/src-tauri, crates/*）
├── Makefile                     # dev/build/release/keygen（karui 踏襲）
├── rust-toolchain.toml          # 固定 toolchain
├── .gitignore / .editorconfig / biome.json（or eslint+prettier）
├── LICENSE                      # Apache-2.0
├── CLA.md
├── README.md
├── plan.md                      # 本書
├── apps/
│   ├── desktop/
│   │   ├── package.json         # React/Vite/CM6 依存
│   │   ├── vite.config.ts       # port 1420 固定（karui 踏襲）
│   │   ├── index.html
│   │   ├── src/                 # フロント（§8 の構成）
│   │   └── src-tauri/
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       ├── capabilities/    # default.json（main）+ viewer は capability に載せない
│   │       ├── icons/
│   │       └── src/
│   │           ├── main.rs / lib.rs
│   │           └── commands/    # vault.rs render.rs search.rs vcs.rs velq.rs bundle.rs export.rs watch.rs plugins.rs app.rs mod.rs
│   └── web/                     # Phase 2 以降（空ディレクトリ + README のみ）
├── crates/
│   ├── velq-core/               # .velq フォーマット（manifest, zip read/write, 型）
│   ├── velq-bundler/            # HTML リンク抽出 + リソース収集 + 書換（lol_html）
│   ├── velq-search/             # SearchIndex trait + filename impl + sqlite-fts impl
│   └── velq-vcs/                # git2 ラッパ（save→commit, history, restore）+ similar diff
├── plugins/
│   ├── katex/                   # 例: 数式（プラグイン API のリファレンス実装）
│   └── mermaid/                 # 例: ダイアグラム
├── lp/                          # velq.sh ランディング（Astro、karui の lp/ 踏襲）
└── docs/                        # §17
```

### 4.2 crate 責務

- **velq-core**: `Manifest` 型・`.velq` の ZIP 読み書き（`pack`/`unpack`/`read_manifest`）・内部構造の検証。他 crate / app が依存する土台。
- **velq-bundler**: HTML を入力に CSS/JS/img/srcset/font のリンクを抽出 → ローカル/CDN リソースを収集 → `assets/` に配置しリンクを相対パスに書換。`reqwest` で CDN 取得。`velq-core` に依存。
- **velq-search**: `trait SearchIndex { fn index(...); fn query(...) }` + `TursoIndex`（Turso backend）。MVP はファイル名一致、後で Turso FTS / ベクトルを同 backend に追加。
- **velq-vcs**: 「保存履歴」のドメイン API（`commit_save`, `list_versions`, `version_content`, `diff`, `restore`）。git2（vendored）+ similar。**git 用語を一切露出しない**型（`Version`, `Change`）を返す。

### 4.3 セットアップ手順（M0 で実行）

```bash
# ルートで
pnpm init -w                      # workspace
# pnpm-workspace.yaml, Cargo.toml(workspace), rust-toolchain.toml を作成
corepack enable && corepack prepare pnpm@10 --activate

# Tauri アプリ雛形（apps/desktop）
pnpm create tauri-app@latest desktop -- --template react-ts --manager pnpm
# → apps/ に移動、src-tauri を Vite 8 / Tauri 2.11 / CM6 へ更新

# crates
cargo new --lib crates/velq-core   # 以下同様に bundler/search/vcs
```

参照: karui の `vite.config.ts`（port 1420 strictPort）、`tauri.conf.json`（windows/security/bundle/updater）、`Makefile`（release フロー）、`capabilities/default.json` をテンプレとして流用する。

---

## 5. データモデル & IPC 契約（Tauri commands）

フロントは `src/ipc/*.ts` に型付きラッパを置き、ここで定義したコマンドだけを呼ぶ。命名は snake_case（Rust）/ camelCase 引数（karui 規約）。

| ドメイン | command | 引数 → 返り値（概略） |
|---|---|---|
| vault | `open_vault` | `{ path }` → `VaultInfo`（ルート確定・`.git` 初期化） |
| vault | `read_dir` | `{ path }` → `FileNode[]`（遅延展開用、1 階層） |
| vault | `read_file` | `{ path }` → `{ content, encoding, mtime }` |
| vault | `write_file` | `{ path, content }` → `{ mtime }`（保存。M11 以降は内部で commit） |
| vault | `create_file` / `create_folder` | `{ parentPath, name }` → `FileNode` |
| vault | `rename_path` / `move_path` | `{ from, to }` → `FileNode` |
| vault | `delete_path` | `{ path }` → `()`（OS のゴミ箱へ。trash crate） |
| vault | `reveal_in_os` | `{ path }` → `()`（Finder/Explorer で表示） |
| render | `render_markdown` | `{ md }` → `html`（comrak, sanitized, data-line 付与） |
| search | `search_filenames` | `{ query, scope }` → `FileNode[]` |
| search | `search_content` | `{ query, scope }` → `Hit[]`（M9.5+, Turso FTS） |
| vcs | `list_versions` | `{ path }` → `Version[]`（Today/Yesterday グルーピング前の生データ） |
| vcs | `version_content` | `{ path, versionId }` → `content` |
| vcs | `diff_versions` | `{ path, a, b }` → `Change[]`（行＋単語） |
| vcs | `restore_version` | `{ path, versionId }` → `Version`（**非破壊**: 新版を先頭に積む） |
| velq | `read_velq_manifest` | `{ path }` → `Manifest` |
| velq | `open_velq_viewer` | `{ path }` → `()`（隔離 WebView を spawn） |
| velq | `pack_velq` | `{ srcHtmlOrMd, out, options }` → `Manifest` |
| velq | `unpack_velq` | `{ path, outDir }` → `()`（.zip 同等の解凍） |
| bundle | `bundle_to_velq` | `{ input, out, fetchCdn }` → `BundleReport`（収集結果・失敗 URL） |
| export | `export_markdown` / `export_html` / `export_pdf` | `{ path, out }` → `()` |
| watch | `watch_vault` / `unwatch_vault` | `{ path }` → `()`（変更は event 配信） |
| plugins | `list_plugins` / `set_plugin_enabled` | … |
| app | `get_settings` / `set_settings` | `Settings`（テーマ・密度・既定表示モード等） |
| app | `get_opened_files` | `() → string[]`（ファイル関連付け起動、karui 方式） |

**event（Rust → フロント）:** `fs:changed`（外部変更）, `bundle:progress`, `version:created`, `velq-opened`(関連付け起動)。

主要型（serde）:
```rust
struct FileNode { path: String, name: String, kind: NodeKind /*File|Dir*/, ext: Option<String>,
                  size: u64, mtime: i64, git_status: GitDot /*None|New|Edited|Removed*/, has_children: bool }
struct Version { id: String, time: i64, label: Option<String> /*名前付き版*/, summary: String /*"3文追加,1文削除"*/ }
struct Change { kind: ChangeKind /*Equal|Insert|Delete|Replace*/, a_range: (u32,u32), b_range: (u32,u32),
                words: Vec<WordChange> }
struct Manifest { title: String, created: i64, updated: i64, source_url: Option<String>,
                  generator: String, tags: Vec<String>, custom: serde_json::Value }
```

---

## 6. `.velq` フォーマット仕様

> これは Velq のコア IP。M13 で `docs/velq-format.md` に正式版として切り出す（ここが原本）。

- **コンテナ**: ZIP（EPUB / .docx と同じ設計思想）。マジックナンバーは `PK\x03\x04` のまま → **リネームで `.zip` として解凍可能**（ロックインなし）。
- **拡張子**: `.velq` / MIME（独自）: `application/velq+zip`。
- **内部構造**:
  ```
  manifest.json          # メタデータ（§5 の Manifest 型）
  index.html             # メインドキュメント（書換済み・相対リンク）
  assets/
    css/  js/  img/  fonts/
  ```
- **manifest.json** に含める: タイトル / 作成・更新日時 / 元 URL（Web から作成時）/ 作成アプリ・バージョン（`generator`）/ AI 付与タグ（プロプラ連携時）/ `custom`（プラグイン拡張用・自由 JSON）。
- **生成ルール（velq-bundler）**:
  1. 入力 HTML を lol_html でストリーム解析。`<link href>` `<script src>` `<img src/srcset>` `@font-face`/`url()`（CSS 内）/ `<style>` 内参照を抽出。
  2. ローカル参照は実ファイルを収集。CDN 等の外部 URL は `reqwest` で取得（`fetchCdn` オプション、既定 ON）。Tailwind CDN・Chart.js 等も取り込み**完全オフライン**化。
  3. 取得物を `assets/{css,js,img,fonts}/` に**内容ハッシュ名**で配置（重複排除）。
  4. lol_html で全リンクを `assets/...` 相対パスへ書換。
  5. 失敗 URL は `BundleReport.failed` に積みフロントで警告（壊さず続行）。
- **Markdown → .velq**: comrak で HTML 化 → 同じ bundler パイプライン（埋め込み CSS は最小テーマ）。
- **セキュリティ**: §7。`.velq` 内 JS は隔離 WebView でのみ実行。

---

## 7. セキュリティモデル（`.velq` 閲覧時）

requirements §5 を Tauri 2.11 の実 API で実装する。

- **隔離 WebView を spawn**: `WebviewWindowBuilder::new(&app, "velq-viewer-<id>", WebviewUrl::App(...))`。**この label をどの capability の `windows`/`webviews` 配列にも入れない** → IPC・fs プラグイン・通信コマンドが構造的にゼロになる。
- **ストレージ分離**: `.incognito(true)` ＋必要なら専用 `.data_directory(...)`。メインの localStorage と完全分離。
- **CSP 注入**: `WebviewWindowBuilder::on_web_resource_request(|req, resp| ...)` で当 WebView のレスポンスに `default-src 'self' data:; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` を設定（`.velq` はオフライン前提なので `connect-src 'none'`）。
- **fs スコープ**: `tauri-plugin-fs` の allow/deny glob は**メイン window の capability のみ**に付与。viewer には一切付けない。
- **暴走 JS**: WebView は別プロセス。固まっても本体は無事 → WebView を kill して復帰。

| 脅威 | 対策 | リスク |
|---|---|---|
| FS アクセス | viewer に fs 権限を与えない（capability 非所属） | ゼロ |
| 外部送信 | CSP `connect-src 'none'` | ゼロ |
| 本体干渉 | 隔離 WebView（別 origin/別 storage/別プロセス） | ゼロ |
| CPU 枯渇 | 別プロセス、kill で復帰 | 低 |

**MD プレビュー（メイン側）は別扱い**: comrak はデフォルト安全（raw HTML/JS をエスケープ）。`<iframe sandbox="allow-same-origin">`（`allow-scripts` を**付けない**）に描画し、万一のすり抜けも実行不可にする。raw HTML 通過を許可する設定にした場合のみ ammonia を通す。

---

## 8. フロントエンド設計（CodeMirror 6 / React 19）

### 8.1 パッケージ（à la carte・正確版）

```jsonc
// CM6 コア（codemirror メタパッケージは使わない）
"@codemirror/state":"6.7.x","@codemirror/view":"6.43.x","@codemirror/commands":"6.10.x",
"@codemirror/language":"6.12.x","@codemirror/lang-markdown":"6.5.x","@codemirror/lang-html":"6.4.x",
"@codemirror/search":"6.7.x","@codemirror/autocomplete":"6.20.x","@codemirror/merge":"6.12.x",
"@codemirror/theme-one-dark":"6.1.x","@lezer/common":"1.5.x","@lezer/highlight":"1.2.x","@lezer/markdown":"1.6.x",
// 任意
"@replit/codemirror-vim":"6.3.x",
// プラグイン例
"katex":"0.17.x","mermaid":"11.x",
// Tauri / UI
"@tauri-apps/api":"2.11.x","lucide-react":"latest"
```

> **重大注意**: `@codemirror/state`（と `@lezer/common`）は**シングルトン**。二重バンドルされると `instanceof` 判定が静かに壊れ「decoration が効かない」になる。バージョンを揃え `pnpm dedupe` で 1 コピーに固定する。

### 8.2 ディレクトリ（apps/desktop/src）

```
src/
├── main.tsx / App.tsx
├── ipc/                 # Tauri command 型付きラッパ（vault.ts render.ts vcs.ts velq.ts ...）
├── store/               # 状態（zustand 推奨: vault・tabs・settings・history）
├── shell/               # AppShell, Sidebar, FileList, StatusBar, Breadcrumb, TabBar, OutlineRail
├── editor/              # CodeMirror.tsx（薄ラッパ）, compartments.ts, livePreview.ts, theme.ts, scrollSync.ts
├── preview/             # PreviewPane.tsx（iframe sandbox）
├── filemanager/         # Tree.tsx, ColumnView.tsx, QuickLook.tsx, contextMenu.ts, dnd.ts, rename.ts
├── history/             # HistoryPanel.tsx, DiffView.tsx（@codemirror/merge）, Timeline.tsx
├── command/             # CommandPalette.tsx, actions.ts（registry）, shortcuts.ts
├── plugins/             # runtime.ts（registry+Compartment）, api.ts（公開型）
├── velq/                # VelqViewer 連携（open_velq_viewer 呼び出し）
├── design/              # tokens.css（§ ui-ux-spec 6）, themes.css, motion.css
└── onboarding/          # FirstRun.tsx, EmptyState.tsx, Welcome doc seed
```

状態管理は **zustand**（軽量・React 19 互換）。エディタ本文は CM が所有（uncontrolled）、store は「現在値・dirty・タブ」だけ持つ。

### 8.3 CodeMirror 薄ラッパの規約（最重要・崩すと破綻）

- React は**コンテナ div とアプリ状態**だけ持つ。CM が**エディタ内部を全所有**。
- `EditorView` は `useEffect(()=>{...},[])`（マウント時 1 回）で生成し cleanup で `destroy()`。React 19 StrictMode の mount→unmount→remount に対し cleanup が完全破棄するので対称＝安全。
- `onChange` は ref 経由で最新化（updateListener を stale にしない・view を作り直さない）。
- 外部変更の流し込みは**文字列比較ガード付き** `dispatch`（dispatch→updateListener→onChange→setState→dispatch のループ防止）。
- 実行時に切替えるもの（theme / language / vim / 各プラグイン）は**全部 `Compartment`**。`view.dispatch({effects: compartment.reconfigure(...)})` で差し替え、**view を再生成しない**。theme と highlightStyle は同一 compartment に入れる。

（具体コードは research 済み。実装時はこの規約に従って `editor/CodeMirror.tsx` を ~60 行で書く。）

### 8.4 ライブプレビュー（D3）

- **Split（M3）**: 左 CM6 ソース / 右 comrak 出力（iframe）。スクロール同期は**行アンカー方式**（comrak 出力のブロック要素に `data-line` を付与し、ビューポートを挟む 2 要素間で補間）。比率方式は画像/表/コードで激しくズレるので不可。
- **Live（M5）**: 単一ペインで `ViewPlugin` が syntax tree を走査し decoration を出す。`Decoration.replace` でマーカー（`**`,`#`）を隠し、`Decoration.mark` で見た目を整え、画像/数式/Mermaid は widget 化。**アクティブ行（選択が交差するノード）はマーカーを表示**して編集可能に。`docChanged || viewportChanged || selectionSet` で再構築（viewport スコープで増分）。
- この decoration 機構が**プラグイン API（§11）と同一基盤**。

### 8.5 テーマ & タイポグラフィ

- ダーク/ライトは `themeC` compartment で切替（[ui-ux-spec.md](docs/ui-ux-spec.md) §6 のトークンを `design/tokens.css` に実装）。
- 本文は可変フォント、計測幅 ~66ch・行高 1.6、行番号非表示。フォントは `.cm-scroller` に当てる（`.cm-content` だけだと字幅計測がズレる）。`EditorView.lineWrapping` 併用。

---

## 9. ファイルマネージャ設計（最重要・差別化点）

> 詳細パターンと根拠は [ui-ux-spec.md](docs/ui-ux-spec.md) §2。ここは実装に落とす。M13 で `docs/file-manager-ux.md` に深掘り版を書く。

### 9.1 北極星

**「Finder 並みに分かりやすく、でも書く人のための」。名詞は 2 つだけ＝フォルダとファイル。ファイルは絶対にコンテナにしない**（Notion の「ページの中のページ」混乱を回避）。ツリーは**本物のディスク**（アプリ内 rename = ディスク rename、「Finder で表示」が効く）。

### 9.2 表示モード（3 種・Vault ごとに記憶）

1. **2 ペイン（フォルダツリー + プレビュー付きファイルリスト）= 既定**（Apple Notes / Bear 型、普通の人が知っている）。本文 1〜3 行のスニペットを表示。
2. **カラムビュー（Miller columns）= パワートグル**（Finder。最強の「今どこ」、矢印キーが 1:1 対応）。
3. **プレーンツリー = オプション**（VS Code/Obsidian 型）。

### 9.3 必須インタラクション（ここを全部やる）

- **インライン rename**: 選択 + `Return`（or `F2`、ゆっくり 2 度クリック）。**base name 先頭選択・拡張子保護**、`Return`/`Tab` 確定・`Esc` 取消。
- **作成即命名**（モーダルなし）: `Cmd+N` 新規ドキュメント / `Cmd+Shift+N` 新規フォルダ → そのまま名前入力。
- **spring-loaded DnD**: ドラッグ中に折りたたみフォルダへホバー→自動展開、ドロップ先ハイライト、`Cmd`/`Option` でコピー（`+` バッジ）、ドロップ前にコピー/移動を予告。
- **手動並べ替え**: sidecar メタdata（`.velq-meta` 等）に順序を保存。**ファイル名に `01-` を付けない**。
- **Quick Look（Space）**: 選択して Space → MD/HTML/.velq のレンダリング済みフローティングプレビュー、`Space`/`Esc` で閉じ、`←/→` で複数移動。**最重要パターン**。
- **コンテキストメニュー**（動詞先頭・短く）: Open / Quick Look / Rename / Duplicate / Move to… / Add tag▸ / Version history / Reveal in Finder / Export▸ / Move to Trash。
- **git 状態を平易な色ドットに翻訳**（`M`/`U`/`A` を出さない）: 緑=新規 / 琥珀=編集（未保存ポイント）/ 赤=削除。差分パレットと一致。

### 9.4 検索 & 「今どこ」

- **検索ボックスは常時上部固定**（Notion の検索隠しを回避）。
- **既定スコープ=現在フォルダ**、「すべてを検索」は明示オプト（Finder のスコープ漏れ回避）。
- **常時の位置キュー**: パンくず（編集ペイン上部、各クラムはクリック/ドロップ/兄弟ドロップダウン）+ ツリーの選択ハイライト + 状態バーの `📍 path`。
- **省略しない**（「あと 5 件」を出さない）、切り詰めはツールチップ。

### 9.5 検索の抽象化（D2）

```rust
trait SearchIndex {
    fn reindex(&mut self, root: &Path);
    fn query_filenames(&self, q: &str, scope: &Path) -> Vec<FileNode>;
    fn query_content(&self, q: &str, scope: &Path) -> Vec<Hit>; // MVP は未実装でも可
}
struct TursoIndex; // Turso backend 一本。MVP=ファイル名一致 → M9.5+ で FTS → 将来ベクトル
```

### 9.6 大規模 Vault

ツリー/リストは**仮想スクロール**（`@tanstack/react-virtual`）。`read_dir` は 1 階層遅延展開。`notify` は debounce（atomic save の rename churn を吸収）。

---

## 10. バージョン履歴 & 差分設計

> 裏は git2 自動コミット。**ユーザーに git を一切見せない。** 禁止語: commit / branch / HEAD / repository / diff / merge / push / pull（[ui-ux-spec.md](docs/ui-ux-spec.md) §4）。

- **保存=自動バージョン**: `write_file` 内で velq-vcs が commit（メッセージ=タイムスタンプ＋変更ファイル名を自動生成）。テキストのみ追跡、バイナリ（画像/動画/フォント）は `.gitignore` で除外。
- **連続オートセーブはセッションに集約**（~1 セッション 1 エントリ、▸ で分単位展開）。スナップショットは「アクティブ編集 ~10 分ごと + 停止後 + 明示保存時」。
- **タイムライン UI**: 逆時系列、`Today / Yesterday / 日付` でグルーピング。版に名前を付けられる + 「名前付きのみ表示」。
- **差分**: 既定は**インライン/ユニファイド・全幅・単語レベル**（散文向き）。比較モードで side-by-side。色は GitHub Primer の正確な hex（追加 `#dafbe1`/削除 `#ffebe9` 等、ダークは半透明オーバーレイ）。**色だけに頼らない**（追加 `+`、削除 `−`＋取消線、色覚配慮パレット）。
- **エディタ gutter の変更バー**: 最終保存版との差を緑/琥珀/赤で表示、クリックで inline peek + 「この変更だけ戻す」。`@codemirror/merge` の `unifiedMergeView` で実現。
- **復元は非破壊**: 復元すると**新版が先頭に積まれる**（後の版を消さない）。プレビュー（read-only + 現在との差分）→ プレビュー内の「この版に復元」→ Undo トースト。
- Rust の `similar`（履歴一覧/サマリ/FTS 用の headless 差分）と `@codemirror/merge`（UI 描画）を併用。git を普段使う人には `.git` がそのまま見え、`git log` も push も可能（requirements §2.4）。

---

## 11. プラグイン API 設計

requirements §2.6 を CM6 の拡張機構で実装。プラグインは Apache-2.0 に縛られない（作者の自由・例外条項）。

- **公開型**（`src/plugins/api.ts`）:
  ```ts
  interface EditorPlugin {
    id: string;
    extension: Extension;                              // ViewPlugin/decoration 等（CM6 の共通通貨）
    commands?: Record<string, (v: EditorView)=>boolean>;
    panels?: ((v: EditorView)=>Panel)[];              // サイドバーパネル（showPanel）
    renderers?: { lang: string; render(code:string):HTMLElement }[]; // カスタムレンダラ
  }
  ```
- **registry**（`runtime.ts`）: 各プラグインを**専用 Compartment**に入れ、実行時 ON/OFF。
- **拡張点**: カスタムレンダラ / コマンド（パレットに自動登録）/ サイドバーパネル / decoration / keymap。
- **リファレンス実装**: `plugins/katex`（`$...$`/`$$...$$` を widget でレンダ、`eq()` で再描画抑制、選択時は raw 表示）、`plugins/mermaid`（fenced code `mermaid` を block widget、async レンダはプレースホルダ→SVG 差替、`estimatedHeight` 設定）。
- **マニフェスト**: `plugin.json`（id/name/version/entry/permissions）。MVP はローカル `plugins/` から読み込み。マーケットプレイスは Phase 3（launch では作らない＝Obsidian の選択麻痺を避け、curate）。
- **疎結合**: プロプラ（SaaS/AI）はこの API か HTTP/Tauri command 経由で接続し AGPL 的伝播を回避（requirements §6）。

---

## 12. エクスポート設計

`trait Exporter { fn export(doc, out) }` で抽象化。

- **Markdown**: そのまま / 正規化出力。
- **HTML**: comrak 出力 + テーマ CSS インライン（単体で開ける）。
- **.velq**: §6 の bundler。
- **PDF（D5）**: MVP=プレビュー WebView の `window.print()`（OS の「PDF で保存」）。ファストフォロー=`with_webview` でプラットフォーム別 print-to-PDF（macOS WKWebView `createPDF`）でワンクリック。リスク §16-R4。

---

## 13. UI/UX 改善ループ（プロセス定義）

> ユーザー要望の核心。**UI を触る各マイルストーンの最後に必ず実行する。**

### 13.1 ループ手順（1 周）

1. **状態を作る**: `pnpm --filter desktop dev`（Vite, http://localhost:1420）でフロントをブラウザでも開けるようにする（Tauri 固有 API はスタブ可）。並行して `cargo tauri dev` で実アプリも起動。
2. **スクリーンショットを撮る**: Playwright（`pnpm dlx playwright`）で主要画面・状態をキャプチャ → `docs/screenshots/<milestone>/` に保存。状態例: 空 Vault / 通常ツリー / ファイルリスト+プレビュー / エディタ Split / エディタ Live / Quick Look / コマンドパレット / バージョン履歴 / 差分 / ダーク&ライト。
3. **自己評価（画像を Read して判定）**: 撮った PNG を読み込み、[ui-ux-spec.md](docs/ui-ux-spec.md) の該当節と照合。観点: 余白・階層（weight/whitespace で表現できているか）・コントラスト（WCAG）・整列・密度・空状態・モーション・「今どこ」の明確さ。
4. **ベンチマーク比較**: 同じ画面を Obsidian / Finder / VS Code / Bear で（必要なら WebFetch で公式スクショ/ドキュメントを参照し）比較。**「この画面、Finder/Obsidian より分かりやすいか？」を毎回問う。**
5. **差分をリスト化** → 優先度付け → 直す。`docs/ui-ux-log.md` に「before/after・何を・なぜ」を記録。
6. 重要画面は 2 周目を回す。

### 13.2 重点（ユーザー明示）

- **ファイルマネージャを最優先で作り込む**（§9 の必須項目が「全部」入っているか毎回チェック）。
- **差分（バージョン履歴）の体験**を GitHub 品質まで磨く。
- 洗練度の判断は感覚でなく [ui-ux-spec.md](docs/ui-ux-spec.md) のトークン/原則に照らして客観化する。

---

## 14. 実装マイルストーン（M0 → M20）

> 各 M は「目的 / 主な作業 / 受け入れ基準 ✅ / 検証 🔍」。✅ と 🔍 が通るまで次へ進まない。

### ステージ 0 — 基盤と「起動する」

**M0 — monorepo 雛形**
- 目的: ビルド可能な空の monorepo。
- 作業: §4.3 の手順。pnpm workspace / Cargo workspace / rust-toolchain / Makefile（karui 流用）/ Apache-2.0 LICENSE / CLA.md / README.md / `.gitignore`（target, node_modules, dist, `*.velq` の作業物）/ Biome（or eslint+prettier）。`git init`。
- ✅: `pnpm install` と `cargo metadata` が成功。`crates/*` が空 lib としてビルドできる。
- 🔍: `cargo build` 成功、`pnpm -r lint` 成功。

**M1 — Tauri アプリが起動する（★ステージ検証）**
- 目的: 空の 3 ペインシェルが立ち上がる。
- 作業: `apps/desktop` を Tauri 2.11 + React 19 + Vite 8 へ。`vite.config.ts`（port 1420 strictPort, host, ignore src-tauri）、`tauri.conf.json`（karui ベース: productName "Velq", identifier `sh.velq.app`, window 1100x760, security.csp 設定, assetProtocol）、`capabilities/default.json`（core/opener/dialog/fs/updater + fs scope）。`design/tokens.css` で配色トークン。`AppShell`（サイドバー/リスト/エディタ/状態バーの枠だけ）。`lib.rs` に最小 command 1 個（`get_settings`）。
- ✅: `cargo tauri dev` でウィンドウ表示、3 ペインの枠とダーク/ライトが見える。コンソールに Rust/JS エラーなし。
- 🔍: **§15.1 の起動チェックを実行**（dev と build 両方）。スクショを `docs/screenshots/m1/` に保存。

### ステージ 1 — エディタ & プレビュー

**M2 — CodeMirror 6 エディタ**
- 目的: Markdown を快適に編集できる。
- 作業: §8.3 規約で `editor/CodeMirror.tsx`。`compartments.ts`（theme/lang/vim）、`@codemirror/lang-markdown`、検索（`@codemirror/search`）、行折返し、§8.5 タイポグラフィ、one-dark + 自前ライトテーマ、テーマ切替を設定に接続。Vim は任意トグル。
- ✅: 入力・取消/やり直し・検索・テーマ切替が動く。日本語入力（IME）が壊れない。
- 🔍: 1000 行貼り付けでもスクロール/入力が滑らか。

**M3 — Markdown → HTML プレビュー（Split）**
- 目的: requirements の 2 ペインを満たす。
- 作業: `commands/render.rs` の `render_markdown`（comrak 0.52, extension 全部 ON, `tagfilter` ON, `unsafe_` OFF, ブロックに `data-line` 付与）。フロント `preview/PreviewPane.tsx`（`<iframe sandbox="allow-same-origin">`, srcdoc）。`editor/scrollSync.ts`（行アンカー同期）。debounced invoke（150–300ms, seq ガードで out-of-order 破棄）。表示モードトグル `Source/Split`。
- ✅: GFM（表・タスクリスト・脚注・コード）が正しく表示。スクロール同期が自然。プレビュー内で JS が実行されない。
- 🔍: §13 ループ 1 周（Split 画面）。

**M4 — HTML 編集 & 表示**
- 目的: HTML ファイルを開いて編集/プレビューできる。
- 作業: `@codemirror/lang-html` を langC で切替（拡張子で判定）。HTML は Split を既定（raw が見たい用途）。プレビューはサニタイズ方針に従い iframe へ。
- ✅: `.html` を開くと HTML ハイライト + プレビュー。`.md` と自動で切替わる。
- 🔍: 不正 HTML でもクラッシュしない。

**M5 — ライブプレビュー（Live, 単一ペイン）★ステージ検証**
- 目的: Obsidian/Typora 型の WYSIWYG 体験（D3）。
- 作業: `editor/livePreview.ts`（§8.4）。マーカー隠し/装飾/widget、アクティブ行は raw 表示、viewport 増分。表示モードに `Live` 追加。`auto-format`（`* `→bullet, `# `→H1, `1. `→番号）。選択時ミニツールバー（bold/italic/heading/link）。
- ✅: `**bold**` が入力途中で太字化、見出し/リスト/引用/コードが装飾、カーソルが入ると raw に戻る。ファイルはプレーン Markdown のまま保存される。
- 🔍: **Tauri 起動再確認**（§15.1）。§13 ループ 2 周（Live と Split を Obsidian と比較）。

### ステージ 2 — ファイルマネージャ（差別化点）

**M6 — Vault & ツリー（読み取り）**
- 目的: フォルダを開いてツリーから開ける。
- 作業: `commands/vault.rs`（`open_vault`：ルート確定＋`git init`、`read_dir`：1 階層、`read_file`）。`filemanager/Tree.tsx`（仮想スクロール、遅延展開、carets/indent guides、ファイルアイコン）。タブ（`shell/TabBar.tsx`、プレビュータブ＝単クリックは italic 一時スロット、ダブルクリック/編集で確定）。
- ✅: Vault 選択 → ツリー表示 → クリックでエディタに開く → タブ管理。
- 🔍: 1 万ファイルの Vault で描画が破綻しない。

**M7 — ファイル CRUD & DnD**
- 目的: ファイル操作が一通りできる。
- 作業: `create_file/create_folder/rename_path/move_path/delete_path(→trash)/reveal_in_os`。`rename.ts`（インライン・base name 選択・拡張子保護）。`dnd.ts`（spring-loaded・ドロップ先ハイライト・コピー/移動予告）。`contextMenu.ts`（§9.3 の項目）。作成即命名（`Cmd+N`/`Cmd+Shift+N`）。
- ✅: 作成/リネーム/削除/移動/DnD/右クリックメニューが全部動く。削除は OS ゴミ箱。
- 🔍: rename で拡張子が壊れない。DnD で意図しないコピー/移動が起きない。

**M8 — プレビュー付きファイルリスト & Quick Look & パンくず**
- 目的: 「分かりやすさ」の本丸。
- 作業: `filemanager/FileList.tsx`（2 ペイン既定・本文スニペット）、`ColumnView.tsx`（Miller・パワートグル）、`QuickLook.tsx`（Space でレンダリング済みプレビュー、`←/→`）、`shell/Breadcrumb.tsx`（クリック/ドロップ/兄弟ドロップダウン）、`shell/StatusBar.tsx`（`📍path`・word count・✓Saved）。Favorites/Tags/Smart views（All/Recent/Drafts/Trash）。git 色ドット。
- ✅: §9.3 の必須インタラクションが**全部**入っている。Space で何でも安全にプレビュー。常に「今どこ」が分かる。
- 🔍: §13 ループ 2 周（**Finder/Obsidian と直接比較**、`docs/file-manager-ux.md` 草案を書く）。

**M9 — 検索 & コマンドパレット ★ステージ検証**
- 目的: キーボードファースト。
- 作業: `search_filenames`（`TursoIndex`: Vault 開始時に Turso へファイルメタデータを索引し名前で照会）+ 上部固定検索（既定スコープ=現在フォルダ）。`command/CommandPalette.tsx`（`Cmd+K`/`Cmd+Shift+P`、prefix `>`=コマンド `@`=見出し `:NN`=行）、Quick Open（`Cmd+P`、空=最近、Enter で get-or-create）。`shortcuts.ts`（[ui-ux-spec.md](docs/ui-ux-spec.md) §5.3 の表を実装、`Mod` 抽象で OS 別化、各行にショートカット表示）。`?` チートシート。
- ✅: パレットで全コマンド到達、ファイル即時オープン、見出しジャンプ、ショートカットが menu/context/palette の 3 箇所に出る。
- 🔍: **Tauri 起動再確認**。§13 ループ。

**M10 — ファイル監視**
- 目的: 外部変更の安全反映。
- 作業: `commands/watch.rs`（notify + notify-debouncer-full）。`fs:changed` event → フロントで未編集なら自動リロード、編集中なら衝突バナー（「外部で変更されました。再読込/自分の版を保持」）。
- ✅: 外部エディタ保存を検知して反映。編集中はデータ消失なし。
- 🔍: atomic save（rename 方式エディタ）で誤検知/取りこぼしがない。

### ステージ 3 — バージョン履歴 & 差分

**M11 — 自動コミット & 履歴バックエンド**
- 目的: 保存=履歴。
- 作業: `velq-vcs`（git2 vendored: `commit_save/list_versions/version_content/restore`、`.gitignore` 自動生成でバイナリ除外、メッセージ自動生成）。`write_file` を velq-vcs 経由に。セッション集約ロジック。`similar` で `diff`。**全部 headless テスト**（`cargo test -p velq-vcs`: 保存→版作成→差分→復元の往復）。
- ✅: 保存ごとに版ができ、一覧/取得/差分/復元が API で動く。`.git` が普通の git として有効。
- 🔍: `cargo test -p velq-vcs` 緑。`git log` でコミットが見える。

**M12 — バージョン履歴 UI & 差分 ★ステージ検証**
- 目的: 非 git ユーザー向けの「保存履歴」。
- 作業: `history/HistoryPanel.tsx`（↺ アイコン→右パネル、Today/Yesterday グルーピング、セッション展開、版に名前、名前付きのみ表示）。`history/DiffView.tsx`（`@codemirror/merge`: 既定インライン単語レベル＋比較で side-by-side、Primer 色、色＋記号冗長、色覚配慮）。gutter 変更バー（`unifiedMergeView`、inline peek「この変更だけ戻す」）。非破壊復元（プレビュー→復元→Undo トースト）。状態バーの「✓Saved/Last edited」をクリック導線に。**禁止語チェック**。
- ✅: タイムライン・差分・gutter・非破壊復元が動き、UI に git 用語が一切出ない。
- 🔍: **Tauri 起動再確認**。§13 ループ 2 周（**GitHub の差分と比較**）。差分の往復を手動検証（編集→保存→履歴→差分確認→復元→Undo）。

### ステージ 4 — `.velq` フォーマット & バンドル

**M13 — velq-core & 隔離ビューワ**
- 目的: `.velq` を安全に開ける。
- 作業: `velq-core`（Manifest, zip 8.6 で pack/unpack/read_manifest, 構造検証, headless テスト）。`commands/velq.rs`（`read_velq_manifest/open_velq_viewer/unpack_velq`）。`open_velq_viewer` は §7 の隔離 WebView を spawn（capability 非所属・CSP 注入・incognito）。`docs/velq-format.md` を §6 から正式化。
- ✅: 既存 `.velq`（手で作った検証用）を開くと隔離 WebView で表示、JS は動くが fs/通信は不可、`.zip` リネームで解凍可。
- 🔍: `cargo test -p velq-core` 緑。viewer から `invoke`/fetch が**失敗する**ことを確認（隔離の証明）。

**M14 — velq-bundler（依存収集）**
- 目的: HTML を完全オフライン `.velq` 化。
- 作業: `velq-bundler`（lol_html 3.0 で抽出＋書換 1 パス、reqwest で CDN 取得、内容ハッシュ名で重複排除、`BundleReport.failed`）。`bundle_to_velq` command + 進捗 event。Markdown→.velq（comrak→最小テーマ→同パイプライン）。
- ✅: Tailwind CDN / Chart.js を使う HTML を `.velq` 化 → ネットワーク切断でも完全表示。失敗 URL は警告のみで壊れない。
- 🔍: `cargo test -p velq-bundler`（ローカル fixture でリンク抽出/書換）。オフライン実機確認。

**M15 — .velq エクスポート & ビューワ堅牢化 ★ステージ検証**
- 目的: 生成〜閲覧の一気通貫。
- 作業: エクスポートメニューに `.velq`。複数 viewer 同時起動・kill 復帰。大きな `.velq` のストリーム展開。CSP/権限の最終確認。
- ✅: アプリ内で HTML/MD → `.velq` 生成 → ダブルクリック相当で隔離閲覧まで通る。
- 🔍: **Tauri 起動再確認**。§13 ループ。

### ステージ 5 — エクスポート & プラグイン

**M16 — エクスポート（MD/HTML/PDF）**
- 作業: `commands/export.rs`（`Exporter` trait）。HTML=テーマ inline 単体可。PDF=§12（MVP print→ファストフォロー native）。
- ✅: 4 形式すべて出力。PDF が見られる。
- 🔍: 各形式を開いて目視。

**M17 — プラグイン API & 例 ★ステージ検証**
- 目的: 拡張性の実証。
- 作業: §11 の registry/api。`plugins/katex` と `plugins/mermaid` を**この API だけで**実装（コアに数式/図の知識を入れない）。`list_plugins/set_plugin_enabled`。`docs/plugin-api.md`。
- ✅: KaTeX/Mermaid がプラグインとして ON/OFF でき、Live/Split 両方で描画。プラグインがコマンド/パネルを追加できる。
- 🔍: **Tauri 起動再確認**。プラグイン無効化で機能が消えることを確認（疎結合の証明）。

### ステージ 6 — 仕上げ & 出荷

**M18 — UI/UX 総仕上げ**
- 作業: §13 ループを全主要画面で 2〜3 周。オンボーディング（FirstRun: 「書く場所＝ただのフォルダ」、Welcome doc seed、空状態文言）。モーション（[ui-ux-spec.md](docs/ui-ux-spec.md) §6.6、`prefers-reduced-motion`）。a11y（フォーカスリング、キーボード到達、コントラスト、color-blind パレット）。密度トグル。
- ✅: 1.2 の品質要件チェックが全部埋まる。
- 🔍: a11y チェック（キーボードのみで全操作・コントラスト測定）。`docs/ui-ux-log.md` 完成。

**M19 — クロスプラットフォーム & 性能 & 配布**
- 作業: macOS（署名: karui の developer_id 資産を参照）/ 可能なら Win/Linux ビルド。大規模 Vault 性能（仮想化・遅延・debounce 最終調整）。自動アップデータ（updater + GitHub Releases、`make keygen`、karui 方式）。ファイル関連付け（`.velq`/`.md`、`RunEvent::Opened`、`get_opened_files`）。Makefile の release フロー。
- ✅: `cargo tauri build` の成果物が起動・署名済み（macOS）。`.velq`/`.md` ダブルクリックで開く。アップデータが動く。
- 🔍: クリーン環境でインストール→起動→主要フロー通し。

**M20 — ランディング & OSS 公開**
- 作業: `lp/`（Astro、karui の lp/ 流用）で velq.sh、wrangler で Cloudflare Pages デプロイ（ユーザーはログイン済み）。docs 最終化（§17）。Apache-2.0 + プラグイン例外条項 + CLA を README に明記。GitHub 公開。
- ✅: velq.sh が公開、リポジトリが Apache-2.0 で公開、README から導線が通る。
- 🔍: ランディングから DL→インストール→起動の導線を実機確認。**§1 の DoD を全チェック**。

---

## 15. テスト & 検証戦略

### 15.1 起動チェック（★各ステージ末で必須・ユーザー明示要望）

```bash
# dev 起動確認
cd apps/desktop && cargo tauri dev
# → 確認: ウィンドウが出る / 3ペイン or 当該UIが描画 / devtools(コンソール)に赤エラーなし
#         Rust 側のパニック・command 失敗ログがない

# build 起動確認（リリース経路）
cargo tauri build
# → 生成された .app/実行ファイルを起動し、最低限の操作（Vault開く→ファイル開く→編集→保存）が通る
```
- 起動しない/エラーが出る状態で次マイルストーンに進まない。ログとスクショを `docs/screenshots/<m>/` に残す。

### 15.2 自動テスト

- **Rust crate（headless）**: `cargo test -p velq-core | velq-bundler | velq-search | velq-vcs`。各 crate の往復テストを必ず持つ（特に vcs の保存→差分→復元、bundler の抽出→書換→オフライン表示、core の pack→unpack→.zip 互換）。
- **フロント**: Vitest で純ロジック（scrollSync の行補間、diff の単語グルーピング、ipc ラッパ、shortcuts の Mod 解決）。
- **エディタ**: CM6 の薄ラッパは「外部変更ガードでループしない」「Compartment 再構成で view 再生成しない」を最小テスト。

### 15.3 手動検証チェックリスト（差分・UX 重点）

- 差分: 編集→保存→履歴に版→差分が GitHub 同等（行＋単語・色＋記号）→非破壊復元→Undo が戻る。
- ファイル: rename で拡張子保護 / DnD のコピー/移動予告 / Space プレビュー / 「今どこ」常時可視。
- セキュリティ: `.velq` viewer から fetch/invoke が失敗する。
- 外部変更: 別エディタ保存を検知、編集中はデータ消失なし。

### 15.4 検証用フィクスチャ

`apps/desktop/src-tauri/tests/fixtures/` に: GFM 全部入り `.md`、CDN 依存（Tailwind/Chart.js）HTML、手作り `.velq`、巨大 Vault 生成スクリプト。

---

## 16. リスクと対策

| ID | リスク | 影響 | 対策 |
|---|---|---|---|
| R1 | Turso の FTS/ベクトルが時期により beta 挙動 | 一部の高度検索が時期尚早な可能性 | **DB は Turso 確定（§2-D2、同一エンジン方針）。** MVP はファイル名検索のみで支障なし。FTS/ベクトル導入時に制約に当たったら**別 DB へ替えず必ずユーザーに相談**。`SearchIndex` trait で検索ドメインは疎結合 |
| R2 | ライブプレビュー（CM6 decoration）の複雑さ・ちらつき | エディタ品質低下 | **Split を先に出荷**（M3）。Live は viewport 増分・widget の `eq()`/`estimatedHeight` を厳守。最悪 Live を後送りしても Split で要件充足 |
| R3 | CDN 取得失敗・巨大化（.velq） | バンドル破綻 | 失敗は `BundleReport.failed` で続行・警告。サイズ上限と進捗表示。内容ハッシュで重複排除 |
| R4 | PDF を外部バイナリなしで出す | エクスポート不全 | MVP=`window.print()`。native print-to-PDF（`with_webview`）はファストフォロー。実装前に各 OS の API を確認 |
| R5 | `@codemirror/state` 二重バンドル | decoration が静かに壊れる | 版を揃え `pnpm dedupe`、1 コピーを CI で検証 |
| R6 | 大規模 Vault の性能 | 操作が重い | 仮想スクロール・遅延展開・debounce。1 万件で計測 |
| R7 | 隔離 WebView の権限漏れ | セキュリティ事故 | capability 非所属を厳守、CSP `connect-src 'none'`、viewer から invoke/fetch 失敗を毎回テスト（M13/M15） |
| R8 | クロス OS の WebView 差異 | 表示崩れ | M19 で Win/Linux 実機確認。プレビュー CSS を保守的に |
| R9 | IME/日本語編集の不具合 | 日本語ユーザー致命的 | M2 で IME を必ず確認。CM6 の composition を尊重 |

---

## 17. ドキュメント成果物一覧

- [x] `docs/requirements.md`（既存）
- [x] `docs/ui-ux-spec.md`（既存・本実装の UI 基準）
- [x] `plan.md`（本書）
- [x] `CLAUDE.md`（実装 AI 向け開発ガイド: 規約・command の作り方・crate 責務・テスト手順。karui の `claude.md` 形式）← **M0 で作成**
- [x] `docs/velq-format.md`（`.velq` 正式仕様、§6 から）← M13
- [x] `docs/architecture.md`（§3 を図つきで）← M1〜随時
- [x] `docs/file-manager-ux.md`（§9 の深掘り・Finder/Obsidian 比較）← M8
- [x] `docs/plugin-api.md`（§11、KaTeX/Mermaid を例に）← M17
- [x] `docs/ui-ux-log.md`（§13 の before/after 記録）← M3 以降
- [x] `README.md` / `CLA.md` / `LICENSE`(Apache-2.0) ← M0/M20
- [x] `docs/distribution.md`（ビルド・署名・更新・ファイル関連付け）← M19（追加）

---

## 18. Phase 2 / 3 への拡張ポイント（今作る土台）

- **検索**: `SearchIndex` trait → 全文検索（Turso FTS）→ セマンティック（Turso ベクトル検索）。同一エンジンで段階拡張。
- **共同編集（Phase 3）**: CM6 薄ラッパは Yjs 対応容易（`y-codemirror.next` を compartment で足すだけ。uncontrolled 設計が前提を満たす）。
- **SaaS/AI（Phase 2, 別リポ・プロプラ）**: プラグイン API か Tauri command/HTTP 経由で疎結合接続。`Manifest.tags`/`custom` に AI 付与メタの受け皿あり。API キーは Rust 側管理。
- **Web 版**: `apps/web` を予約。**DB は Turso WASM ビルド（デスクトップと同一エンジン・requirements §4）**、エディタは CM6 共通、FS は File System Access API。
- **拡張容易性**: エクスポートは `Exporter`、プラグインは `EditorPlugin`、検索は `SearchIndex` を 1 個足すだけで増える。

---

## 付録 A — コマンド早見表

```bash
# 開発
make dev                      # = cd apps/desktop && cargo tauri dev
pnpm --filter desktop dev     # フロントのみ（ブラウザで UI 確認 / Playwright）
# ビルド
make build                    # = cargo tauri build
# テスト
cargo test --workspace        # 全 crate
pnpm -r test                  # フロント（vitest）
pnpm dedupe                   # CM6 シングルトン確認
# リリース（karui 方式・version 同期 + tag push → GH Actions）
make release / release-minor / release-major
make keygen                   # updater 署名鍵
# ランディング
cd lp && pnpm build && wrangler pages deploy
```

## 付録 B — 主要参照

- 既存実装の規約: [karui-app](../karui/karui-app)（Tauri v2 + React 19 + Rust。`src-tauri/src/lib.rs`・`commands/`・`tauri.conf.json`・`capabilities/`・`Makefile`）
- UI/UX 根拠と出典: [ui-ux-spec.md](docs/ui-ux-spec.md)（末尾 Sources に Finder/Obsidian/VS Code/Notion/Bear/iA/Linear/Raycast/GitHub Primer 等のリンク）
- 要件: [requirements.md](docs/requirements.md)
```
