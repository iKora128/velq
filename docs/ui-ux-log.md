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
