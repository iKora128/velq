<div align="center">

# Velq

**A calm Markdown / HTML editor that packages documents — dependencies and all — into a single offline `.velq` file.**

[velq.sh](https://velq.sh) · Apache-2.0 · Built with Tauri v2 + React 19 + Rust

</div>

---

Velq reads and writes Markdown and HTML, gives you Obsidian-grade live preview and a
Finder-grade file manager, keeps a friendly **save history** (no git knowledge required),
and can bundle any HTML document — including its CDN dependencies — into a `.velq`:
a ZIP-based container that works **completely offline** and opens in a permission-zero,
isolated WebView.

> Positioning: Obsidian's simplicity + HTML packaging as the differentiator.
> No Notion-style maximalism. The format's reach comes first.

## Features (Phase 1 — core MVP)

- **Editor / viewer** — Markdown with GFM (tables, task lists, footnotes, code), three
  view modes: `Source` / `Split` / `Live` (Typora-style single-pane WYSIWYG). HTML view & edit.
- **File manager** — Vault tree, two-pane previewed list, Miller column view, Quick Look
  (Space), inline rename, spring-loaded drag & drop, always-visible search, breadcrumbs.
- **Save history** — every save is a version. Browse, diff (GitHub-quality, word-level),
  and restore non-destructively. Backed by git2, but no git vocabulary ever shown.
- **`.velq` packaging** — collect CSS/JS/images/fonts/CDN resources into one offline file,
  previewed in a sandboxed WebView (JS runs; filesystem and network do not).
- **Export** — Markdown / HTML / `.velq` / PDF.
- **Plugins** — a JS plugin API (CodeMirror 6 extensions); KaTeX and Mermaid ship as
  reference plugins. See [docs/plugin-api.md](docs/plugin-api.md).
- **Native & calm** — dark/light, reduced-motion aware, WCAG-AA text, keyboard-driven,
  comfortable/compact density. Auto-updates from GitHub Releases; opens `.velq` / `.md` /
  `.html` from Finder. macOS, Windows & Linux.

## Install

Download the latest release for your platform from **[velq.sh](https://velq.sh)** or the
[GitHub Releases](https://github.com/iKora128/velq/releases/latest) page:

| OS | Package |
|----|---------|
| macOS (Apple Silicon & Intel) | `.dmg` |
| Windows (64-bit) | `.msi` / NSIS `.exe` |
| Linux | `.AppImage` / `.deb` |

Velq keeps itself up to date after that. See [docs/distribution.md](docs/distribution.md)
for how builds, signing and updates work.

## Repository layout

```
velq/
├── apps/desktop/        # Tauri v2 desktop app (React 19 + Vite + CodeMirror 6)
│   └── src-tauri/       # Rust backend (commands/)
├── crates/
│   ├── velq-core/       # .velq format: manifest + ZIP read/write
│   ├── velq-bundler/    # HTML dependency collection + rewrite (lol_html)
│   ├── velq-search/     # SearchIndex trait + filename search (FsSearch MVP; Turso later)
│   └── velq-vcs/        # save-history domain over git2 + similar
├── plugins/             # katex, mermaid (reference plugins)
├── lp/                  # velq.sh landing (Astro → Cloudflare Pages)
└── docs/                # requirements, ui-ux-spec, plan, architecture, …
```

## Develop

```bash
pnpm install
make dev            # cargo tauri dev — launches the desktop app
pnpm dev            # frontend only (http://localhost:1420) for UI work / screenshots
cargo test --workspace
pnpm -r test
make build          # cargo tauri build
```

See [docs/](docs/) for the full plan ([plan.md](plan.md)), requirements, and UI/UX spec,
and [CLAUDE.md](CLAUDE.md) for the engineering conventions.

## Licensing

- **Core** (editor, viewer, `.velq`, file manager, plugin API): **Apache-2.0** — see [LICENSE](LICENSE).
- **Plugins**: authors choose their own license. Velq's plugin API carries an explicit
  exception (see the end of [LICENSE](LICENSE)); plugins that interface only through the
  published API are not Derivative Works.
- **SaaS / AI features**: proprietary, in a separate repository, connected through the
  plugin API or Tauri command / HTTP boundaries.

Contributions require signing the [CLA](CLA.md) (handled automatically on your first PR).

© 2026 Daichi Nagashima.
