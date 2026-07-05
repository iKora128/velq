# UI/UX improvement log

Per plan §13, every UI milestone ends with a screenshot → compare → fix loop. Each entry
records *what* changed, *why*, and the benchmark it was measured against. Screenshots live in
`docs/screenshots/<milestone>/`.

---

## M1 — App shell, design tokens

**Screens:** welcome (light/dark), vault-open (light/dark) — `docs/screenshots/m1/`.
**Benchmarks:** Obsidian (3-pane chrome), Bear/Apple Notes (two-pane list), Linear (calm tokens).

### Round 1 findings → fixes

| # | Finding (before) | Fix (after) | Why |
|---|---|---|---|
| 1 | In dark mode the middle file-list pane was darker than the sidebar, so the L→R surface progression dipped and the editor didn't read as the content area. | File-list now shares the sidebar tone (`--bg-subtle`); the editor pane uses `--bg` so it is the brightest surface in light and the deepest in dark. | Spec §6: surfaces should progress monotonically; writing apps (Obsidian) make the editor the distinct, deepest dark surface. |
| 2 | Only the editor toolbar had a bottom border, so the top rule didn't run across the three panes. | All three panes share a 44px top band with a matching bottom border → one continuous top rule. | A unified top bar reads as "designed" (VS Code / Linear). |
| 3 | Both the sidebar and the file list said "No folder open" — duplicated copy. | File-list no-vault state is now a single quiet line ("Your documents will appear here"); the sidebar keeps the CTA. | Avoid repeating the same empty message in adjacent panes. |

### Carried forward
- Editor writing surface tone (paper white vs neutral-50) to be re-judged when the real
  CodeMirror surface lands (M2).
- Density toggle uses a gauge icon — revisit with a clearer affordance at M18.

**Verdict:** Calm, Obsidian-grade empty shell. Good empty states, always-visible search,
view-mode toggle, status bar with location. Clearer than a cold blank screen.

---

## M2 — CodeMirror 6 editor

**Screens:** editor (light/dark), live editing, search panel — `docs/screenshots/m2/`.
**Benchmarks:** iA Writer (serif prose body, calm), Typora (markdown source), Obsidian.

The editor landed clean on the first pass: var-based theme so light/dark needs no compartment
swap; markdown highlighting is marker-muted (iA-style) with sized headings, warm inline-code,
accent links/lists; prose serif body. Verified live: typing updates the word count (81→87) and
flips the status to "Editing" with a breadcrumb dirty dot; Cmd+F search panel themed; no console
errors. IME safety is structural (no dispatch during composition, view never recreated, §8.3).

### Carried forward
- Active-line highlight spans full width while prose is centered — fine now, re-check once the
  Live measure (M5) constrains the column.
- The Source/Split/Live toggle currently always shows source; Split wires at M3, Live at M5.

**Verdict:** A real, calm writing surface. Matches the iA/Typora benchmark for source editing.

---

## M3 — Markdown → HTML preview (Split)

**Screens:** split (light/dark) — `docs/screenshots/m3/`.
**Benchmarks:** GitHub (rendered markdown), Obsidian/Typora split, iA Writer prose.

Source left, rendered preview right. comrak (Tauri) / marked (browser) → a sandboxed,
script-less iframe; GFM tables, task-list checkboxes, footnotes, code, blockquotes all render
in a calm GitHub-quality prose theme. Updates are applied imperatively (innerHTML swap, not a
reload) so there's no flicker. Scroll sync uses comrak `data-sourcepos` line anchors.

### Round 1 findings → fixes

| # | Finding (before) | Fix (after) | Why |
|---|---|---|---|
| 1 | In dark mode the preview pane rendered on a **white** background while the editor was dark. | The preview now reads the actually-applied `data-theme` on `<html>` via a MutationObserver (`useResolvedDark`), instead of the settings store — so it can't diverge from what's shown. | The two were separate sources of truth; the DOM attribute is the real one. A genuine correctness bug, not just cosmetics. |
| 2 | Resize divider wasn't keyboard-reachable (a11y). | Added `tabIndex`, `aria-valuenow/min/max`, and arrow-key resize. | Keyboard reachability (plan §1.2); also a nicer feature. |

**Verdict:** GitHub-quality split preview, flicker-free, theme-correct in both modes.

---

## M4 — HTML edit & preview

**Screens:** html-split (light/dark) — `docs/screenshots/m4/`.

`.html` opens with HTML syntax highlighting (lang-html) and a mono font, and defaults to Split
(raw + rendered side by side). The preview renders the document faithfully — the user's own CSS
is applied, JS doesn't run (sandbox). `.md` and `.html` auto-pick their mode.

### Round 1 finding → fix
- A user HTML doc that sets text color but no background rendered dark-on-dark in dark app
  mode. The iframe element background is now **white** — a document with no background renders on
  white exactly as a browser would, so it's always faithful and readable regardless of app theme.

**Verdict:** Faithful WYSIWYG of the actual HTML file; clean auto-switch between MD and HTML.

---

## M5 — Live preview (single pane) ★ stage gate

**Screens:** live (light/dark), active-line reveal, code block — `docs/screenshots/m5/`.
**Benchmarks:** Typora / Obsidian live preview, iA Writer.

A CM6 ViewPlugin decorates the markdown over the visible range: hides `#`/`**`/`` ` ``/`>` markers,
styles the content, renders task checkboxes (interactive) and `---` as a rule. The line(s) the
selection touches reveal their raw markers, so editing is direct. The file stays plain Markdown.
**Stage gate:** rebuilt the Tauri binary with the M2–M5 frontend and launched it — window up, no
panics, no console errors.

### Round 1 finding → fix
- Fenced code showed an orphaned language label (`ts`) and no block styling. Now the language tag
  is hidden and the block gets a code-card background.

### Carried forward
- Tables render raw in live mode (Obsidian renders them; needs a table widget) — M18.
- Selection mini-toolbar + transform-style auto-format — M18.

**Verdict:** Typora-grade live preview; the reveal-on-active-line interaction feels right.

---

## M6 — Vault & tree (read), tabs

**Screens:** tree (light/dark) — `docs/screenshots/m6/`.
**Benchmarks:** Obsidian/VS Code file tree + preview tabs, Finder sidebar.

A real, lazily-loaded, virtualized (`@tanstack/react-virtual`) file tree in the sidebar — folders
first, file-type icons, rotating carets, selection highlight. Clicking a file reads it and opens
it in the editor. Tabs follow the Obsidian/VS Code model: single-click = italic **preview** tab
(replaced by the next), double-click or editing **pins** it. Each tab keeps its own live content,
so switching tabs never drops edits.

### Round 1 finding → fix
- Double-click-to-pin didn't work: `open()` ignored the pin request for an already-open preview
  tab (the preceding single-click had opened it), so the next file replaced it. Now re-opening a
  preview tab pinned promotes it — two tabs as expected.

**Verdict:** Obsidian-grade tree + tabs; the preview/pin distinction reads clearly.

---

## M7 — File CRUD, drag & drop, context menu

**Screens:** contextmenu (light/dark), rename — `docs/screenshots/m7/`.
**Benchmarks:** Finder (inline rename, spring-loaded DnD, context menu), Obsidian.

Full CRUD: create (lands in the selected folder, then drops straight into an inline rename),
rename (base name pre-selected, **extension protected** — verified the selection range), duplicate,
move + Option-copy via drag (spring-loaded folder auto-expand on hover, drop-target highlight,
descendant guard), and delete to the **OS Trash** (never a hard delete). Verb-first context menu.
Open tabs follow renames/moves.

**Verdict:** Finder-grade file operations. Inline rename and the verb-first menu feel native.

---

## M8 — Previewed file list + Quick Look + breadcrumb

**Screens:** filelist (light/dark), breadcrumb, quicklook — `docs/screenshots/m8/`.
**Benchmarks:** Bear / Apple Notes (2-pane previewed list), Finder (Quick Look, path bar).

The middle pane is now the **previewed file list** (plan §9.2 default): folders to navigate at the
top, then document cards with a title + 2-line snippet (extracted server-side in one pass). **Quick
Look** on Space — a floating rendered preview with ←/→ to browse the folder, position indicator,
Enter-to-open. The toolbar **breadcrumb** is the clickable path from the vault root to the open
doc; clicking a folder navigates the list there.

### Round 1 finding → fix
- HTML cards showed `<!doctype html>` as the title (markdown title extraction on raw HTML). HTML is
  now excluded from snippet extraction and falls back to the filename.

### Carried forward (to M18)
- Column (Miller) view; Favorites / Tags / Smart views (All/Recent/Drafts/Trash); manual reorder.

**Verdict:** The three differentiators (previewed list, Quick Look, "you are here") are in and feel
Bear/Finder-grade.

---

## M9 — Search + command palette ★ stage gate

**Screens:** palette-commands, palette-files, search, cheatsheet — `docs/screenshots/m9/`.
**Benchmarks:** Linear / Raycast (palette, shortcut-on-every-row), VS Code (prefix grammar), Finder.

Filename search (FS-walk `SearchIndex`, MVP — Turso deferred to FTS, see memory). The always-on
search box filters the middle pane to ranked matches. The command palette (`Mod+K` / `Mod+Shift+P`)
runs the **prefix grammar**: plain = quick-open files, `>` = commands, `@` = headings (jumps the
editor via a command bus), `:` = line. Every command row shows its shortcut. `Mod+P` quick-open,
`?` opens a shortcut cheat-sheet, `Mod+\` toggles the sidebar. **Stage gate:** rebuilt + relaunched
the binary — window up, no panics.

### Carried forward (to M18)
- Show shortcuts in the right-click context menu and a native menu (palette + cheatsheet cover two
  of the three surfaces today).

**Verdict:** Keyboard-first navigation is in and feels Linear-grade.

---

## M10 — File watching (notify + debouncer)

Backend milestone (no screenshot — a live fs event can't be captured in the browser mock). A
recursive `notify` + `notify-debouncer-full` (8.2 / 0.7) watcher emits a debounced `fs:changed`
(git internals filtered). The frontend refreshes affected tree folders + previews; an externally
changed **clean** open file reloads in place (editor remounts via a `rev` bump), a **dirty** one
shows a non-destructive conflict banner ("changed on disk" → Reload / Keep my version). The 400ms
debounce absorbs editors' atomic-save rename churn. Compiles + builds; end-to-end fs-event behavior
is manual QA.

---

## M11 — Auto-commit & save-history backend (velq-vcs)

Backend milestone with **headless tests** (3 passing): `velq-vcs` wraps git2 (vendored libgit2, no
system Git) + similar. Public surface speaks only `Version` / `commit_save` / `list_versions` /
`version_content` / `restore` — **zero git vocabulary**. The round-trip test proves save→diff→
restore, and that restore is **non-destructive** (a new version is added, later versions survive).
A `.gitignore` is seeded to keep binaries out of history. `Mod+S` now writes + records a version;
opening a vault initializes the repo.

---

## M12 — Version history UI & GitHub-quality diff ★ stage gate

**Screens:** history-panel, diff (light/dark) — `docs/screenshots/m12/`.
**Benchmarks:** GitHub Primer diffs, Google Docs version history, VS Code Timeline.

The ↺ toolbar icon (and the clickable "Saved" status item) opens a **Version history** rail:
versions grouped by Today/Yesterday with "N added · M removed" summaries. Selecting a version shows
a read-only **unified diff** (@codemirror/merge) of the current doc vs that version — Primer colors,
word-level highlights, and **+/− gutter symbols + strikethrough** for WCAG-1.4.1 redundancy.
**Restore is non-destructive** (adds a new version) with an **Undo** toast. No git vocabulary
anywhere (verified by grep). Stage gate: rebuilt + relaunched — window up, no panics.

### Round 1 findings → fixes
1. The `−` symbol overlapped the deleted text → moved both +/− into the left gutter.
2. With 4 panes open the diff was cramped (label truncated to "V") → the file-list pane now hides
   while history is open (a focus mode), giving the diff full width.

### Carried forward (to M18)
- Ambient gutter change-bars in the *live* editor (vs last save); version naming + "named only"
  filter; session-coalescing of rapid autosaves.

**Verdict:** GitHub-quality diff with a calm, git-free "save history". A core differentiator, done.

---

## M13 — velq-core & isolated `.velq` viewer

Mostly backend / security. `velq-core` (2 tests) implements the `.velq` ZIP format — `pack` /
`unpack` / `read_manifest` / `read_file_bytes` / `validate` — and the test asserts the `PK\x03\x04`
magic (so `.zip`-rename works). Opening a `.velq` spawns an **isolated viewer**: a window in **no
capability** (zero IPC/fs by construction), served by a `velq:` URI scheme straight from the ZIP
with a strict CSP (`connect-src 'none'`) and `.incognito(true)`. A self-test fixture
(`tests/fixtures/demo.velq`, openable via `VELQ_OPEN_VELQ=`) reports JS-executes / no-Tauri-bridge /
fetch-blocked. The app launches with the viewer spawning **without error**; the visual runtime check
is the M15 ★ gate (this sandbox lacks screen-recording to capture the native window). Format spec
written to `docs/velq-format.md`.

---

## M14 — velq-bundler (dependency collection)

Backend crate (2 tests). `velq-bundler` (lol_html 3 + blocking reqwest + sha2 + url) collects an
HTML document's dependencies — `<link>/<script>/<img>/srcset`, inline `<style>` `url()`, and
external CSS `url()` (one level of recursion for fonts/images) — fetching local files and CDN URLs,
storing each by **content hash** under `assets/{css,js,img,fonts}/` (dedup), and rewriting every
reference in a second streaming pass. Failed URLs go to `BundleReport.failed` and **don't break the
build**. The offline test proves local collection + rewrite (incl. CSS `url(../img/…)`); the
`bundle_to_velq` / `bundle_html_to_velq` commands wire it into the app.

---

## M15 + M16 — Export (.velq / HTML / Markdown / PDF) ★ stage gate

The command palette gains **Export to .velq / HTML / Markdown / PDF**. `.velq` bundles the document
(HTML as-is, Markdown rendered + themed) and packs it — a crate test now proves the full
**bundle → pack → validate** pipeline yields a valid `.velq` whose `index.html` points at `assets/`.
HTML export writes a self-contained themed document; Markdown writes the raw source; PDF uses the
WebView's print-to-PDF (plan D5 MVP) via a hidden iframe. After a `.velq` export, an **Open** toast
launches the isolated viewer. Stage gate: rebuilt + relaunched — window up, no panics. (Live CDN
fetch + the viewer's visual self-test are manual QA; the local pipeline is covered by tests.)

---

## M17 — Plugin API + KaTeX / Mermaid reference plugins ★ stage gate

The plugin surface (plan §11) is a `VelqPlugin` = **CodeMirror 6 extension(s)** + optional palette
commands, registered into a `usePlugins` store and injected through a single `pluginsCompartment`.
The core editor knows nothing about any specific plugin; two ship as references —
**KaTeX** (`$inline$` / `$$display$$`, a `ViewPlugin` replace decoration) and **Mermaid** (fenced
`mermaid` → SVG, a `StateField` block widget). A **Plugins…** command opens a calm modal listing
each with an on/off switch.

*UI/UX loop.* Screenshotted `#sample-plugins` (light + dark), the panel, and the **off** state.
Findings & fixes:
- **A `ViewPlugin` may not replace line breaks** — the first Mermaid build (multi-line block widget
  from a view plugin) crashed CodeMirror (`coordsAt` of undefined). Rebuilt Mermaid as a `StateField`
  with `block: true`; KaTeX's block regex was also tightened to single-line so it stays a safe view
  plugin. Editor now renders clean, zero console errors.
- **Mermaid ignored the theme** — diagrams rendered on a stark white card in dark mode. Mermaid bakes
  colours into the SVG, so it now reads `data-theme`, picks `dark`/`default`, and a `MutationObserver`
  fires a state effect to **re-render diagrams live on theme toggle**. The card uses `--surface-sunken`
  so it blends in both themes.
- **Decoupling proven on screen** — with both plugins off, math falls back to raw `$…$` and the
  diagram to a plain fenced code block (core behaviour, not the plugin). Toggling reconfigures the
  compartment with no editor teardown — cursor/undo/scroll survive.
- Panel copy fixed (literal ```` ```mermaid ```` → "fenced mermaid blocks").

API documented in [`docs/plugin-api.md`](plugin-api.md). Stage gate: `cargo build` + launched the
Tauri app — process alive, no panics, then terminated.

**Verdict:** a real extension point, not a hook stub — the reference plugins are built only on the
public API, and turning them off leaves plain Markdown. Calm, themed, decoupled.

---

## M18 — UI/UX total polish, onboarding, a11y ★ (final loop)

A whole-app sweep against the §1.2 quality bar. Screens re-shot in `docs/screenshots/m18/`:
welcome (light/dark), populated 3-pane (light/dark), density comfortable vs compact, command
palette, keyboard focus ring. **Zero console errors across every screen.**

**Accessibility — measured, not assumed.**
- *Contrast.* Computed WCAG ratios for every text/background token pair. All passed **except dark
  `--text-muted`** (neutral-500): 4.18 on `--bg`, 3.78 on `--surface`, 3.19 on `--surface-elevated`
  — below AA (4.5) for body text. Added a ramp step `--neutral-450 #8d8d8d` and pointed dark
  `--text-muted` at it → **4.56–5.97 across all dark surfaces, AA everywhere.** (Light muted already
  cleared 4.5; left unchanged.)
- *Keyboard.* Every action reaches the keyboard via the command palette (⌘K); added a **Toggle
  density** command so density isn't mouse-only. `Tab` shows a clear `:focus-visible` ring
  (screenshot `focus-ring.png`).
- *Reduced motion.* `motion.css` collapses all animation/transition to ~0ms under
  `prefers-reduced-motion: reduce`, without removing feedback.
- *Colour-blindness.* The diff was already redundant — `+`/`−` (U+2212) gutter glyphs plus
  strikethrough on deletions — so it never relies on hue alone.

**Onboarding.** First launch is never a cold screen: a centred **Welcome** with the brand mark, the
`.velq` value prop, *New document* / *Open a folder* CTAs, and three keyboard hints; the sidebar and
list carry quiet empty-state copy ("…it's just a folder on your computer", "Your documents will
appear here"). The mock vault seeds a `Welcome.md`.

**Density & scale.** The comfortable/compact toggle visibly retunes row rhythm (`--row-h`,
`--list-row-h`); the file tree is virtualized (`@tanstack/react-virtual`, overscan 14) so a
10k-file vault stays smooth.

**§1.2 checklist:** file-manager parity (Quick Look / inline rename / spring-loaded DnD / breadcrumb
/ always-visible search / preview list), GitHub-quality diff, warm first-run, dark+light, reduced
motion, keyboard operation, AA text, and large-vault virtualization are all in place. The remaining
box — `cargo tauri build` artifact launch — is M19's deliverable.

**Verdict:** the calm bar from the spec holds under audit, not just by eye — contrast is measured AA,
motion respects the OS, and nothing is mouse-only.

---

## M19 — Cross-platform, performance & distribution

Mostly release machinery; the UI touches are a calm updater toast and a **Check for updates…**
command. Details in [`docs/distribution.md`](distribution.md).

- **Release build verified.** `tauri build` (with the updater signing key exported) produced
  `Velq.app`, `Velq_0.1.0_aarch64.dmg`, **and the signed updater pair** `Velq.app.tar.gz` +
  `.tar.gz.sig` — proving `createUpdaterArtifacts` + minisign signing work end-to-end. Launched the
  bundled `Velq.app` binary (loads from the packaged dist, *not* the dev server): process stayed up,
  no panic. This satisfies the M19 ✅ "artifact launches".
- **Auto-updater.** `tauri-plugin-updater` polls this repo's Releases `latest.json` and verifies
  against the embedded minisign pubkey; `tauri-plugin-process` handles the relaunch. Frontend
  ([`update/updater.ts`](../apps/desktop/src/update/updater.ts)) is a single toast with an
  *Install & restart* action — a silent check ~3 s after launch plus a manual command. Generated a
  real keypair via `make keygen`.
- **File associations.** `.velq` (Viewer) / `.md`·`.markdown` / `.html`·`.htm` (Editor). macOS
  delivers via `RunEvent::Opened` (stashed in `OpenedFilesState` since it can precede the webview);
  Windows/Linux via launch argv. The frontend pulls them on mount (`get_opened_files`) and listens
  for runtime `files-opened`; a plain doc adopts its folder as the vault so Save works, a `.velq`
  opens straight into the sandboxed viewer.
- **Performance.** Tree is virtualized (`@tanstack/react-virtual`, overscan 14); filename search
  debounces at 140 ms; the Rust fs-watcher coalesces atomic-save churn at 400 ms.
- **CI/CD.** `.github/workflows/release.yml` (tag → `tauri-action` matrix: macOS arm64+x86_64,
  Windows, Linux → signed installers + `latest.json`) and `ci.yml` (fmt/clippy/test + lint/build).

*Deferred to manual QA / CI (no creds or GUI automation in this environment):* Apple notarized
signing (CI wires `APPLE_*` secrets; local build is ad-hoc-signed), Windows/Linux artifacts (CI
matrix), double-click file-open through Finder, the live updater round-trip against a published
release, and the clean-machine install→launch pass.

**Verdict:** the release path is real and exercised — a signed, updatable, file-associated `.app`
built and launched; the cross-OS and notarization gaps are environmental, not missing code.

---

## M20 — Landing page & OSS release

**velq.sh landing.** A focused single-page Astro site (`lp/`) that reuses the app's exact token
palette, so the marketing surface and the product read as one calm thing. Screenshots
`docs/screenshots/m20/landing-{light,dark}.png` — built and previewed, **zero page errors**:
- Hero (gradient mark, "A calm place to write Markdown & HTML", `.velq` value prop, Download +
  GitHub) over the real 3-pane app shot in a framed panel.
- A six-card feature grid, the `.velq` ZIP-tree explainer, per-OS download cards, Apache-2.0 footer.
- Dark mode holds the same AA-muted text from M18; `prefers-color-scheme` aware.
- Ready to ship: `wrangler.toml` + `pnpm deploy` (Cloudflare Pages); the live deploy is the one
  manual step that needs CF auth + the domain.

**OSS release.** Apache-2.0 `LICENSE` with a **PLUGIN EXCEPTION** (plugins via the published API are
not Derivative Works), `NOTICE` (third-party attributions), `CLA.md`, and a `README` with install
table + accurate component map (fixed the search line: `FsSearch` MVP, Turso later — no swap). `.github`
carries `release.yml` (tag → signed multi-OS installers + `latest.json`) and `ci.yml`.

**Docs (§17) complete.** Added the two missing deep-dives — [`architecture.md`](architecture.md)
(layers, flows, the zero-capability viewer security model) and
[`file-manager-ux.md`](file-manager-ux.md) (every §9 pattern + the Finder/Obsidian benchmark) —
alongside the existing requirements / ui-ux-spec / velq-format / plugin-api / distribution / this log.

**Definition of Done (§1) — all boxes checked.** Functional (13/13) and quality (6/6) are fully
done and verified; release (4/4) is code-complete with the live Cloudflare deploy, the notarized
macOS signing, and making the GitHub repo public as the remaining human-credential steps. Final
green sweep: frontend build ✓, 11 Rust test suites ✓, lint ✓, landing build ✓, `Velq.app` + `.dmg`
+ signed updater artifact present ✓.

**Verdict:** Velq Phase 1 is complete — a calm, secure, self-updating Markdown/HTML editor with the
`.velq` format as its differentiator, open-sourced under Apache-2.0 with a real landing page and a
working release pipeline.

---

## M21 — Workspace shell, Finder explorer, file undo & native menu (post-Phase-1, user-driven)

A batch of user-requested upgrades, each verified in the dev server (mock backend) and shipped to
the native `.app`. Screens in `docs/screenshots/m21*`. **Zero console errors across the sweep.**

- **VSCode-style activity bar + view routing.** A left rail switches the main view between
  **Explorer / Editor / Settings** (`useUI.view`), with theme + settings at the foot, plus a
  dedicated **Open & package HTML** button. Active view carries the accent indicator.
- **Proper Settings page.** Theme as Light / Dark / System **swatch cards** (the "white bg / black
  bg" ask), density, reading font, editor defaults, Vim, and a Packaging toggle. Writes straight
  through the persisted settings store.
- **Finder-grade Explorer.** *Honest correction:* the `columns` view was a type stub, not built.
  Now it's a real **Miller-columns** browser — click a folder, the next column opens to its right;
  blue selection, the full drill path visible at once — plus a List/Columns switch. (Earlier docs
  over-claimed this; corrected.)
- **HTML → always auto-package.** Opening an HTML file traces its deps and writes a `.velq` into
  `Documents/Velq` (proven: ran the bundler on a real `page.html` → 3 assets collected, every
  `<img>/<script>/<link>` rewritten to `assets/…`). Entry points: activity-bar button, Welcome,
  command palette, and clicking an `.html`. Toggle in Settings.
- **File-operation undo/redo.** `⌘Z`/`⌘⇧Z` undo create / delete / rename / move / duplicate
  (deleted files are restored from captured content). Verified: create → `⌘Z` removes → `⌘⇧Z`
  restores.
- **Native menu bar** (Velq / File / Edit / View / Window / Help) wired to the command actions via
  a `menu` event.
- **Focus-routed Undo (the VSCode behaviour the user asked for).** Naïvely, a menu `⌘Z` accelerator
  intercepts the key before the webview and breaks both the editor's and the file manager's undo.
  Fixed by a *custom* Edit→Undo/Redo that forwards to the frontend, which uses
  `EditorView.findFromDOM(document.activeElement…)` to route: cursor in the editor → CodeMirror
  undo; otherwise → file-operation undo. So one `⌘Z` does the right thing per focus, and the menu
  still shows `⌘Z`.

All gates green (lint / clippy `-D warnings` / fmt / `cargo test` / frontend build); the signed
release `.app` builds and launches.

**Verdict:** the calm core now sits in a familiar VSCode-like frame with a true Finder column view,
reversible file edits, and a native menu — without losing the quiet. Where a claim outran the code
(columns), it was called out and made real.

### Icon grid — the beginner-first file view

Researched the file managers people call easiest to read in 2026 — **Spacedrive** (the Rust/Tauri
one, big colour thumbnails) and the **Files app** (Windows 11 Fluent: a grid of large icons with a
breadcrumb). Both lead with *large, colour-coded icons in a grid* — the opposite of VSCode's dense
grey tree. So the Explorer now defaults to an **Icons** view built to be obvious to a complete
newcomer:

- **Recognisable, colour-coded glyphs everywhere** (`FileGlyph` + `fileVisual`, hues in
  `tokens.css`): a folder is always the same blue folder; Markdown teal, web/HTML orange, images
  green, PDF red, code violet, archives amber, audio pink, video sky. One source of truth, now used
  by the grid, list, columns **and** the tree (they were tiny grey outlines before).
- **Roomy icon grid** with **Folders / Files** group labels and a clickable **breadcrumb**
  (🏠 Notes › Clients › Acme) + Back button, so "where am I" is always answered. Double-click opens
  a document or drills into a folder, exactly like Finder; New-document / New-folder live on the bar.
- **Three views** now — Icons (default) / List / Columns — switchable from the toolbar and from a
  new **Settings → Files → Default view** control.
- Verified via Playwright in light, dark, and drilled-in states: the colour icons read on both
  themes, the breadcrumb navigates, no console errors. Screenshots in `docs/screenshots/m21-grid/`.

Also fixed a *test-only* race in `velq-bundler`: parallel `#[tokio::test]`s could mint the same temp
dir name on macOS's coarse `SystemTime`, so one test's cleanup deleted a dir another was still
bundling → spurious "No such file". `tmpdir()` now appends an atomic counter; `cargo test
--workspace` is green across repeated runs.

### Home "Recents" — recently opened & recently added

Finishing the Finder/Files-app Home: when you're at the vault root, the Icons grid now opens with two
"Recents" shelves above Folders / Files, so you land on what you were just doing.

- **🕐 Recently opened** — every document you open is remembered (newest first), persisted with your
  settings (`recentDocs`, capped at 30; recorded in `useDoc.open` and on `.velq` viewer opens). It
  survives restarts and updates live.
- **✨ Recently added** — a new `recent_files` Rust command walks the vault and ranks files by
  filesystem **create time** (`created`, added to `FileNode`; falls back to mtime). It only shows
  files **buried in subfolders** (root-level ones are already in "Files", and anything already in
  "Recently opened" is dropped), so the shelf is purely additive — exactly the items you'd otherwise
  have to dig for.
- Both are Home-only and double-click to open, same `Tile` as everything else. Verified light + dark
  via Playwright (open two docs → both shelves populate, no console errors); shots in
  `docs/screenshots/m21-grid/grid-recents-{light,dark}.png`.

### No-confusion onboarding — one home, land on the icons, drag-and-drop in

Three changes so a newcomer can't get lost (the user's "迷わないように"):

- **Launch lands on the icon browser.** Default view is now the **Explorer (Icons grid)**, not a
  blank editor — you open *into* your files. Verified: a no-hash startup lands on `.explorer` with
  **Icons** pressed (`docs/screenshots/m21-grid/landing-light.png`).
- **One home: `Documents/Velq`.** Instead of a cold "pick a folder", launch opens your last vault
  or, on first run, **creates and seeds `Documents/Velq`** (new `ensure_default_vault` command) — the
  same folder packaged `.velq`s already land in, so there's exactly one place for everything. Seeded
  once with **Documents / Projects / Archive** + a `Welcome.md` (chosen by the user; freely
  renamed/deleted since they're just folders).
- **Drag a `.velq` (or any file) onto the window** → it's copied into your Velq folder (new
  `import_file` command, binary-safe; `useFileDrop` via Tauri's `onDragDropEvent`). A dashed
  "Drop to add to your Velq folder" overlay appears while a drag hovers. OS-native event, so it's
  verified in the built `.app` rather than the dev server.

All gates green (lint / tsc+vite / fmt / clippy `-D warnings` / `cargo test --workspace`).

## M22 — Trust & the everyday: autosave, session history, live 文字数 (post-Phase-1, [proposals.md](proposals.md))

First milestone off [proposals.md](proposals.md) — the **信頼と日常 (Trust & the everyday)** theme. Goal:
make the "All changes saved" promise real (spec §0-4, §4.2) and give the Japanese author a count that
actually means something. Frontend-only — no change to the git-backed `velq-vcs` crate or any Tauri
command, so the save→diff→restore round-trip is untouched.

### D1 — Autosave + session-grouped history

- **Autosave (spec §4.2 cadence).** A new `useAutosave` hook (mounted once at the app shell) saves the
  active document **~2 s after you stop typing**, and **at least every 10 minutes** through one unbroken
  writing burst. It reuses the existing `save_version` path, so every autosave is a real, restorable
  version. **⌘S stays** an explicit checkpoint (spec §5.3), and **closing a tab flushes** unsaved edits
  first (`useDoc.close`) so work is never silently dropped. `saveActive` now clears "Editing" only when
  nothing changed mid-save (and you're still on the same doc), so keystrokes typed *during* a save
  aren't stranded as "saved".
- **Self-write guard — the enabling fix.** The vault watcher echoes our own writes back as `fs:changed`;
  unguarded that reloaded the editor (a jarring remount) or — once autosave writes every couple of
  seconds — raised a **false "this file changed on disk" conflict** mid-sentence. New
  `util/selfWrites.ts`: the vcs IPC wrappers `mark()` the path they're about to write and the
  `fs:changed` handler `consume()`s it, skipping the reload/conflict for a short (2.5 s) window;
  `reloadTab` also no-ops on identical bytes. This quietly cures the same remount on a plain ⌘S too.
- **Session grouping (spec §4.2, "coalesce rapid auto-saves into expandable session groups").** Autosave
  would otherwise turn the timeline into a keystroke firehose, so the history panel now coalesces a run
  of saves with no >20-min gap into **one session entry** — its latest state shown, a count pill, and a
  ▸ to reveal the minute-by-minute snapshots beneath. Purely presentational (`history/sessions.ts`,
  unit-tested); every version is preserved and individually selectable once expanded, and a lone save
  still renders as a plain row so nothing regresses for infrequent savers.

Benchmarks: this is Google-Docs-style *session* history (not VS Code's flat per-save Timeline), and it
holds the spec's **one unified list — never a hidden-by-default filter** rule (sessions expand in
place; nothing is dropped).

### J1 — A count that speaks the language you're writing in

The status bar read `N words`, meaningless for Japanese (no inter-word spaces). It now shows the metric
that fits the text: **`1,204 文字`** when the doc is CJK-dominant (≥20 % Han/kana), **`340 words`**
otherwise — thousands-separated, with the other count one hover away. `countChars` counts code points
minus whitespace (incl. the ideographic space U+3000), matching Japanese manuscript counting. Pure
helpers in `util/text.ts`, unit-tested (12 cases).

### Gates

tsc + `vite build` green · Biome clean · Vitest **19/19** (new `text` + `sessions` suites) ·
`cargo test --workspace` green incl. the `velq-vcs` save→diff→restore round-trip · `velq-desktop`
compiles. A dev instance was already live on the vite port (HMR-reloaded these changes); I left it
running rather than fighting for the port. **Honest gap:** no headless-capture harness is wired and the
dev port was in use, so pixel screenshots into `docs/screenshots/m22/` are the open follow-up — visual
confirmation for now is the running instance.

### Carried forward (M22 theme, not yet done)

D2 gutter change-bars · D3 version naming + "named only" filter · Q2 Open Recent · Q4 Saved-pulse
microinteraction · D16 shortcuts in the context menu.

## M23 — Speak the user's language: full JA/EN i18n (proposals.md J2, pulled forward)

The author is Japanese and asked for the app "in both Japanese and English (ideally many languages)."
That's proposals.md **J2**; done now rather than at M26. **~215 user-facing strings inventoried; the
whole webview UI + the native menu are now bilingual with a live in-app switch** — no restart.

### The i18n layer (`src/i18n/`)

- **Dictionary-based, zero deps.** `en.ts` is the source of truth (`as const`); `MsgKey = keyof typeof en`
  and `Dict = Record<MsgKey, string>`, so **`ja.ts` is typed to mirror every key — a missing/renamed key
  fails `tsc`**. Adding a language is literally one new dictionary file.
- **Reactive + non-reactive access.** Components use `useT()` (re-renders on language change);
  stores/actions/transient toasts use the module `t()`, kept in sync by the settings store. `useLocale()`
  exposes the resolved locale for `Intl`/`toLocale*` date formatting.
- **`resolveLocale`** maps the `system | en | ja` preference to a concrete locale — "system" follows
  `navigator.language`. A new **Language** selector sits at the top of Settings.
- **House rule enforced in JA too:** no git vocabulary in translations — 版 / 保存履歴 / 変更点 / 元に戻す,
  never コミット/マージ/リポジトリ.

### Coverage

- **Every webview surface**: status bar, toolbar, tabs, breadcrumb, activity bar, sidebar, command
  palette + `?` cheatsheet, settings, welcome, file browser (icons/list/columns + empty states),
  right-click menus, Quick Look, version-history panel + diff bar, conflict banner, plugins panel,
  drop zone, and all toast/notification/error copy. Command titles moved to `Action.titleKey` so the
  palette translates them live.
- **Native macOS menu** (File/Edit/View/…): `build_menu(app, locale)` + a new `apply_menu_language`
  command; the frontend resolves the language and calls it on startup and on every change, so the menu
  **switches live** (not restart-only). OS-provided items (About/Quit/Cut/Copy…) localize themselves.
- **`util/time.ts`** now translates "just now / Nm ago / Today / Yesterday" and formats dates/clock in
  the locale. Fixed a latent coupling: the history panel compared `label === "Today"` against
  `util/time` output — now it groups by a **stable `dayKey`** ("today"/"yesterday"/ISO) and formats the
  visible label separately, so day-grouping can never break when the language changes.
- The `文字 / words` status-bar count stays **document-driven** (J1) — it reflects the language you're
  *writing*, independent of the UI chrome language.

### How it was built

Catalogs authored by hand (JA quality matters here); the ~150 mechanical string→`t("key")` swaps ran as
**three parallel agents over disjoint files**, with `tsc` (keys are a typed union) + Biome as the safety
net. Interface/rich-text/coupled files (actions, palette, cheatsheet, status bar, Welcome, plugins,
time+history) done by hand.

### Gates

tsc + `vite build` green · Biome clean (113 files) · **Vitest 25/25** (new `i18n` suite asserts JA
mirrors EN's keys, no empty values, and **`{placeholder}` tokens match across locales**) ·
`cargo test --workspace` green · `velq-desktop` compiles (menu API `app.set_menu`).

### Honest gaps (English for now, documented)

Rust command **error strings** (surfaced verbatim in toasts), the **`velq-vcs` version summaries**
("3 added · 1 removed" — needs added/removed counts on the DTO to format on the frontend), plugin
descriptions, and the seed `Welcome.md` / default file names (real on-disk names — deliberately left).
Backend (menu, locale persistence) needs a `tauri dev` **restart** to take effect in an
already-running instance; the webview switch is live via HMR.

## M24 — Drag-and-drop in every file view

The sidebar tree already shipped a nicely-built internal drag-and-drop (move / Alt-copy / spring-load /
undo / self-and-descendant guards), but the **icon grid, list and columns views had none** — so the
default beginner view (icons) couldn't rearrange files by dragging. Extended it to all of them.

- **One shared hook `filemanager/useFileDnd.ts`.** Lifted the tree's logic into `dragProps(node)` +
  `dropProps(dir, onSpring?)` getters that any view spreads onto its rows/tiles. Drag a file or folder
  onto a folder to **move** it; hold **Alt/Option to copy**. Reuses the store's undoable
  `moveNode`/`copyNode` and the `move_path` command — **zero backend change**. A `canDrop` guard blocks
  dropping onto itself, into its own descendant, or into the folder it already lives in.
- **Refactored the tree onto the hook** (one implementation, not two) — behaviour preserved, plus the
  new no-op-move guard.
- **Icon grid**: folder tiles are drop targets, every tile is a drag source, and **ancestor breadcrumbs
  accept drops** — drag a file onto a crumb to move it up a level (the one direction a single-folder grid
  otherwise can't express).
- **List**: folder rows are drop targets, cards are drag sources.
- **Columns**: folder rows are drop targets with **spring-load** — hover a folder mid-drag and its column
  opens so you can drop deeper, Finder-style.
- Drop target gets the same **accent ring** as the tree (`--accent-subtle` + inset accent border), added
  as a shared style so every view reads identically.

Multi-select drag is intentionally out of scope (needs multi-select first — proposals **D14**); this is
single-item drag, matching what the tree already did.

**Gates:** tsc · `vite build` · Biome (114 files) · Vitest **25/25** — all green. No Rust touched.

## M25 — Open HTML to edit + tweak text on the rendered preview (W6 prototype)

Two things the user asked for: (1) opening an HTML file should let you **edit** it, not silently package
it; (2) for small wording changes, edit the text **on the rendered result** — big/structural/design
changes stay in code (or, later, AI). This is the first slice of proposals **W6** (§3.2), built on the
insight that the preview iframe is **same-origin**, so the parent can drive it directly — no script runs
inside it, the sandbox is intact.

- **Open-to-edit (the prerequisite, "B").** `openFile` (Velq's own file browser) no longer auto-packages
  HTML — opening always edits. Packaging stays an **explicit** action (command palette *Open HTML &
  package*, the Welcome tile, *Export to .velq*). `autoPackageHtml` now applies **only** to the OS
  *"Open with"* path and defaults **off**; en/ja copy updated to say so. HTML then lands in **Split**
  (existing default), so you get source-left / rendered-right.
- **The heart: `preview/htmlTextMap.ts` (pure, 18 tests).** Walks the source once and records every run
  of between-tags text with its **source offsets + raw slice + decoded value**, in document order. The
  iframe's text nodes come out in the same order, so the *n*-th node maps to the *n*-th run — which is
  what lets an edit write back to the **right** place instead of a blind string replace (a second
  identical word can't be clobbered). `extractBodyTextRuns` scopes to `<body>` so `<head>` whitespace
  (which browsers drop from the DOM) can't desync the counts. `rebuildHtml` keeps an unchanged run's raw
  bytes verbatim (entities/spacing survive) and only re-encodes runs that actually changed.
- **`PreviewPane` editable mode (HTML only).** Sets `contenteditable` on the iframe body and, on `input`,
  recomputes the source via the map and calls back. If the live text-node count no longer matches the
  runs, the edit was **structural** (node added/removed) — we leave the source alone rather than guess,
  so "tweak the wording" stays safe and structure edits go through the code pane.
- **`SplitView` wiring, loop-safe.** A preview edit dispatches the rewritten source into the
  (uncontrolled) left editor; its update listener runs `onChange` and the debounced `setPreviewSource`
  lands on the string the iframe **already shows**, so a **round-trip guard** in `PreviewPane`
  (`source === liveSource`) skips the rewrite — no infinite left↔right loop, and the reader's caret never
  jumps. Edits mark the doc dirty → autosave + save-history pick them up unchanged.

### Honest gaps (prototype scope, documented)

- Each preview keystroke dispatches a **full-document replace** into the editor — correct, but coarse
  undo granularity; coalescing is a follow-up.
- **HTML fragments** (no `<body>`) aren't preview-editable yet (edit on the left); Markdown preview
  editing is **not** attempted (needs rendered-DOM→Markdown, a harder inverse — deferred as noted in W6).
- Hand-rolled scan, not a full parser: a literal `>` inside a quoted attribute can end a tag early
  (rare; acceptable for tweak-scope).
- Not yet done: a visual `cargo tauri dev` pass, and the mode UX cleanup (HTML's Live→Split swap) that
  W6 is the natural moment to fix — left for the next UI loop.

**Gates:** `tsc --noEmit` green · `vite build` green · Biome clean (touched files) · Vitest **43/43**
(new `preview/htmlTextMap` suite, 18) — all green. **No Rust touched.**

## M26 — Multi-select & bulk operations (proposals.md D14)

The file browser could only ever act on one item. D14 makes it Finder-grade: select many, then move /
rename / delete / group them at once. Built on the M24 drag-and-drop; **no Rust change** — every bulk op
composes the existing undoable `move_path` / `create` / `rename` / delete-to-Trash commands.

- **Selection model in the store.** `selected` stays the *lead* (drives previews / `targetDir`);
  a new `selection: Set<string>` holds the multi-selection (the lead is always in it, kept in sync by a
  `leadState` helper wired through every place that sets a single active item). Actions: `select`
  (replace), `toggleSelect` (Cmd/Ctrl-click), `rangeSelectTo` (Shift-click, within the view's visible
  order), `selectAll`, `clearSelection`. Unit-tested (`files.selection.test.ts`, both range directions +
  the lead invariant).
- **Every view, one behaviour.** A tiny `selectionClick(e, node, ordered)` helper (Cmd/Ctrl = toggle,
  Shift = range, plain = select-then-open) drives the tree, icon grid, list and columns identically;
  each highlights `selection.has(path)`. `useSelectionKeys(ordered)` adds **Cmd/Ctrl+A** (select all),
  **Esc** (clear) and **Cmd/Ctrl+Delete** (Trash — modifier-guarded so a stray Backspace never deletes).
- **Bulk operations, each a single undo.** `removeSelected` (captures file contents first, one Cmd+Z
  restores them all), `moveMany` / `copyMany` (multi-drag — grabbing a selected item drags the whole
  selection), `newFolderFromSelection` (Finder's "New Folder with Selection" — make a folder, move the
  selection in, prompt to name), and `renameMany`.
- **Batch rename with live preview** (`BatchRenameDialog`). Three modes — **Find & Replace**, **Add Text**
  (prefix/suffix), **Numbering** — operate on the name *stem* and keep each extension. The preview lists
  every `old → new` and **blocks Apply on any collision** (duplicate outputs, or a clash with a sibling
  that isn't in the batch); applies as one undoable step.
- **Discoverable surfaces.** A **selection action bar** slides in under the explorer when 2+ are selected
  (count · New Folder · Rename… · Delete · clear), and the tree's right-click menu becomes multi-aware
  (right-clicking one of several keeps the set). Fully bilingual — all new strings went through the
  `en`/`ja` catalogs.

- **Marquee (rubber-band) select** in the icon grid, **list and columns** (`useMarquee`): press on empty
  space and drag a rectangle — the rows/tiles it touches select **live**, Shift/Cmd **adds**, a bare
  click on empty space **clears**. Rows carry a `data-path`; the sweep hit-tests their client rects
  (throttled so it only re-selects when the hit set changes) and a `setSelection` action replaces the
  set wholesale. A small move threshold keeps plain clicks intact, and it never fires on a row (the
  item-drag is untouched).

### Follow-up (same milestone): right-click menu everywhere + a plain Delete key

The bulk actions existed but the only way to reach them outside the sidebar tree was the selection bar.
Two gaps closed:

- **A context menu in every view.** Extracted the tree's menu into a shared `fileMenuEntries(node, t,
  emptyDir)` + a `useFileContextMenu()` hook (which renders the existing `ContextMenu`, preserving a
  multi-selection when you right-click one of several). Wired into the **grid, list, columns** (on items
  *and* the empty area → New Folder / New Document there) and refactored the **tree** onto the same hook
  — one menu definition, four views. Single-item **Rename** opens the rename dialog with a plain **Name**
  field (the dialog now has a single-target mode); the tree keeps its fast **F2 / double-click** inline
  rename.
- **Delete key.** `Delete` / `Backspace` (no modifier needed) now trashes the selection — but only in the
  file browser and never while typing, and deletes go to the OS Trash and undo, so it's safe.

**Gates:** tsc · `vite build` · Biome clean (126 files) · Vitest **48/48** — all green. **No Rust
touched.**

## M27 — HTML edits like a page, for real: full-pane Rendered mode + structural write-back (W6 slice 2)

The bar the user set (and the landing page promises): "a browser only *displays* HTML — Velq edits it,
as you see it." M25's prototype could only tweak wording: structural edits were **silently dropped**,
and HTML always forced Split. This slice makes the rendered page itself the editor.

- **Structural write-back — `replaceBodyHtml` (htmlTextMap, pure, +5 tests).** When the live text-node
  count no longer matches the source's runs — Enter made a paragraph, ⌘B wrapped a word, an element was
  deleted, rich content was pasted — serialize the body's `innerHTML` and splice it over the source's
  body range. Doctype, `<head>` and the `<body>` tag's own attributes stay **byte-for-byte**; text-only
  edits still take the precise offset path from M25 (untouched bytes stay identical). The DOM is
  authoritative, so a mapping miss self-heals on the next serialization.
- **Rendered mode (HTML × Live).** `EditorPane` maps HTML+`live` to a new full-pane `RenderedView`
  instead of forcing Split; the segmented control's third item reads **Rendered / 見たまま** for HTML
  (and JA now says 見たまま for Markdown live too — one mental model, spec §3's "syntax vanishes"
  and this are the same idea). `editorMode` defaults to `live`, so opening an AI-generated HTML file
  lands **directly on the editable page** — the LP's hero story is now the product's default behavior.
  Split and Source stay one toggle away; edits flow through `reportChange`, so dirty state, autosave
  and save-history are untouched.
- **Keyboard, both sides of the iframe.** ⌘B/I/U bold/italicize/underline in place (write-back runs
  synchronously after `execCommand` rather than trusting the engine to fire `input`); ⌘S/⌘K/⌘P/⌘N/⌘O/
  ⌘⇧F/⌘\ are re-dispatched on the parent window so app shortcuts keep working while the caret is in
  the page. ⌘Z is deliberately left to the iframe's native contenteditable undo.
- **IME correctness.** Mid-composition `input` events don't write back (half-composed Japanese never
  hits the source); `compositionend` commits the run.
- **Fragments.** A file without `<html>` is its own body — now editable too (M25 skipped it).
- **A StrictMode bug the prototype hid:** the round-trip guard (`source === liveSource`) returned early
  after StrictMode's simulated unmount had already turned `contenteditable` off, leaving the pane
  read-only until an external rewrite. Split masked it (any left-pane keystroke re-attaches); rendered-
  only exposed it. The guard now also checks `body.isContentEditable` in the live DOM.

Verified with Playwright against the mock frontend (screenshots in `docs/screenshots/m27/`): typed on
the rendered page (run-map path), Enter + a new paragraph (structural path), word-selected ⌘B
(formatting path), flipped to Source — all three edits present at the right offsets with
`<title>`/doctype untouched — then back to Rendered with nothing lost. The JA pass confirms the
見たまま label and CJK write-back.

### Honest limits (documented, for the next loops)
- A structural edit rewrites the body region in one go, so that save's version diff is coarser than a
  text tweak's (text-only edits remain byte-minimal). Coalescing/undo granularity from M25 still stands.
- Attributes, `<style>`/`<script>` bodies and `<head>` still edit in Source/Split — by design (the calm
  scope is *content*, not markup surgery; that's W7 element-selection territory).
- Serialization normalizes what the parser normalized (`<br/>`→`<br>`, attribute quoting) — but only
  when a structural edit actually happened; pure text tweaks never reformat.

**Gates:** `tsc --noEmit` green · `vite build` green · Biome clean (45 files checked) · Vitest **53/53**
(htmlTextMap 18→23). **No Rust touched.**

## M28 — Drop an HTML, get a .velq (+ collision-proof package names)

Two field reports from the user's first real session with the built app:

- **Dropping an HTML onto the window only copied it into the vault** — and a bare copy of
  `index.html` is actually *broken* (its relative css/img/js stay behind). Now an OS drop of
  `.html`/`.htm` with **auto-package on** runs the same `packageAndStage` as the OS "Open with"
  path — dependencies are traced **from the file's original folder** and a self-contained `.velq`
  lands in `Documents/Velq`. Everything else dropped (`.md`, `.velq`, images) still just copies
  into the open vault; with auto-package off, HTML copies too (no magic for opted-out users).
- **`index.velq` collides with itself all day** (user: 上位のフォルダ名-{filename} がいい).
  Adopted with one refinement: only stems so generic that every site ships one
  (`index`, `home`, `default`, `main`, `page`, `document`, `untitled` — case-insensitive) get the
  parent-folder prefix: `portfolio/index.html` → **`portfolio-index.velq`**, while a distinctive
  name (`Q2レポート.html`) stays itself rather than becoming `Documents-Q2レポート.velq`.
  The existing ` 2` numbering stays as the backstop. Logic is `velq_stem` in
  `commands/bundle.rs` (2 new unit tests).

**Gates:** `tsc --noEmit` green · Biome clean · `cargo test -p velq-desktop` **7/7** · clippy clean.

## M29 — Preview templates (Paper / Docs / Note / Magazine, then Tech / Sky / Glass)

Field report (user): the single Markdown preview is 見づらい — H2s and bold don't stand out, and a
"published page" feel was missing. Rather than a theme store, four opinionated templates now live in
`previewStyles.ts` as a registry (each a self-contained light+dark stylesheet, since the sandboxed
iframe can't reach the app's CSS variables):

- **Paper** — the original calm serif; stays the default, byte-for-byte the same look.
- **Docs** — the GitHub reading experience (sans, bordered H1/H2, familiar tables/code).
- **Note** — Notion/Bear-style: violet accent-bar H2 with a gradient band, callout-card quotes,
  rounded bordered tables, accent list markers.
- **Magazine** — editorial: display-sans headings over serif body, H1 signature underline, banded
  H2, diamond H3, **bold gets a marker highlight**, pull-quote cards, dark contrast code blocks,
  accent table rules. The "make it obvious" answer to the field report.

One persisted setting (`previewTemplate`, Rust `Settings` + serde default keeps old
`settings.json` valid), applied everywhere rendered Markdown appears: split preview, Quick Look,
and HTML/PDF exports — an export looks like the preview it came from. HTML documents are never
templated. Switcher = palette icon in the editor toolbar (markdown + split only, reusing
`ContextMenu`) + a Settings → Appearance segmented control; both i18n'd (EN/JA).

Verified by rendering a representative EN/JA document through all 8 template×theme combinations in
headless Chrome (`docs/screenshots/m29/`): H2/bold hierarchy reads at a glance in Note and
Magazine; Docs matches GitHub; Paper unchanged; dark variants keep contrast (marker highlight
becomes a dark amber band, still legible).

**Gates:** `tsc --noEmit` green · Biome clean · Vitest **57/57** (new `previewStyles.test.ts`:
distinct stylesheets per template, paper fallback for unknown persisted values) · `cargo check`
green (settings field only).

### Round 2 — three more, from the user's own references

Request: 「zennやnani翻訳みたいなのも増やして。もしくは tategazou.com の見た目とか。」 Palettes were
lifted from the actual sites (Zenn's `#edf2f7`/`#0f83fd`, Nani's CSS custom properties
`--color-primary #12a8ff` / `--color-primary-bg #ebf6ff`, tategazou's `styles.css` — paper
`#f6f2ec`, teal `#a0d3d9` / orange `#f29441` / red `#f2380f`, frosted `rgba(255,255,255,0.76)`
cards). Shipped as generic names — no brand names leak into the UI:

- **Tech**（テック, Zenn-inspired）— white article card on blue-gray, airy 1.9 line-height,
  bordered H1/H2, navy code blocks.
- **Sky**（スカイ, Nani-inspired）— sky-blue pill H2, extra-round 32px card, dotted links & hr,
  round accent dots on H3/bullets.
- **Glass**（ガラス, tategazou-inspired）— frosted `backdrop-filter` card over a fixed
  teal→orange→red gradient mesh, gradient H1 underline + H2 pill + hr, orange marker-highlighted
  bold. These three introduce a page-behind-card layout (body carries the 40vh scroll allowance
  instead of the prose column).

All 7×2 combinations re-verified in headless Chrome (screenshots added to
`docs/screenshots/m29/`); dark variants hand-tuned (Zenn/Nani/tategazou have no official dark
mode). Settings `.segmented` now wraps so the 7-option row folds instead of overflowing.

**Gates (round 2):** `tsc --noEmit` green · Biome clean · Vitest **57/57** (template loop tests
pick up the new ids automatically).

## M29 — Script-built pages package correctly · .velq opens in a tab · say that the page is editable

Three field reports from the user's second real session.

- **"Images fail in the bundle."** Ground truth (unzipped the actual `.velq`): the page built its
  `<img>` tags in JavaScript from a template literal (`velq-${k}-1024.png`), so no static reference
  existed and **zero assets were collected**. New bundler pass (`velq-bundler`, +4 tests): scan every
  script's text (inline and local `src=`) for path-looking tokens, expand `${…}` holes into `*` globs,
  and collect whatever exists on disk — **at the original relative path**, because JS can't be
  rewritten; the runtime-computed name then resolves inside the package unchanged. Existence on disk
  is the filter (a stray `foo.png` in a comment costs nothing); `..`/absolute/URL tokens are rejected,
  one glob is capped at 300 files (over-cap is reported, not silently truncated).
- **"Opening a .velq in a new window is annoying."** New setting **`.velq の開き方: タブ / 新しい
  ウィンドウ` — default: tab.** A `stage_velq` command registers the package for the `velq://` scheme
  and the tab shows it in a `sandbox="allow-scripts"` iframe — same isolation story as the viewer
  window (no IPC, `connect-src 'none'`), same URL, no unpacking. The tab wears a thin identity bar —
  package icon · name · 「パッケージ · 表示専用」 · **新しいウィンドウで開く** — so the pop-out is one
  click and the read-only nature is stated, not discovered. Mode segments and history are hidden for
  package tabs. All `.velq` opens route through one `openVelq()` (file browser, OS open, post-package
  toast, export toast).
- **"I can't find the edit button."** Two causes seen in the field: a persisted `editorMode:"source"`
  from an earlier build (HTML opened as code), and nothing on the rendered page saying it's editable.
  Now a **one-shot hint toast** on first Rendered view (「このページはそのまま編集できます —
  クリックして入力してください。コードで直すときは右上の「ソース」へ。」), persisted as
  `hintedRenderedEdit` so it never nags. The deeper "多くが直感的でない" deserves a proper UI loop
  (spec §13) next session — logged here as the trigger.

**Gates:** `tsc --noEmit` green · Vitest **57/57** · `cargo test --workspace` **22/22** (bundler 7,
incl. the gallery-shaped template-literal case) · clippy **0** · Biome clean.

## M30 — Evidence over guesses: the "broken images" post-mortem, closable panels, and a visible way into editing

The user re-tested and reported: images still broken in the package, the left columns can't be
closed, and "edit" still nowhere to be found. Investigated each with evidence this time.

- **Images: the package being opened predated the fix.** `~/Documents/Velq` held exactly one
  gallery package — 2,565 bytes, stamped 13:47, i.e. built by the pre-M29 bundler (the script-scan
  fix shipped 14:03). Nothing wrong with serving: the page text rendered fine in the tab, only the
  (absent) images 404'd inside the zip. Two hardenings so a stale artifact can't poison a test
  again: **(1) a committed end-to-end regression test that packages the actual repo gallery file**
  (`gallery_html_packages_with_its_script_built_images` — asserts the 11 template-literal PNGs are
  in the zip and readable back; 10.6 MB result vs the broken 2.5 KB), and **(2) packaging now opens
  the fresh result immediately** instead of leaving a toast race. The user's stale artifact was
  replaced in place with a verified package produced by the same library pipeline.
- **Left columns now close everywhere.** Before: the editor's ⌘\ hid only the tree (the list column
  stayed — read as broken), the reopen button lived *inside* the collapsed sidebar, and the Files
  view had no collapse at all. Now: ⌘\ (and a **PanelLeft toggle pinned to the editor toolbar,
  visible in both states**) collapses the editor view's **tree AND list together** (VS Code's
  one-keystroke-to-clean-canvas); the Files view's list mode gets the same toggle in its toolbar.
- **A visible road into editing.** Root cause of "エディットが行方不明": with auto-package on,
  HTML arriving from outside (drop / OS-open) *always* became a read-only package tab — the editor
  was never even shown, and the one-shot hint only fired inside the rendered view (which those
  users never reached). Fixes: the package tab's bar now carries **「元の HTML を編集」** (session
  provenance from packaging → `openPathForEdit`, which bypasses the auto-package rule); the hint
  moved to EditorPane and fires the **first time any HTML document opens, in any mode**.

Verified in the mock frontend (Playwright, `docs/screenshots/m30/`): hint toast appears with
`editorMode:"source"` (the user's exact persisted state), toolbar toggle collapses tree+list and
survives the collapse, explorer list-mode toggle works, everything reopens.

**Gates:** tsc green · Vitest **57/57** · `cargo test --workspace` **23/23** (new real-file e2e) ·
clippy **0** · Biome clean.

## M31 — The images WERE in the package: WebKit's `'self'` CSP vs the sandboxed tab

M30's replaced package (verified: 11 PNGs in the zip) still showed no images in the tab. Two
experiments closed it:

- **Chromium repro said the CSP was fine** — a sandboxed `allow-scripts` iframe with
  `img-src 'self'` still loaded images (Chromium resolves `'self'` from the document URL, opaque
  origin or not). Misleading: the app runs WebKit.
- **Field instrumentation told the truth.** A temporary log inside the `velq://` scheme handler
  (every request: id · path · hit/miss), then `open -a Velq <the .velq>` against the real app:
  with the CSP switched to an **explicit per-package origin** (`img-src velq://<id> …` instead of
  `'self'`), WebKit requested **index.html + all 11 PNGs, every one served (HIT)**. Under the old
  `'self'` policy those subresource requests were never made — WebKit does not resolve `'self'`
  inside a sandboxed (opaque-origin) iframe the way Chromium does.

Fix shipped: `velq_csp(id)` builds the policy per package — sources pinned to `velq://<id>` (one
package can also never reference another's files, which `'self'` never guaranteed either),
`connect-src 'none'` as always. The pop-out viewer window never had the bug (no sandbox → `'self'`
resolved). Diagnostic logging removed after the capture; unit test pins the no-`'self'` shape.

**Lesson for the log:** "renders in Chromium" ≠ "renders in WKWebView" — for anything
CSP/origin/sandbox-flavoured, verify in the engine we ship or instrument the shipped app itself.

**Gates:** `cargo test -p velq-desktop` **9/9** (new CSP-shape test) · clippy **0** · no TS changes.

## M32 — The app wears its own icon

The chosen brand mark (**a-paper** — the origami V, cream × navy, same as the landing page and
favicons) is now the desktop app's icon. `docs/brand/icon-candidates/velq-a-paper-1024.png` scaled
to the macOS Big Sur grid (824 px artwork centered on a 1024 canvas, so it sits at the same visual
size as neighboring Dock icons) → `cargo tauri icon` regenerated the whole `src-tauri/icons/` set
(icns / ico / pngs). Swapping to the runner-up **a-duo** later = rerun the same two steps with its
PNG.
