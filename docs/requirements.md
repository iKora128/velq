# Velq（ヴェルク）— 要件定義書

> Markdown / HTML ビューワー・エディタ + .velq パッケージング  
> https://velq.sh  
> 作成日: 2026-06-28  
> ステータス: Draft v1.1

---

## 1. プロダクト定義

Markdown と HTML を読み書きし、HTML を依存ファイルごとパッケージ化（.velq）できる軽量デスクトップエディタ。
プラグインで拡張可能。SaaS 連携と AI 機能は課金。

- サービス名: **Velq**（ヴェルク）
- 由来: vel（ラテン語: 織る・覆う・包む）+ q
- ドメイン: velq.sh
- 独自拡張子: `.velq`

ポジショニング: Obsidian のシンプルさ + HTML パッケージングという独自性。
Notion のようなマッチョ機能は持たない。

---

## 2. コア機能（OSS / Apache-2.0）

### 2.1 エディタ / ビューワー

- Markdown 編集 + ライブプレビュー
  - GFM 完全対応（テーブル、タスクリスト、脚注、コードブロック）
- HTML 閲覧・編集
- テーマ切替（ダーク / ライト）
- 2ペイン構成（ソース + プレビュー）

### 2.2 .velq フォーマット

独自のドキュメントパッケージング形式。AI 時代に増加する HTML 出力物を、
依存ファイルごと1ファイルにまとめて保存・配布できるようにする。

- HTML を渡すと CSS / JS / 画像のリンクを自動で辿り、収集
- CDN 上の外部リソース（Tailwind CDN、Chart.js 等）も取り込み、完全オフライン動作
- ZIP ベースのコンテナ（EPUB / .docx と同じ設計思想）
  - リネームすれば .zip として解凍可能（ロックインなし）
  - マジックナンバーは ZIP のまま（`PK\x03\x04`）
- 拡張子: `.velq`
- 内部構造:
  ```
  manifest.json          # メタデータ
  index.html             # メインドキュメント
  assets/
    css/
    js/
    img/
  ```
- manifest.json に含めるメタデータ:
  - タイトル、作成日時、更新日時
  - 元 URL（Web ページからパッケージ化した場合）
  - 作成アプリ・バージョン
  - AI が付与したタグ（プロプラ機能連携時）
  - カスタムメタデータ（プラグイン拡張用）
- Markdown → .velq 変換も対応
- .velq のプレビューは隔離 WebView で JS 実行可（セキュリティは §5 参照）

### 2.3 ファイル管理

このアプリの差別化ポイントのひとつ。UX / UI を最優先で設計する。

- Vault 方式（ルートフォルダを指定してツリー表示）
- ファイル CRUD（作成・リネーム・削除・移動）
- ドラッグ＆ドロップ対応
- ファイル名検索（部分一致、インクリメンタル）
- 全文検索（Turso Database 内蔵の tantivy ベース FTS）
  - 初期: ファイル名の一致検索で十分
  - 将来: コンテンツの全文検索、日本語形態素解析（lindera）対応

### 2.4 差分管理 / バージョン履歴

- 保存時に自動 git commit（git2 crate、Git バイナリ不要）
  - コミットメッセージ: タイムスタンプ + 変更ファイル名の自動生成
  - ユーザーは Git を意識しなくてよい（「保存履歴」として見える）
- テキストファイルのみ追跡、バイナリは .gitignore で除外
  - 画像・動画・フォント等のデカいファイルは追跡しない
- Diff ビュー（GitHub 風、行単位・文字単位の差分表示）
- ファイルシステム監視（外部エディタでの変更も検知）
- Git を普段使うユーザーは .git がそのまま見える
  - ターミナルから git log、GitHub への push も可能

### 2.5 エクスポート

- Markdown 出力
- HTML 出力
- .velq 出力
- PDF 出力

### 2.6 プラグイン API

- JS ベースのプラグイン機構
- カスタムレンダラー、コマンド、サイドバーパネルの追加
- プラグインのライセンスは作者の自由（コアの Apache-2.0 に縛られない）
- プラグイン例:
  - KaTeX / MathJax（数式レンダリング）
  - Mermaid（ダイアグラム）
  - カスタムテーマ
  - 外部サービス連携

---

## 3. プロプラ機能（課金）

### 3.1 SaaS

- クラウド保存（.velq をサーバーにアップロード）
- 共有リンク生成（.velq を URL で閲覧共有）
- ユーザー認証
- 将来: リアルタイム共同編集（Yjs + CodeMirror 6、Phase 3）

### 3.2 AI

- 要約、リライト
- 目次・タグ自動生成
- 翻訳
- セマンティック検索（Turso Database のベクトル検索を活用）
- クラウド API（Anthropic, OpenAI 等）+ ローカル LLM（Ollama）切替対応
- API キーはフロントに晒さず、Rust 側で管理

---

## 4. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| フレームワーク | Tauri v2 | Rust バックエンド + Web フロント、軽量 |
| フロントエンドビルド | Vite 8 | Rolldown（Rust）統合済、10-30x 高速ビルド |
| エディタ | CodeMirror 6 | Obsidian と同じ、軽量、Vim 対応、Yjs 拡張パスあり |
| MD レンダリング | comrak | Rust 製、GFM 完全対応 |
| HTML 処理 | lol_html | Cloudflare 製、ストリーミング HTML rewriter、リンク抽出・書換 |
| ZIP 処理 | zip crate | .velq コンテナの読み書き |
| DB | Turso Database（旧 Limbo） | Pure Rust、SQLite 互換、FTS（tantivy）内蔵、ベクトル検索内蔵、WASM 対応 |
| バージョン管理 | git2 | libgit2 の Rust バインディング、Git バイナリ不要 |
| Diff | similar | Rust 製 diff アルゴリズム、行/文字単位 |
| ファイル監視 | notify | クロスプラットフォームの fs watcher |
| 将来: 共同編集 | Yjs + y-codemirror.next | CRDT、CodeMirror 6 との統合済 |
| 将来: 日本語検索 | lindera | Rust 製形態素解析（IPADIC） |

### Web 版の技術差分

- DB: Turso Database WASM ビルド（同一エンジン）
- エディタ: CodeMirror 6（共通）
- ファイル管理: ブラウザ File System Access API またはサーバーサイド

---

## 5. セキュリティ（.velq 閲覧時）

.velq 内の JS を実行可能にする（インタラクティブな HTML ドキュメント対応）。
セキュリティは Tauri v2 の capabilities システムで担保する。

| 脅威 | 対策 | リスクレベル |
|------|------|------------|
| ファイルシステムアクセス | .velq 用 WebView に fs プラグイン権限を付与しない | ゼロ |
| 外部への情報送信 | CSP `connect-src 'none'`（.velq はオフライン前提） | ゼロ |
| メインアプリへの干渉 | 隔離 WebView（別オリジン、別 localStorage） | ゼロ |
| CPU 枯渇（無限ループ等） | WebView は別プロセス、本体は巻き込まれない。WebView を kill して復帰 | 低（個別 .velq が固まるだけ） |

実装: .velq を開くときに `WebviewBuilder` で権限なしの隔離 WebView を生成。
メインエディタ UI とは完全に別コンテキストで動作させる。

---

## 6. ライセンス戦略

| 対象 | ライセンス | 備考 |
|------|-----------|------|
| コア（エディタ、ビューワー、.velq、ファイル管理、プラグイン API） | Apache-2.0 | 特許グラント条項あり、Rust 慣習に準拠 |
| プラグイン | 作者の自由 | コアの Apache-2.0 に縛られない（明示的例外条項を記載） |
| SaaS / AI 機能 | プロプライエタリ | 別リポジトリ、プラグインとして疎結合で提供 |

運用方針:

- CLA（Contributor License Agreement）を初日から用意し、著作権を自社に集約
- デュアルライセンス / 商用ライセンスは著作権者としていつでも可能
- プロプラ機能はプラグイン API を介した疎結合（Tauri コマンド / HTTP 経由）で AGPL 的な伝播を回避

---

## 7. リポジトリ構成（案）

```
velq/
├── apps/
│   ├── desktop/          # Tauri v2 デスクトップアプリ（コア）
│   │   ├── src-tauri/    # Rust バックエンド
│   │   └── src/          # フロントエンド（Vite 8 + CodeMirror 6）
│   └── web/              # Web 版（将来）
├── crates/
│   ├── velq-core/        # .velq フォーマットのパース・生成
│   ├── velq-bundler/     # HTML リンク辿り + リソース収集
│   └── velq-search/      # 検索インデックス管理
├── plugins/
│   ├── katex/            # 数式レンダリング（プラグイン例）
│   └── mermaid/          # ダイアグラム（プラグイン例）
├── docs/
├── LICENSE               # Apache-2.0
├── CLA.md
└── README.md
```

※ SaaS / AI 機能は別リポジトリ（プロプライエタリ）

---

## 8. フェーズ計画

### Phase 1 — コア MVP

- エディタ / ビューワー（MD + HTML）
- .velq フォーマットの生成・閲覧
- ファイル管理（Vault ツリー + 検索）
- 保存時自動 git commit + Diff ビュー
- エクスポート（MD / HTML / .velq / PDF）
- プラグイン API（基盤）
- OSS 公開（Apache-2.0）

### Phase 2 — SaaS 初期

- クラウド保存
- 共有リンク生成（.velq を URL で閲覧）
- ユーザー認証
- AI 機能（要約、リライト、タグ生成）— 課金

### Phase 3 — SaaS 成熟期

- リアルタイム共同編集（Yjs + CodeMirror 6）
- セマンティック検索（ベクトル検索）
- 日本語全文検索の高度化（lindera 統合）
- プラグインマーケットプレイス

---

## 9. 設計原則

1. **シンプルに保つ** — Notion のマッチョ機能は持たない。ファイルベースの素朴さを維持する。
2. **フォーマットの普及が最優先** — .velq を開ける人が増えることがエコシステムの成長。Apache-2.0 で裾野を最大化する。
3. **オフラインファースト** — .velq は CDN リソースも同梱し、完全オフラインで動作する。
4. **標準の上に独自を載せる** — .velq は ZIP ベース、DB は SQLite 互換。独自路線を取りつつもロックインを避ける。
5. **疎結合** — コア（OSS）とプロプラ（SaaS / AI）はプラグイン API を介して接続。コードレベルで分離する。
