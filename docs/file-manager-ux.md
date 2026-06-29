# File manager UX

The file manager is Velq's differentiator: as legible as Finder, but built for people who
write. This documents the implemented patterns (plan §9; rationale in
[ui-ux-spec.md](ui-ux-spec.md) §2).

## North star

**Two nouns only — folders and files. A file is never a container.** This is the
deliberate anti-Notion stance: no "page inside a page" to get lost in. The tree is the
*real* disk — renaming in Velq renames on disk, "Reveal in Finder" works, and there are no
hidden app-managed wrappers around your Markdown.

## Three view modes (remembered per vault)

A dedicated, full-window **Explorer view** (activity-bar → Files) hosts the browser, with a
List / Columns switch in its toolbar. `settings.fileView` remembers the choice:

1. **List** (default) — folder tree + a previewed file list with a 1–3 line body snippet,
   à la Apple Notes / Bear. The mode ordinary people already understand.
2. **Columns** (Miller columns) — Finder's column view: clicking a folder opens the next
   column to its right, so the whole drill path stays visible at once
   ([`MillerColumns.tsx`](../apps/desktop/src/shell/MillerColumns.tsx)). Single-click
   selects, double-click opens. (Arrow-key navigation and a file-preview pane are the next
   refinements.)

Opening a document from either mode jumps to the editor view.

## The interactions, all of them

| Pattern | How it works | Benchmark |
| ------- | ------------ | --------- |
| **Inline rename** | Select + `Return` (or `F2` / slow double-click). The **base name is pre-selected and the extension protected**; `Return`/`Tab` commit, `Esc` cancels. ([`RenameInput.tsx`](../apps/desktop/src/filemanager/RenameInput.tsx)) | Finder |
| **Create-then-name** | `Mod+N` new doc / `Mod+Shift+N` new folder drops you straight into naming — no modal. | Finder |
| **Spring-loaded DnD** | Hovering a collapsed folder mid-drag auto-expands it (600 ms), the drop target highlights, and `Mod`/`Option` switches to copy. ([`Tree.tsx`](../apps/desktop/src/filemanager/Tree.tsx)) | macOS spring-loading |
| **Quick Look** | `Space` on a selection floats a rendered preview of the MD / HTML / `.velq`; `Space`/`Esc` close, `←/→` move between files. The single most important pattern. ([`QuickLook.tsx`](../apps/desktop/src/filemanager/QuickLook.tsx)) | Finder Quick Look |
| **Context menu** | Verb-first and short: Open · Quick Look · Rename · Duplicate · Move to… · Version history · Reveal in Finder · Export · Move to Trash. ([`ContextMenu.tsx`](../apps/desktop/src/filemanager/ContextMenu.tsx)) | Finder |
| **Status dots** | Save state is plain-language colour, never `M`/`U`/`A`: **green = new, amber = edited, red = removed** — matching the diff palette. | — |

## Search & "where am I"

- **Search is pinned to the top, always visible** — never tucked behind a shortcut (the
  Notion mistake).
- **Default scope is the current folder**; "search all files" is an explicit opt-in
  (`Mod+Shift+F`), so results never silently leak from elsewhere (the Finder-scope trap).
- **Constant location cues**: a breadcrumb above the editor (each crumb clickable), the
  tree's selection highlight, and `📍 path` in the status bar.
- **Nothing is silently truncated** — long names get a tooltip, not an "and 5 more".

## Scale

Tree and list are virtualized (`@tanstack/react-virtual`, overscan 14); `read_dir`
expands one level lazily; the `notify` watcher is debounced (400 ms) to absorb the
temp-write + rename churn editors produce on atomic save. A 10k-file vault stays smooth.

## What Velq deliberately does *not* do

- No ordering prefixes baked into filenames (`01-…`) — manual order, when added, lives in
  sidecar metadata so your filenames stay clean.
- No file-as-container, no proprietary tree state the OS can't see. The disk is the source
  of truth; Velq is a calm lens onto it.
