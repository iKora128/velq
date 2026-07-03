# Contributing to Velq

Thanks for helping! This page is the short version; the deep references are
[plan.md](plan.md) (what we're building), [CLAUDE.md](CLAUDE.md) (engineering
conventions) and [docs/](docs/) (requirements, UI/UX spec, `.velq` format spec).

## Ground rules

- **CLA.** Your first PR triggers a bot asking you to sign the
  [Contributor License Agreement](CLA.md) with a single comment. We can't merge
  without it — it's what keeps the open core relicensable.
- **License.** Code you contribute lands under Apache-2.0.
- **UI language.** Never show git vocabulary in the UI (no commit / branch /
  merge / diff…); users see "save history", "version", "what changed",
  "restore". Folders and files are the only two nouns — files are never
  containers.
- **Design tokens.** No hardcoded colors in components — use `var(--token)`
  from `apps/desktop/src/design/tokens.css`.

## Getting set up

```bash
pnpm install
make dev            # cargo tauri dev — run the desktop app
make front          # frontend only at http://localhost:1420
```

Prereqs: Rust stable, pnpm 10, and the
[Tauri v2 platform dependencies](https://tauri.app/start/prerequisites/).

## Before you open a PR

```bash
make fmt            # rustfmt + biome
make lint           # clippy -D warnings + biome
make test           # cargo test --workspace + pnpm -r test
```

CI runs exactly these gates. For UI changes, attach a screenshot and check
both themes (dark / light); keyboard reachability matters here.

## What to work on

Bugs and small fixes: just open a PR. Larger features: open an issue first —
[docs/proposals.md](docs/proposals.md) tracks the roadmap, and its §5 lists
things we've explicitly decided *not* to build (graph views, block editors,
files-as-containers, …).
