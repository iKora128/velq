# Velq architecture

Velq is a Tauri v2 desktop app: a React 19 frontend talking to a thin Rust backend
that delegates all real work to headless `velq-*` crates. A second, deliberately
powerless WebView renders untrusted `.velq` content.

```
┌────────────────────────── Tauri app (apps/desktop) ──────────────────────────┐
│                                                                               │
│  ┌─ Main window  (trusted, label="main") ─────────────────────────────────┐  │
│  │  React 19 + Vite 8 frontend                                             │  │
│  │   ├ App shell: Sidebar / FileList / Editor / History / StatusBar        │  │
│  │   ├ <CodeMirror> thin wrapper (owns EditorView, Compartment reconfig)   │  │
│  │   ├ Preview (comrak HTML in iframe) / Live preview (CM6 decorations)    │  │
│  │   ├ Command palette / Quick Look / version history / diff (@cm/merge)   │  │
│  │   └ Plugin runtime (registry + pluginsCompartment)                      │  │
│  │            │ invoke()                    ▲ events (fs:changed, …)        │  │
│  └────────────┼────────────────────────────┼─────────────────────────────┘  │
│               ▼                             │                                 │
│  ┌─ Rust backend (src-tauri/commands/) ────┴─────────────────────────────┐  │
│  │  app · vault · render · search · vcs · velq · bundle · watch          │  │
│  │     │          │          │         │        │         │              │  │
│  │  velq-core  velq-bundler velq-search velq-vcs notify-debouncer        │  │
│  │  (.velq zip) (lol_html)   (FsSearch)  (git2 +  (coalesce saves)        │  │
│  │                                        similar)                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─ .velq viewer WebView  (untrusted, label="velq-viewer-*") ─────────────┐  │
│  │  Belongs to NO capability ⇒ zero IPC / FS / network. Content served    │  │
│  │  from the ZIP via the `velq:` URI scheme with a strict CSP             │  │
│  │  (connect-src 'none'). JS runs (process-isolated); it can't escape.    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Layers

**Frontend (`apps/desktop/src`).** React + zustand stores (`doc`, `vault`, `files`,
`history`, `settings`, `toast`, `palette`). The editor is a thin uncontrolled wrapper
over a CodeMirror 6 `EditorView`; everything optional (live preview, plugins, vim) is a
`Compartment` reconfigured in place, never a view rebuild. Nothing calls `invoke()`
directly — typed wrappers in `src/ipc/` are the single choke point, and a mock backend
(`ipc/mock.ts`) serves them in a plain browser so the whole UI is exercisable for
screenshots/tests without Tauri.

**Backend (`apps/desktop/src-tauri`).** A thin glue layer: each file under `commands/`
is a domain (vault, render, search, vcs, velq, bundle, watch, app), wired through
`tauri::generate_handler!`. It holds no business logic — it validates inputs and calls a
crate.

**Domain crates (`crates/`).** Pure, Tauri-independent, `cargo test`-able:
- `velq-core` — the `.velq` format: `pack` / `unpack` / `read_manifest` / `read_file_bytes`
  / `validate` over a ZIP container (`docs/velq-format.md`).
- `velq-bundler` — collect an HTML document's CSS/JS/images/fonts/CDN deps, dedupe by
  content hash, rewrite references in one streaming pass (lol_html).
- `velq-search` — the `SearchIndex` trait; `FsSearch` (filesystem-walk filename search) is
  the Phase-1 impl. Turso backs full-text/vector search later behind the same trait.
- `velq-vcs` — the save-history domain over git2 + similar. No git vocabulary ever
  surfaces; restore is non-destructive.

## Key flows

- **Edit → Save → History.** Save writes the file and records a version (`velq-vcs`,
  git2 under the hood). The history panel lists versions, renders a word-level diff
  (`@codemirror/merge` + a Primer-styled theme), and restores by writing the old content
  forward — never a destructive reset, so Undo still works.
- **Package `.velq`.** `velq-bundler` collects + rewrites deps → `velq-core` packs them
  into a ZIP with a manifest. The result is validated to round-trip.
- **External change.** A debounced `notify` watcher (400 ms, to coalesce editors'
  atomic-save churn) emits `fs:changed`; the frontend reloads clean tabs and flags dirty
  ones as conflicts rather than clobbering.

## Security model: the `.velq` viewer

Opening a `.velq` spawns a separate `WebviewWindow` that is **listed in no capability**,
so Tauri grants it zero IPC, filesystem, or dialog access by construction — not by a
runtime check that could regress. Its bytes are served from inside the ZIP by a
`register_uri_scheme_protocol("velq", …)` handler that injects a strict CSP
(`default-src 'self' …; connect-src 'none'`), and the window is `incognito`. JavaScript
inside the document still runs (it's a real, process-isolated WebView), but it cannot
reach the host or the network. See [velq-format.md](velq-format.md).

## Design principles (requirements §9)

Keep it simple (no Notion-ization) · the `.velq` format's reach comes first ·
offline-first · build bespoke things on standards (ZIP, SQLite) · keep the open core and
any proprietary edition decoupled through the plugin API. Every abstraction —
`SearchIndex`, the `VelqPlugin` registry, the `Exporter` set — is a trait/interface, so
extending Velq means adding one implementation, not editing the core.
