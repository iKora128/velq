# Velq — UI/UX Design Spec (v1)

> Benchmarked, decisive, build-ready patterns for Velq — a Markdown/HTML viewer-editor for **non-technical writers**.
> Companion to `requirements.md`. Created: 2026-06-28.
> North star: **"As approachable as macOS Finder, but for writing."** Two nouns only — **folder** and **file**. Local-first, your-files-on-disk, calm and quiet.

Every pattern below cites the app it's drawn from and a one-line rationale. Recommendations are decisive; where research conflicted with `requirements.md` (e.g. inline-WYSIWYG vs 2-pane), the resolution is called out explicitly.

---

## 0. Ten product-defining decisions (read this first)

1. **Two nouns only: folder + file. A file is NEVER a container.** → Dodges Notion's single biggest failure (page-inside-page, "where is my file?"). *(Notion anti-pattern)*
2. **The tree IS the real disk.** Rename in-app renames on disk; "Reveal in Finder/Explorer" works; everything is portable `.md`/`.html`/`.velq`. → "These are just my files," zero translation layer. *(Notion anti-pattern → Obsidian/Finder)*
3. **Default file manager = two-pane (folder tree + file LIST with preview snippets)**, NOT a raw nested tree, with **Finder column view as a power option.** → Email/Apple-Notes layout normal people already know; recognition over recall. *(Obsidian "Notebook Navigator" / Apple Notes / Finder)*
4. **Show "Saved" loudly.** A persistent "All changes saved · just now" + word count in the status bar, and version history one click away. → Obsidian's invisible autosave is the #1 beginner anxiety; we cure it. *(Obsidian anti-pattern → VS Code)*
5. **Version history is a first-class, friendly feature** — a Google-Docs-style timeline ("Today / Yesterday / date"), preview-then-restore, **non-destructive**, GitHub-colored word-level diffs. **Banned words: commit, branch, HEAD, repository, diff, merge.** → Turns the git backend into the headline feature for nervous writers. *(VS Code Timeline + Google Docs + GitHub)*
6. **One command palette, Cmd+K (alias Cmd+Shift+P), prefix-driven**, context-ranked, with the shortcut shown on every row. → One door to the whole app; teaches its own shortcuts. *(Linear + Raycast + VS Code)*
7. **Editor defaults to CodeMirror 6 live-preview** (syntax markers hide as you type) in a single pane; **split source+preview is a toggle**, not the default. → Friendlier than a permanent two-pane for beginners while still honoring the requirement. *(Typora live-preview + Obsidian CM6 + requirements.md)*
8. **Markdown-native + tiny optional toolbar + auto-format.** Type `**bold**`, `# H1`, `- list`; markers auto-render. No 90-item slash buffet. → Word-like discoverability with Markdown-clean files. *(Typora/iA/Bear + Notion anti-pattern)*
9. **Calm visual system:** one accent on a neutral ramp, hierarchy from weight + whitespace (not borders/boxes), dark + light, subtle motion. Editor surface always solid/opaque (never translucent). → Reads as premium and quiet, like paper. *(Linear + Things 3 + iA Writer + Apple Liquid Glass guidance)*
10. **Never a cold empty start.** Seed a deletable "Welcome" doc that teaches by editing; warm one-line empty states; visible "New" everywhere. → Cold-start paralysis is what kills new-vault users in Obsidian/Notion. *(Things 3 + Craft + Obsidian anti-pattern)*

**Explicitly AVOID (anti-patterns observed):** global graph view (hairball, "fun to look at, useless to navigate" — Obsidian); stacked/sliding tabs (Obsidian); compact-folder path compression (VS Code, default OFF); a plugin marketplace at launch (Obsidian decision paralysis — curate instead); cryptic git letters `M`/`U`/`A` (VS Code — use plain colors/words); deep nested settings (Obsidian); databases/views/blocks (Notion); destructive overwrite-on-restore (Notion/Dropbox Paper); glass/translucency on content (Apple guidance); confetti/celebration noise (Things 3 deliberately omits it).

---

## 1. App shell & navigation

**Layout — three zones + status bar (VS Code / Obsidian / Things split):**

```
┌──────────────────────────────────────────────────────────────────┐
│  ⌘  Velq    Vault ▾        [ breadcrumb: Vault / Clients / Acme ]  │  title/toolbar
├────────────┬──────────────────────┬───────────────────────────────┤
│  SIDEBAR   │   FILE LIST          │   EDITOR (or preview/diff)     │
│  (nav)     │   (with previews)    │                               │
│            │                      │   right rail: Outline ▸        │
│  Favorites │   ▸ doc previews     │                               │
│  Vault tree│                      │                               │
│  Tags      │                      │                               │
├────────────┴──────────────────────┴───────────────────────────────┤
│  📍 Vault/Clients/Acme/draft.md   1,204 words   ✓ Saved just now   │  status bar
└──────────────────────────────────────────────────────────────────┘
```

- **Left = navigation, right = context.** Left sidebar holds Favorites + Vault tree + Tags; an optional right rail holds the **document Outline** (heading list) as the hero context panel. → A stable left-nav / right-context split is the proven calm model; Outline is the highest-value right panel for long-form writers. *(Obsidian; deprioritize Backlinks/graph)*
- **Status bar (bottom, always visible):** `📍 location` · `word count` · `✓ Saved just now` · (click-through to version history). → Word count + a loud save signal is exactly what writers want, and the natural home for the trust indicator. *(Obsidian status bar + the "show saved" cure for Obsidian's invisible save)*
- **Breadcrumb path bar** at the top of the editor: `Vault ▸ Clients ▸ Acme ▸ draft.md ▸ ## Current Heading`. Each crumb is a **click-to-jump target, a drop target, and a dropdown of siblings**; the final heading crumb's dropdown = instant outline jump. → Answers "where am I / how do I get back up" at a glance + lateral navigation. *(Finder path bar + VS Code breadcrumbs)*
- **Window chrome:** native traffic-lights on macOS; a thin unified titlebar that merges with the toolbar. Optional **restrained translucency on the navigation layer only** (titlebar/sidebar) via Tauri window vibrancy to feel native on macOS Tahoe — never on the editor/content. → Apple's explicit rule: glass belongs on the floating navigation layer, never on content. *(Apple Liquid Glass guidance; Tauri vibrancy)*
- **Tabs + split panes + multi-window** so a reference doc and a draft sit side by side. Split via **right-click tab → "Split right/down"** AND **drag a tab to a window edge**. → Discoverable (menu) + fast (drag); covers novice and power users. *(Obsidian / VS Code)*
- **Preview tab (the tab-explosion cure):** single-click a file = opens in a reused *italic* "preview" slot; the next single-click replaces it; **double-click or any edit promotes it to a permanent tab**. → Lets writers skim many notes without spawning 30 tabs. *(VS Code — strongly adopt)*
- **Navigation stack: `Esc` = back, breadcrumb = where-am-I** for drill-in views (settings, a file's actions). → One fearless "Esc backs out one level" model. *(Raycast)*
- **Pinned tab** (right-click → Pin): protected from being navigated away / closed by "close others." → Keeps your main doc anchored while you click around references. *(VS Code / Obsidian)*

---

## 2. File manager / sidebar — THE MOST IMPORTANT SURFACE

### 2.1 Decision: tree-view vs Finder column-view

**Recommendation: default to a TWO-PANE explorer (folder tree on the left column + file LIST with preview snippets on the right column); offer Finder-style COLUMN VIEW as a power toggle; offer a plain expandable TREE as a third option.** Remember the chosen view per-vault.

| View | Use it as | Why | Source |
|---|---|---|---|
| **Two-pane (tree + previewed file list)** | **DEFAULT** | The Apple Notes / Bear / email-client layout normal people already know; preview snippets (1–3 body lines) under titles give recognition over recall; separates "choose a folder" from "read the files." | Obsidian *Notebook Navigator*, Apple Notes, Bear |
| **Column view (Miller columns)** | Power toggle | Strongest "where am I" — the full path root→here stays on screen; arrow keys map 1:1 to the layout (→ descends); pair the rightmost column with a live document preview. | macOS Finder |
| **Plain tree (indent guides + carets)** | Option | Familiar OS mental model for those who want one pane; show each folder on its own row. | VS Code / Obsidian |

> Rationale for not making column view the default: it truncates long document titles behind hover and wastes horizontal space for shallow vaults. Two-pane-with-previews is friendlier for a writing app where titles are long and folders are shallow. Make column view a delightful, discoverable alternate for users who love Finder.

### 2.2 Sidebar structure (named sections, like Finder)

```
FAVORITES        ← drag any folder here to pin; drag out → ⊗ to remove
  ⭐ Drafts
  ⭐ Acme Client
VAULT            ← the real folder tree on disk
  ▸ 📁 Clients
  ▸ 📁 Ideas
  📄 README
TAGS             ← colored dots; click filters across ALL folders
  ● draft   ● idea   ● published
RECENT           ← optional; or fold "Recent" into the file list as a smart view
```

- **Named sections give a stable mental map** ("my pinned stuff" vs "the vault" vs "tags"). Pin by **dragging a folder into Favorites**; unpin by **dragging out until a ⊗ appears** (the real file is untouched). → Plain-language landmarks + pure direct manipulation, no dialogs. *(Finder sidebar)*
- **Smart views at the top of the file list: All · Recent · Drafts/Unsorted · Trash.** → High-value entry points with zero configuration; an **Unsorted/Drafts inbox** removes the "where do I put this?" tax. *(Bear/Ulysses smart views + Things inbox)*
- **Folder icons + colors** as visual landmarks (small curated set, not a giant picker). → Cheap, high-payoff wayfinding for visual thinkers. *(Ulysses / Craft / Finder Tahoe folder colors)*
- **Pinned items float to the top** of the list as a priority zone. → Fast access to the few things used daily. *(Obsidian Notebook Navigator / Bear)*
- **Two-tier visual hierarchy by weight, not boxes:** system views + folders in **medium/bold** with an icon; documents nested in **lighter** weight. → Navigate structure without thinking; weight+whitespace reads calmer than borders. *(Things 3)*

### 2.3 Core file interactions

- **Inline rename = select + `Return`** (or slow second-click); the **base name is pre-selected, extension protected**; `Return`/`Tab` commits, `Esc` cancels. Also `F2`. → Muscle-memory simple; pre-selecting the base name prevents extension mistakes. *(Finder + VS Code)*
- **Batch rename** dialog with **Replace text / Add text / Format (name + index/date)** modes and a **live preview** — no regex. → Power without scripting. *(Finder)*
- **New file/folder = create-and-immediately-name** (no modal): `Cmd+N` new doc, `Cmd+Shift+N` new folder, both drop you straight into an editable name field. → Creation never interrupts with a dialog. *(Finder)*
- **"New folder from selected docs"** (select files → right-click → moves them into a new folder in one step). → Turns multi-step cleanup into one gesture. *(Finder "New Folder with Selection")*
- **Drag-and-drop with spring-loaded folders:** hover a dragged item over a collapsed folder → it **auto-expands**; **drop targets highlight**; **`Cmd`/`Option` to copy** shows a `+` badge; the cursor previews copy-vs-move **before** you drop. → The system always shows what will happen; forgiving, reversible. *(Finder + Obsidian)*
- **Native manual drag-to-reorder** (chapters/sections), with order stored in **sidecar metadata — NEVER by mangling filenames** with `01-`, `02-` prefixes. → Obsidian punts this to plugins and users resort to ugly filename hacks; we build it in cleanly. *(Obsidian gap → fix)*
- **Quick Look (Spacebar preview):** select a file, press **Space** → a floating, dismissible rendered preview of the Markdown/HTML/.velq without opening it; `Space`/`Esc` dismiss; `←/→` step through a multi-selection. → One risk-free key previews anything; rewards curiosity, removes "open the wrong thing" fear. *(Finder — highest-leverage single pattern to copy)*
- **Context (right-click) menu**, short and verb-first: Open · Quick Look · Rename · Duplicate · Move to… · Add tag ▸ · Version history · Reveal in Finder · Export ▸ · Move to Trash. Include a small **Quick Actions** area (Export to PDF/HTML/.velq). → The right action offered at the object, in context; discovery by exploring. *(Finder)*
- **Git status, translated to plain language (NO `M`/`U`/`A` letters):** a small colored dot on changed files — **green = new, amber = edited (pending save point), red = removed** — matching the diff palette. → Keep the useful color semantics, drop the cryptic git jargon our users won't know. *(VS Code decorations, de-jargoned)*

### 2.4 Search & "where am I" clarity

- **Search box pinned at the TOP, always visible.** → Notion hid search and 87.5% of users expected it at the top; don't repeat that. *(Notion anti-pattern → fix)*
- **Default search scope = current folder; "Search everywhere" is an explicit opt-in.** → Finder leaking results from outside the current folder is a top complaint; make scope predictable. *(Finder anti-pattern → fix)*
- **Incremental filename search first** (per `requirements.md` Phase 1), with full-text (tantivy/FTS) as the obvious next step; let the switcher also match **headings inside docs**. → Header-level jumping is gold for long-form. *(Obsidian "Another Quick Switcher")*
- **Always-on location cues:** breadcrumb path bar (§1) + selected node highlighted in the tree + `📍 path` in the status bar. → Constant orientation is the heart of Finder's approachability; show it **by default** (Finder hides it, to its detriment). *(Finder + its own anti-pattern)*
- **Show everything — no "show 5 more" caps; tooltips for truncated names.** → Notion's display caps + collapsible-without-feedback sections make items look deleted; we never hide content. *(Notion anti-pattern → fix; Notion's own redesign found 81% preferred truncation tooltips)*

### 2.5 Empty states & first-vault onboarding

- **Never show a truly empty screen.** Empty folder: a friendly line + illustration + one CTA ("Drag a document here, or press **New**"). Empty vault: seed a **deletable "Welcome to Velq" doc** + a sample note. → Cold-start paralysis is what kills new Obsidian/Notion vaults. *(Things 3 empty states + Obsidian/Notion anti-pattern)*
- **Visually distinguish empty vs populated folders**, with a small animation when the first item lands. → Tells users at a glance whether a folder has anything in it. *(Finder Tahoe)*
- See §7 for the full first-run flow.

---

## 3. Editor

### 3.1 Rendering model — DECISION

**Default: CodeMirror 6 live-preview in a single pane** (Markdown markers render/hide inline as you type — `**bold**` shows as **bold**, `#` becomes a heading, raw syntax is revealed only on the active line/when the cursor enters it). **Provide a Split (source + preview) toggle and a Source-only toggle.**

- *Why this resolves the requirements-doc's "2-pane" with the research's "Typora is friendlier":* a permanent two-pane forces beginners to mentally map raw syntax ↔ output and doubles cognitive load. CM6 live-preview gives Typora's seamless WYSIWYG feel (reads like a word processor) while the file on disk stays plain Markdown — and the split pane the requirements call for remains **one keystroke away** for HTML work, side-by-side compares, and power users. *(Typora live-preview + Obsidian's CM6 implementation + requirements.md §2.1)*
- **HTML / `.velq` viewing** opens in the isolated WebView (per `requirements.md` §5); HTML editing can use the split source+preview by default since raw HTML benefits from seeing both. → Live-preview suits prose; split suits markup.

### 3.2 Formatting: Markdown-native + auto-format + tiny optional toolbar

- **Markdown shortcuts are primary:** type `**bold**`, `# Heading`, `- list`, `> quote`, `` `code` ``; auto-format as you type (`* ` → bullet, `# ` → H1, `1. ` → numbered). → Clean files, no Word ribbon, syntax vanishes via live-preview. *(Typora/iA/Bear/Ulysses — all Markdown-native)*
- **Keyboard shortcuts** for the common ops: `Cmd+B` bold, `Cmd+I` italic, `Cmd+K` is the **command palette globally** (put "Insert link" on the palette + toolbar, since writers rarely keyboard-insert links — resolves the Markdown `Cmd+K`-for-link collision). *(VS Code/Linear convention)*
- **A small, optional formatting affordance** for discoverability — either a **selection-summoned mini-toolbar** (appears on text selection: bold/italic/heading/link) or a short `+`/`/` insert menu (heading, list, quote, link, image, table, code) — **never a 90-item buffet** and never a "choose a block type" gate before you can type. → Word-like discoverability without Notion's slash-menu overload. *(Craft selection toolbar + Notion anti-pattern)*

### 3.3 Focus & typewriter modes

- **Focus mode:** dim non-active text to ~25–40% opacity; keep the active unit at full contrast. **Unit configurable: line / sentence / paragraph** (sentence is iA's signature; paragraph is gentler). → Removes peripheral distraction, eyes-on-the-page. *(iA Writer sentence/paragraph + Typora line)*
- **Typewriter mode:** pin the caret at a fixed vertical position (default center) and **scroll the text up past it**; expose a **center-offset** setting (cursor slightly above center if preferred). → Cursor always in the same spot; no looking at the screen bottom. *(iA Writer / Typora / Sublime)*
- **Distraction-free / full-screen:** strip to just the centered text column; reveal controls on hover or shortcut; composes with Focus + Typewriter. *(iA Writer / Typora / Ulysses)*

### 3.4 Typography defaults (the calm-reading defaults)

- **Measure (line length): ~66 characters**, with presets **64 / 72 / 80**; center the column with comfortable margins so measure is fixed regardless of window width. → Evidence-based sweet spot (50–75ch; 66 optimal); good typography improves reading accuracy ~20% and cuts eye strain ~30%. *(iA Writer + typography research)*
- **Body size 17–18px, line-height 1.6–1.7**; headings tighter (1.2–1.3). → Long-session reading comfort; tight ~1.3 body gets complaints (esp. CJK). *(iA Writer + USWDS/type-scale research)*
- **Editor body font:** ship **3–4 curated faces, not a font picker** — a clean serif (default; `"New York", Georgia, serif`), the system sans, a mono, and optionally a warm "round" — chosen per-document in one click. (We can't ship iA's proprietary fonts; pick faces with iA-like generous word spacing.) → Constraint means users can't make an ugly choice; serif default gives the calm-paper feel. *(Craft curated fonts + iA Writer)*
- **Stacks** (CSS):
  - UI: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif`
  - Editor serif: `"iA Writer Quattro", "New York", Georgia, "Times New Roman", serif`
  - Mono / code / CM6: `ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace`

---

## 4. Diff / save-history (version history for non-git users)

> Backed by `git2` auto-commit-on-save under the hood (`requirements.md` §2.4), but **the user never sees git.** Banned words in all UI copy: **commit, branch, HEAD, checkout, repository, merge, pull/push, fork, "diff"** (say "changes" / "what changed").

### 4.1 Naming & entry point

- **Feature name: "Version history."** Restore action: **"Restore this version"** (+ secondary "Restore a copy" / "Make a copy"). A user-labeled milestone is a **"named version"** ("Name this version"). One noun everywhere: *version*. → "Version history" is the established convention (Google Docs/Notion/Figma); single consistent term answers "what is this?" in plain words. *(Google Docs + UX research)*
- **Entry points (three):** (1) a **clock-with-circular-arrow (↺) icon** in the toolbar → opens a **right-side panel**; (2) **File menu → Version history**; (3) **right-click a file → Version history**. Make the **clickable "Saved just now / Last edited 2m ago"** status bar item the most discoverable hook. → The clock+arrow is the universal history affordance; File menu serves Docs/Office-trained users; status-bar hook is where the eye lands. *(Google Docs + Dropbox + VS Code Timeline placement under the file tree)*

### 4.2 Timeline presentation

- **Reverse-chronological list, newest at top, grouped by "Today / Yesterday / [date]."** → Reads like a diary; recovery starts from "what did I just change." *(Google Docs + Notion + VS Code Timeline)*
- **Coalesce rapid auto-saves into expandable session groups** (~one entry per work session, with a ▸ to reveal minute-by-minute sub-versions). Debounce snapshots: ~every 10 min of active editing + one shortly after you stop + one on explicit save. → Hides the keystroke firehose; ~one entry per sitting. *(Google Docs sessions + Dropbox Paper + Notion cadence)*
- **Let users name/star important versions + a "Show named versions only" filter.** Naming replaces the timestamp label in place. → Named milestones are what casual users actually hunt for; the named-only view is the 90% case. *(Google Docs)*
- **Relative timestamps for recent ("2 minutes ago"), absolute date/time after ~30 days, exact time on hover.** → Relative is friendlier for recency; older entries need absolute dates. *(UX research)*
- **ONE unified list — never a default filter that hides save points.** → VS Code's "Git history only" preset that omits local saves causes "where's my version?!" panic; show everything by default. *(VS Code anti-pattern → fix)*
- **Retention (generous — text is tiny):** consider tiered — hourly for last 12h → daily for last 7 days → weekly for last 6 months. → Deep history with a sane number of restore points. *(Ulysses tiered retention)*

### 4.3 Showing changes (adopt GitHub's visual language, hide git)

- **Default to INLINE / UNIFIED, full-width, WORD-LEVEL** for prose (old sentence directly above the new). Reserve **side-by-side (split)** for an optional "compare two versions" mode (old LEFT/red, new RIGHT/green, absent side = neutral gray). → Prose reflows; two narrow columns wrap badly. Unified reads in natural order, like Word Track Changes. *(GitHub unified-default + matklad analysis)*
- **Drop code-isms:** hide line numbers and the raw `@@…@@` hunk header (replace with a friendly "··· section unchanged" divider + an "expand context" chevron). → Line numbers are a code concept. *(GitHub expander, de-jargoned)*
- **Word-level highlighting, grouping consecutive word changes** into one removed-then-added chunk (shows intent). Not character-level (`~~manag~~led` is noisy), not whole-line. *(GitHub intraline diffs)*
- **Colors — GitHub Primer, exact hex (LIGHT):** added line bg `#dafbe1`, added word `#aceebb`; removed line bg `#ffebe9`, removed word `#ffcecb`; text `#1f2328`; hunk band `#ddf4ff`. **DARK:** translucent overlays over the dark canvas — added line green @ ~15% alpha, added word green @ ~40%; removed red @ low alpha / ~40% on words; text `#F0F6FC`. Define **~12 semantic diff tokens** so light/dark/colorblind themes come nearly free. → Three saturation steps make changed words pop as a "pill" without flooding the line. *(GitHub `primer/primitives`)*
- **Never color alone (WCAG 1.4.1):** removed = red **+ strikethrough + "−"**; added = green **+ "+"**. Offer a **colorblind palette (green→blue, red→orange)**. Label categories in plain words ("Added / Removed / Changed") with a summary line ("3 sentences added, 1 removed") and a Summary↔Detailed toggle. → Red-green CVD is the most common; redundant cues + plain labels remove the need to decode color. *(WCAG + GitHub colorblind themes)*
- **Ambient change bars in the editor gutter** against the last saved version: green = added, amber/blue = modified, red marker = deleted; **click a bar → inline peek with "Revert this change."** → Live "what you changed" without opening a diff; "undo just this paragraph" is a killer writer feature. CM6's `@codemirror/merge` unifiedMergeView does exactly this. *(VS Code gutter bars + inline change review)*

### 4.4 Restore flow (the safety guarantees)

- **NON-DESTRUCTIVE is mandatory:** restoring creates a **new version at the top**; it never deletes versions made after it. **Explicitly AVOID** overwrite-on-restore. → Removes the scariest fear ("will I lose my recent work?"); makes it fully reversible. *(Google Docs / macOS Versions / AVOID Notion+Paper)*
- **Preview before restore:** clicking a version loads it read-only **with the diff vs current**, and the "Restore this version" button lives **inside that preview**. → Look before you leap; confirm by seeing the actual old text. *(Google Docs + macOS Versions + Time Machine)*
- **Light confirm (or none) + an undo toast** ("Restored to version from June 26. **Undo**"). Match friction to impact — reserve hard "cannot be undone" modals for truly destructive acts (permanently delete a version / clear history), spatially separated from benign Restore/Copy. → Over-warning on safe actions trains users to ignore dialogs. *(NN/g + LogRocket)*
- **Partial recovery:** let users copy text out of an old version into the current doc without a full restore. → Matches "I just want that one paragraph back," zero risk. *(macOS Versions + Ulysses)*
- **A separate "rewind everything to [date]" rescue** (a time-scrubber over the whole vault, itself undoable), distinct from per-file history. → Non-technical users need a "undo the whole mess since Tuesday" escape hatch. *(Dropbox Rewind + Ulysses whole-library restore)*

---

## 5. Command palette & keyboard shortcuts

### 5.1 The palette

- **One palette: `Cmd+K` (advertise this) with `Cmd+Shift+P` as a cost-free alias** for VS Code/Sublime arrivals. **Quick-open files = `Cmd+P`.** → `Cmd+K` is the modern discoverable standard (Linear/Notion/Slack/Raycast); `Cmd+P` for files is universal muscle memory incl. Obsidian; binding both palette keys satisfies every camp. *(Linear/Raycast + VS Code/Obsidian)*
- **Prefix grammar in one input** (translated to writer concepts): plain text = find/create file; `>` = run a command; `@` = jump to a heading in this doc; `:NN` = go to line. → One box, many jobs, minimal surface. *(VS Code Quick Open prefixes)*
- **Empty query = recent files; `Enter` on a non-match = create that file** (`Cmd+Enter` = open in new tab). → "Type a name, press Enter, get-or-create" is superb low-friction for writers. *(Obsidian Quick Switcher)*
- **Context-aware ranking:** with text selected, Bold/Italic/Heading/Link float to the top; in a file list, file ops rank first. → Turns the palette into accept-the-default speed, not a search chore. *(Linear)*
- **Show each command's shortcut right-aligned on its row**, fuzzy match (`hdr`→Heading), local/in-memory data (instant). → Passive teaching — users graduate themselves onto muscle memory; the single best discoverability surface. *(Linear + Raycast)*

### 5.2 The "Actions" secondary menu (Raycast — high-value)

- With an item selected (a file, selected text), **`Cmd+K` opens an Actions panel** listing every action for that item, grouped under section headers (Format / Insert / Export / Document), each row showing its own shortcut, with its own search field. The **first action runs on plain `Enter`** (no panel needed); the **second on `Cmd+Enter`**. Submenus (e.g. "Heading level", "Export format") replace the panel contents in place; `Esc` backs out. → One discoverable surface holds all actions for the selected object, keeping the main UI clean; the 90% case needs zero extra keystrokes. *(Raycast)*

### 5.3 Standard shortcuts to honor (store as logical `Mod`, localize per-OS)

| Action | Shortcut | Note / source |
|---|---|---|
| Quick-open file | `Mod+P` | VS Code/Sublime/Obsidian |
| Command palette | `Mod+K` (+ `Mod+Shift+P` alias) | Linear/Raycast + VS Code |
| New document | `Mod+N` | macOS standard |
| New folder | `Mod+Shift+N` | Finder |
| **Save (checkpoint)** | `Mod+S` | **Keep even with autosave** — brief "Saved ✓" + a named restore point; honors deep muscle memory, reassures nervous writers. |
| Find in doc | `Mod+F` | universal |
| Find in all files | `Mod+Shift+F` | VS Code |
| Toggle sidebar | `Mod+\` (advertise) + `Mod+B` alias | Obsidian `Mod+\` / VS Code `Mod+B` |
| Split editor | `Mod+Alt+\` | VS Code uses `Mod+\` for split, but we give sidebar that key (more frequent for writers) |
| Focus / typewriter / zen | `Mod+Shift+Enter` (+ `Mod K Z` alias) | VS Code Zen alias |
| Settings | `Mod+,` | macOS standard |
| Close tab | `Mod+W`; Reopen `Mod+Shift+T` | macOS / browser |
| Next/Prev tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` | VS Code MRU |
| Rename (in tree) | `Return` / `F2` | Finder / VS Code |
| Quick Look preview | `Space` (in file list) | Finder |
| Shortcuts cheat-sheet overlay | `?` (when not in a text field) | web standard |

### 5.4 Discoverability (keyboard-first ≠ keyboard-only)

- **Show the shortcut in three redundant places:** (1) native menu accelerators (Tauri gives this free), (2) the right-click context menu next to each item, (3) the command-palette row. Plus a **searchable `?` overlay** cheat-sheet. Everything stays mouse-reachable. → Redundant just-in-time hints convert mouse users to keyboard users one action at a time — essential safety for non-technical writers. *(Linear)*
- **`G`-then-letter navigation chords** as an optional power layer: `G D` documents, `G S` search-all, `G T` today/recent, `G ,` settings. **Caveat:** single-key actions clobber typing — only enable bare keys when the caret is NOT in prose (sidebar/list/selection mode); keep `/` (insert) and `?` (help) global. → A mnemonic namespace gives a memorable family without exhausting single keys. *(Linear, adapted)*
- **Cross-platform:** `Cmd→Ctrl`, `Option→Alt`; render **⌘⌥⇧⌃ glyphs (no `+`)** on macOS, **`Ctrl+Shift+P` words** on Win/Linux. Store one logical `Mod` binding; CM6 already uses a `Mod` abstraction. *(VS Code per-OS tables + Apple HIG)*

---

## 6. Visual design system

> Frontend is HTML/CSS + CM6, so everything is expressed as CSS custom properties. **Two-tier tokens:** primitive ramps → semantic aliases; components consume only semantic names, so dark/light is one alias swap. *(shadcn/Radix/Tailwind-v4 pattern)*

### 6.1 Color

- **Neutral ramp = Tailwind `neutral`** (true gray, warmest-neutral, calmest for a writing app): `50 #fafafa · 100 #f5f5f5 · 200 #e5e5e5 · 300 #d4d4d4 · 400 #a3a3a3 · 500 #737373 · 600 #525252 · 700 #404040 · 800 #262626 · 900 #171717 · 950 #0a0a0a`. (Swap to `zinc` if you want Linear's faint cool cast.) → Warm neutral reads calmer than blue-gray. *(Tailwind / Radix)*
- **Semantic tokens (Radix 12-step intent collapsed):**

  | Token | Light | Dark | Use |
  |---|---|---|---|
  | `--bg` | neutral-50/white | neutral-950 | window canvas |
  | `--bg-subtle` | neutral-100 | neutral-900 | sidebar, secondary panes |
  | `--surface` | white | neutral-900 | cards, **editor pane** |
  | `--surface-elevated` | white + shadow | neutral-800 | popovers, menus, dialogs |
  | `--surface-hover` | neutral-100 | neutral-800 | row/button hover |
  | `--surface-active` | neutral-200 | neutral-700 | selected row |
  | `--border-subtle` | neutral-200 | neutral-800 | separators |
  | `--border` | neutral-300 | neutral-700 | inputs, interactive edges |
  | `--border-focus` | accent-500 | accent-400 | focus rings |
  | `--text` | neutral-900 | neutral-100 | body/UI |
  | `--text-secondary` | neutral-600 | neutral-400 | labels, metadata |
  | `--text-muted` | neutral-500 | neutral-500 | placeholders, disabled |
  | `--accent` | blue-600 `#2563eb` | blue-400 `#60a5fa` | primary action, selection, links |
  | `--success` | green-600 | green-400 | save/sync OK |
  | `--danger` | red-600 | red-400 | delete, errors |
  | `--warning` | amber-500 | amber-400 | unsaved/conflict |

- **Dark elevation: surfaces get LIGHTER as they rise** (+5–8% luminance per level), not shadow-driven. ≥4 levels (base→panel→nested/hover→overlay). → Shadows barely read on dark. *(dark-mode practice)*
- **Contrast (WCAG):** body/UI text ≥ **4.5:1**; large text & icons ≥ **3:1**; borders/focus rings ≥ **3:1** (1.4.11). Aim **AAA 7:1** for the editor body (read for hours). *(WCAG + Radix guarantees)*

### 6.2 Accent — single, sparing, user-customizable

- **ONE accent** (default calm blue) used for at most: primary button fill, active sidebar item, text selection, focus ring, links, active toggle — everything else neutral. Expose **6–8 curated swatches** (blue/indigo/violet/green/amber/red/graphite) via one `--accent` token group. → Accent earns attention only when scarce; a writing tool should feel like paper, not a dashboard. Apple's caution: coloring everything diminishes hierarchy. *(Linear / Things / macOS accent + Material color roles)*

### 6.3 Spacing — 4px base, 8px rhythm

`--space-1:2 · 2:4 · 3:8 · 4:12 · 5:16 · 6:24 · 7:32 · 8:48 · 9:64`. Rule: internal padding ≤ external margin. → 8-multiples divide cleanly across DPIs and cut decisions; 2/4 handle icon gaps. *(8pt grid)*

### 6.4 Type scale (UI) + radii/borders/shadows

- **UI ramp (Major Third):** `xs 11/1.4 · sm 13/1.5 · base 14/1.5 (default UI) · md 16/1.5 · lg 20/1.3 · xl 25/1.25 · 2xl 31/1.2`. (Editor body is separate: 17–18px / 1.6–1.7 — see §3.4.) *(modular scale)*
- **Radii (soft, not pill-everything):** `sm 6 · md 8 (default buttons/inputs/cards) · lg 12 · xl 16 (dialogs) · full 9999 (avatars/toggles)`. *(Things/Linear range)*
- **Borders:** 1px hairline `--border-subtle`. **Prefer borders over heavy shadows** to separate surfaces. *(2025 calm-UI trend)*
- **Shadows (subtle, layered, low-alpha):** `sm 0 1px 2px rgba(0,0,0,.06)` · `md 0 4px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05)` (popovers/menus) · `lg 0 12px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)` (dialogs). On dark, lighter surface + 1px lighter top border instead. *(dark-elevation practice)*

### 6.5 Density

- **Default comfortable; `compact` toggle** (data-attribute on `<html>`). Row heights: sidebar/file-list item **36px** comfortable / **28px** compact; palette result **40/32**; toolbar/control height **32px**. Padding comfortable 8v/12h, compact 4v/8h. *(Material/MUI density)*

### 6.6 Motion

- **Easing:** `--ease-standard cubic-bezier(0.2,0,0,1)` · `--ease-decelerate cubic-bezier(0,0,0,1)` (ENTER/ease-out) · `--ease-accelerate cubic-bezier(0.3,0,1,1)` (EXIT). **Durations:** `instant 100ms · fast 150ms · base 200ms (panel/popover open) · slow 300ms`.
- **Animate:** hover/press (100–150ms), popover/menu/dialog open (200ms, ease-out enter / ease-in exit), sidebar slide, selection highlight, theme cross-fade, drag lift + reorder reflow (spring on position/scale).
- **Do NOT animate:** typing/caret, editor scroll, list reflow on every keystroke, anything that delays content. No spinners where instant works; skeletons over spinners. → Sub-100ms feedback feels causal; fast beats flashy. *(Material 3 tokens + Linear speed-as-a-feature)*
- **`prefers-reduced-motion`:** gate all non-essential transitions to ~0.01ms; replace slide/scale with opacity cross-fades, never kill all feedback; no autoplay/parallax/spin. *(WCAG 2.2.2 / MDN)*

### 6.7 2025–2026 trends — adopt vs avoid

- **Adopt:** hairline borders + low-alpha layered shadows (the calm-UI look); surface-lightening dark elevation; selective accent tinting; **restrained translucency on the navigation layer ONLY** (titlebar/sidebar via Tauri vibrancy) if you want native macOS Tahoe feel.
- **Avoid:** glass/translucency on content or the editor (Apple: "always avoid glass on glass"); neumorphism/glassmorphism as a system style (low-contrast, dated for a text tool); vibrant gradients, blur-everywhere, decorative motion. *(Apple Liquid Glass guidance + 2025 trend write-ups)*

---

## 7. Onboarding & empty states (first-run for a non-technical user)

- **Pick-a-vault first run, plain-language:** "Choose a folder for your writing — it's just a folder on your computer." Offer a sensible default location and a "Reveal in Finder" reassurance. → Frame local-first as the feature it is: "your writing is just files you own." *(Notion anti-pattern → Obsidian/Velq strength)*
- **Seed the new vault — never empty:** drop in a **deletable "Welcome to Velq" doc that teaches by editing** ("Select this sentence to format it," "Press Space on a file to preview it," "Click ↺ to see your version history"), plus a sample note and a couple of starter folders (e.g. `Drafts`, `Ideas`). Introduce features **section by section**; reveal advanced bits (HTML export, themes, .velq, tags) **only after** the first doc. → Teaching via real interactive content beats modal slideshows and lowers anxiety. *(Things 3 + Craft + Obsidian/Notion cold-start anti-pattern)*
- **Blank doc = a bare inviting canvas:** a faint "Start writing…" placeholder that fades on first keystroke; no modal, no "choose a block type" gate. The empty state IS the cursor. → Lowest-friction invitation to write. *(Craft + Notion anti-pattern)*
- **Calm, encouraging empty states everywhere** — one friendly line + one illustration + one CTA, generous whitespace, never an error tone. Empty Drafts: *"Nothing here yet. Press **+** or just start typing."* Empty Trash: *"Nothing in the Trash."* Empty version history: *"Your save points will appear here as you write."* → Empty ≠ broken; framed warmly it reads as a fresh start. *(Things 3)*
- **Finished-looking templates + an Unsorted inbox:** a small library of templates that look done out of the box (placeholder `[Add title]`, pre-applied styles), and an explicit **Unsorted/Drafts** bucket to capture-now-file-later. → Warm starter content beats a blank page, but only if templates look finished; the inbox removes "where do I put this?" *(Craft + Things 3)*
- **Microinteraction delights (calm, not confetti):** a quiet checkmark pulse near the title on autosave (never a disruptive toast); a "Magic +" button (tap = new doc in context; drag into the doc = insert a block at the drop position with text parting to make room; drag onto a sidebar folder = create a doc filed there); drag/reorder with neighbors animating apart and resettling. → One continuous gesture does capture + placement + filing; direct manipulation is the biggest "premium" signal. The reward is a calm cleared workspace, not a party. *(Things 3 "Magic Plus" + Craft + deliberate no-confetti)*

---

## Appendix — quick-start defaults (if you adopt nothing else)

- **Shell:** left sidebar (Favorites + Vault tree + Tags) · file list with preview snippets (default) · editor · right Outline rail · status bar (location · word count · ✓ Saved) · top breadcrumb. Preview tabs; split via drag-to-edge.
- **File manager:** two-pane previewed list default, Finder column view as toggle. Return-to-rename, Space=Quick Look, spring-loaded DnD, manual reorder in sidecar metadata, plain-color git dots (green=new/amber=edited/red=removed), search pinned top scoped to current folder, never-empty seeded vault.
- **Editor:** CM6 live-preview default, split + source toggles; Markdown-native + auto-format + selection mini-toolbar; focus + typewriter + full-screen; body 17px/1.65 serif (New York/Georgia), ~66ch measure, centered column.
- **Version history:** ↺ icon → right panel; "Today/Yesterday/date" timeline, coalesced sessions, name versions, named-only filter; inline word-level GitHub-colored changes (`#dafbe1`/`#ffebe9` etc.), redundant +/− + strikethrough, gutter change bars with inline revert; **non-destructive** restore with preview + undo toast. No git words.
- **Keys:** `Cmd+P` open file · `Cmd+K` (+`Cmd+Shift+P`) palette (prefixes `>` `@` `:`) · `Cmd+S` checkpoint · `Cmd+\` sidebar · `Cmd+Alt+\` split · `?` cheat-sheet · `Mod` abstraction for Win/Linux · shortcut shown on every palette row + in menus.
- **Visual:** Tailwind `neutral` + blue accent, two-tier tokens, dark = lighten surfaces; spacing `2,4,8,12,16,24,32,48,64`; UI 14/1.5 system font; radii 8; 1px hairline borders over shadows; motion 150–200ms ease-out, gated by `prefers-reduced-motion`; editor surface always opaque.

---

## Sources (grounding research, 2025–2026)

**Finder:** Miller columns (en.wikipedia.org/wiki/Miller_columns), column-view tips (macmost.com), Quick Look (macmost.com, support.apple.com), sidebar/tags/path-bar (support.apple.com guides, macmost.com), spatial-memory UX (nngroup.com/articles/spatial-memory), Tahoe features (macrumors.com/2025/09/24).
**Obsidian:** Notebook Navigator (github.com/johansan/notebook-navigator), tabs/splits (obsidian.md/help/tabs), Quick Switcher (obsidian.md/help/plugins/quick-switcher), graph-view critique (codeculture.store), beginner confusion (xda-developers.com).
**VS Code:** UI/preview tabs (code.visualstudio.com/docs/editing/userinterface), git decorations (bobbyhadz.com), diff/inline review (code.visualstudio.com/docs/sourcecontrol/staging-commits, medium.com/fhinkel), command palette/prefixes (code.visualstudio.com/docs/getstarted/tips-and-tricks), Timeline/Local History (bobbyhadz.com/blog/view-vscode-local-history, austingil.com).
**Notion:** UX critiques (uxplanet.org "honest UX review", davisdesigninteractive.medium.com navigation case study), pages-vs-databases (slowisbetter.medium.com), data-sources 2025 (notionapps.com/blog), offline (dev.to kanta13jp1).
**Bear / iA / Typora / Ulysses:** bear.app/faq (sidebar, nested-tags), ia.net/writer + ia.net/topics/a-typographic-christmas, typora.io, help.ulysses.app (sheets-groups, backups); typography research (uxpin.com optimal-line-length, fonts.google.com measure, designsystem.digital.gov).
**Linear / Raycast / Things / Craft:** linear.app/now/invisible-details + changelog (contextual command menu, keyboard-shortcuts-help), manual.raycast.com (action-panel, search-bar, command-aliases-and-hotkeys), culturedcode.com/things (features, gestures) + macstories.net Things review, support.craft.do (slash-menu, styles) + macstories.net Craft review.
**Version history:** support.google.com/docs/answer/190843 + named-versions, support.apple.com (restore files, document versions) + eclecticlight.co, help.dropbox.com (version-history, rewind), notion.com/help + createwith.com snapshot-diffs, ia.net/writer/support/help/versions-and-backups, help.ulysses.app/backups, GitHub Primer (github.com/primer/primitives diffBlob.json5, primer.style/primitives/colors) + github.blog split-diffs/word-highlighting/colorblind-themes, matklad.github.io unified-vs-split-diff; UX: uxmovement.com timestamps, blog.logrocket.com reversible-actions, nngroup.com proximity-consequential-options, w3.org/WAI WCAG 1.4.1.
**Design system & keyboard:** radix-ui.com/colors/docs (scale, aliasing), ui.shadcn.com/docs/theming, tailwindcss.com/docs/colors, muz.li dark-mode guide, blog.designary.com 8pt grid, modularscale.com, m3.material.io/styles/motion (easing/duration tokens), developer.mozilla.org prefers-reduced-motion, mui.com density, dev.to liquid-glass best-practices; keyboard: code.visualstudio.com/docs/reference/default-keybindings, support.apple.com/en-us/102650, obsidian.md/help/hotkeys, digitalseams.com cmd-shift-p history, blog.superhuman.com command-palette.
