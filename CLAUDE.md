# CLAUDE.md — Velq engineering guide

Read this before touching code. It encodes the conventions an AI implementer must follow.
The authoritative *what to build* is [plan.md](plan.md); this file is *how we build it*.

## What Velq is

A Tauri v2 desktop app: a Markdown/HTML editor + `.velq` packager. Three pillars:
the **file manager**, the **save-history/diff** experience, and the **`.velq` format**.
Stack is fixed in [plan.md](plan.md) §2 — **do not swap it** (especially the DB: Turso,
per §2-D2; if you hit a Turso limitation, ask the user, don't switch DB).

## Layout & where things go

- **Pure logic → a crate** (`crates/velq-*`), Tauri-independent, `cargo test`-able.
- **Tauri glue → `apps/desktop/src-tauri/src/commands/<domain>.rs`**, thin.
- **Frontend → `apps/desktop/src/<area>/`** (see plan §8.2). State in `store/` (zustand).
  Every Tauri call goes through a typed wrapper in `src/ipc/` — never call `invoke()` with a
  bare string elsewhere.

## Rust conventions (mirror the `karui` app)

- `main.rs` is a one-liner that calls `lib.rs::run()`. All builder setup lives in `lib.rs`.
- Commands: `#[tauri::command]`, return `Result<T, String>`. CPU-bound work goes in
  `tauri::async_runtime::spawn_blocking`. Long jobs emit progress via `app.emit("domain:progress", _)`.
- DTOs are `#[derive(Serialize)]` (+ `#[serde(rename_all = "camelCase")]` so the frontend
  sees camelCase). Inputs are camelCase args (Tauri converts).
- `commands/mod.rs` re-exports every submodule and holds shared DTOs.
- Wire commands in `lib.rs` via `tauri::generate_handler![...]`.
- Errors: `thiserror` in crates, map to `String` at the command boundary.
- `#![forbid(unsafe_code)]` in every crate.

## Frontend conventions

- **CodeMirror is uncontrolled.** React owns a container div + app state only; CM owns the
  editor. Create `EditorView` once in `useEffect(…, [])`, `destroy()` in cleanup (StrictMode-safe).
  Everything runtime-switchable (theme/lang/vim/plugins) is a **`Compartment`** — never recreate
  the view. See plan §8.3. `@codemirror/state` and `@lezer/common` are singletons — keep one copy
  (`pnpm dedupe`); a double-bundle silently breaks decorations.
- Design tokens live in `src/design/tokens.css` (values from [docs/ui-ux-spec.md](docs/ui-ux-spec.md) §6).
  Never hardcode a hex in a component — use a `var(--token)`.
- Icons: `lucide-react`. Linting/formatting: Biome (`pnpm lint`).

## The non-negotiables (from the user)

1. **It must launch.** At each stage gate (M1, M5, M9, M12, M15, M17) run `cargo tauri dev`
   *and* `cargo tauri build`; a window must appear with no red console / no Rust panic. Never
   stack code on a non-launching app. Logs + screenshots go to `docs/screenshots/<m>/`.
2. **Run the UI/UX loop** (plan §13) at the end of every UI milestone: screenshot → compare to
   [docs/ui-ux-spec.md](docs/ui-ux-spec.md) and to Finder/Obsidian/VS Code/Bear → list diffs →
   fix → log in `docs/ui-ux-log.md`. Ask each screen: "is this clearer than Finder/Obsidian?"
3. **No git vocabulary in the UI.** Forbidden: commit/branch/HEAD/checkout/repository/merge/
   push/pull/diff. Users see "save history", "version", "what changed", "restore".
4. **Files are never containers.** The tree is the real disk. Two nouns only: folder, file.

## Testing

- `cargo test --workspace` — every crate keeps a round-trip test (vcs: save→diff→restore;
  core: pack→unpack→.zip-compatible; bundler: extract→rewrite→offline).
- `pnpm -r test` — Vitest for pure logic (scrollSync interpolation, diff word-grouping, ipc
  wrappers, shortcut Mod resolution).
- `pnpm dedupe` must keep CM6 singletons at one copy.

## Build / release (mirrors karui's Makefile)

`make dev` / `make build` / `make release[-minor|-major]` / `make keygen`. Version is kept in
sync across `package.json`, `tauri.conf.json`, `Cargo.toml`. Updater = tauri-plugin-updater +
GitHub Releases; private signing key in CI secrets, pubkey in `tauri.conf.json`.

## Reference

- Conventions template: `../karui/karui-app` (same author's Tauri v2 app).
- Build order & acceptance criteria: [plan.md](plan.md) §14 (M0→M20).
- UI/UX truth: [docs/ui-ux-spec.md](docs/ui-ux-spec.md). Requirements: [docs/requirements.md](docs/requirements.md).
