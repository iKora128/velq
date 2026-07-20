/**
 * English message catalog — the source of truth for every i18n key. Other locales
 * (see `ja.ts`) are typed as `Dict`, so they must define exactly these keys: add a
 * new UI string here first, then translate it everywhere else (the build fails if a
 * locale is missing a key).
 *
 * House rule (matches the rest of Velq): never leak git vocabulary — no
 * commit / branch / HEAD / repository / merge / "diff". Say "version",
 * "save history", "what changed", "restore". The Japanese catalog follows the same
 * rule (版 / 保存履歴 / 変更点 / 元に戻す).
 *
 * `{name}`-style placeholders are filled by `translate(...)`.
 */
export const en = {
  "app.name": "Velq",
  "brand.name": "Velq",

  // ---- Shared / reused ----
  "common.open": "Open",
  "common.close": "Close",
  "common.undo": "Undo",
  "common.loading": "Loading…",
  "common.files": "Files",
  "common.folders": "Folders",
  "common.newDoc": "New document",
  "common.newFolder": "New folder",
  "common.openFolder": "Open folder",
  "common.clearSearch": "Clear search",
  "common.toggleTheme": "Toggle theme",
  "common.toggleDensity": "Toggle density",
  "common.toggleSidebar": "Toggle sidebar",
  "common.versionHistory": "Version history",
  "common.settings": "Settings",

  // ---- Settings screen ----
  "settings.title": "Settings",
  "settings.general": "General",
  "settings.general.desc": "Language and the basics.",
  "settings.language": "Language",
  "settings.language.desc": "The language Velq's menus and buttons use.",
  "settings.language.system": "Match system",
  "settings.language.en": "English",
  "settings.language.ja": "日本語",
  "settings.appearance": "Appearance",
  "settings.appearance.desc": "How Velq looks while you write.",
  "settings.theme": "Theme",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.system": "System",
  "settings.density": "Density",
  "settings.density.hint": "Row spacing in the file lists and tree.",
  "settings.density.comfortable": "Comfortable",
  "settings.density.compact": "Compact",
  "settings.readingFont": "Reading font",
  "settings.readingFont.hint": "Use a serif typeface for prose.",
  "settings.previewTemplate": "Preview template",
  "settings.previewTemplate.hint":
    "How rendered Markdown looks — in the preview, Quick Look, and HTML/PDF exports.",
  "settings.previewTemplate.paper": "Paper",
  "settings.previewTemplate.docs": "Docs",
  "settings.previewTemplate.note": "Note",
  "settings.previewTemplate.magazine": "Magazine",
  "settings.previewTemplate.tech": "Tech",
  "settings.previewTemplate.sky": "Sky",
  "settings.previewTemplate.glass": "Glass",
  "settings.editor": "Editor",
  "settings.editor.desc": "Defaults for the writing surface.",
  "settings.editor.defaultView": "Default view",
  "settings.editor.source": "Source",
  "settings.editor.split": "Split",
  "settings.editor.live": "Live",
  "settings.editor.rendered": "Rendered",
  "settings.lineNumbers": "Line numbers",
  "settings.vim": "Vim mode",
  "settings.vim.hint": "Modal editing with a vim keymap.",
  "settings.files": "Files",
  "settings.files.desc": "How the file browser shows your folders.",
  "settings.files.defaultView": "Default view",
  "settings.files.defaultView.hint": "Icons is the most visual; Columns drills folder by folder.",
  "settings.files.icons": "Icons",
  "settings.files.list": "List",
  "settings.files.columns": "Columns",
  "settings.packaging": "Packaging",
  "settings.packaging.desc": "How HTML becomes a portable .velq.",
  "settings.autoPackage": "Auto-package dropped HTML",
  "settings.autoPackage.hint":
    "Dropping an HTML file onto the window traces its dependencies into a .velq in Documents/Velq. Opening a file — from Finder or inside Velq — always views and edits it.",
  "settings.spellcheck": "Spellcheck",
  "settings.spellcheck.hint": "Native spelling underlines while you type.",
  "settings.velqOpenIn": "Open .velq files",
  "settings.velqOpenIn.hint":
    "A tab keeps you in your workspace; a window gives the document its own space.",
  "settings.velqOpenIn.tab": "In a tab",
  "settings.velqOpenIn.window": "In a new window",

  // ---- Command / menu action titles (command palette rows) ----
  "action.newDoc": "New Markdown document",
  "action.newDocHtml": "New HTML document",
  "action.newFolder": "New folder",
  "action.openFolder": "Open folder…",
  "action.save": "Save",
  "action.undoFile": "Undo file change",
  "action.redoFile": "Redo file change",
  "action.viewSource": "View: Source",
  "action.viewSplit": "View: Split",
  "action.viewLive": "View: Live preview",
  "action.toggleTheme": "Toggle dark / light",
  "action.toggleSidebar": "Toggle sidebar",
  "action.toggleVim": "Toggle Vim mode",
  "action.toggleDensity": "Toggle density (comfortable / compact)",
  "action.reveal": "Reveal in Finder",
  "action.searchAll": "Search all files…",
  "action.packageHtml": "Open HTML & package to .velq…",
  "action.exportVelq": "Export to .velq",
  "action.exportHtml": "Export to HTML",
  "action.exportMd": "Export to Markdown",
  "action.exportPdf": "Export to PDF",
  "action.plugins": "Plugins…",
  "action.checkUpdates": "Check for updates…",

  // ---- Command palette ----
  "palette.placeholder.file": "Search files…  ( > commands · @ headings · : line )",
  "palette.placeholder.cmd": "Run a command…",
  "palette.placeholder.head": "Jump to a heading…",
  "palette.placeholder.line": "Go to line…",
  "palette.mode.file": "Files",
  "palette.mode.cmd": "Commands",
  "palette.mode.head": "Headings",
  "palette.mode.line": "Line",
  "palette.unsaved": "Unsaved",
  "palette.goToLine": "Go to line {line}",
  "palette.aria": "Command palette",
  "palette.noResults": "No results",

  // ---- Keyboard cheatsheet ----
  "cheatsheet.title": "Keyboard shortcuts",
  "cheatsheet.commandPalette": "Command palette",
  "cheatsheet.quickOpen": "Quick-open a file",
  "cheatsheet.runCommand": "Run a command",
  "cheatsheet.newDoc": "New document",
  "cheatsheet.newFolder": "New folder",
  "cheatsheet.newTab": "New tab",
  "cheatsheet.closeTab": "Close tab",
  "cheatsheet.reopenTab": "Reopen closed tab",
  "cheatsheet.switchTab": "Next / previous tab",
  "cheatsheet.jumpTab": "Jump to tab",
  "cheatsheet.save": "Save",
  "cheatsheet.openFolder": "Open folder",
  "cheatsheet.toggleSidebar": "Toggle sidebar",
  "cheatsheet.quickLook": "Quick Look",
  "cheatsheet.rename": "Rename",
  "cheatsheet.shortcuts": "Shortcuts",

  // ---- Welcome screen ----
  "welcome.title": "Welcome to Velq",
  "welcome.subtitlePre":
    "A calm place to write Markdown and HTML — and package documents, dependencies and all, into a single offline ",
  "welcome.subtitlePost": " file.",
  "welcome.newDoc": "New document",
  "welcome.openFolder": "Open a folder",
  "welcome.packageHtml": "Package an HTML file",
  "welcome.hint.palette": "Command palette",
  "welcome.hint.quickOpen": "Quick open a file",
  "welcome.hint.preview": "Preview the selected file",

  // ---- Status bar ----
  "statusbar.noVault": "No vault",
  "statusbar.editing": "Editing",
  "statusbar.saved": "Saved",

  // ---- Activity bar ----
  "activitybar.viewsAria": "Views",
  "activitybar.files": "Files",
  "activitybar.editor": "Editor",
  "activitybar.packageHtmlTitle": "Open & package an HTML file",
  "activitybar.packageHtmlAria": "Open and package an HTML file",
  "activitybar.settings": "Settings",

  // ---- Sidebar ----
  "sidebar.emptyTitle": "No folder open",
  "sidebar.emptyHint": "Choose a folder for your writing — it's just a folder on your computer.",

  // ---- Toolbar ----
  "toolbar.locationAria": "Location",
  "toolbar.viewModeAria": "Editor view mode",
  "toolbar.previewTemplate": "Preview template",
  "toolbar.toggleFileList": "Show / hide the file list",
  "toolbar.runScripts": "Run the page's scripts so it displays correctly",
  "toolbar.scriptsOff": "Run scripts",
  "toolbar.scriptsOn": "Scripts on",
  "scriptBanner.text":
    "This page draws itself with JavaScript. Run it only if you trust the source.",
  "scriptBanner.run": "Run & show",
  "editState.edit": "Edit",
  "editState.editing": "Editing",
  "editState.editHint": "Turn this page into an editing surface — then click any text and type",
  "editState.editingHint": "Editing on — click any text and type. Press again to stop editing.",

  // ---- .velq tab view ----
  "velqview.readonly": "Sealed package · read-only",
  "velqview.popout": "Open in new window",
  "velqview.editOriginal": "Edit the original HTML",
  "velqview.editExtract": "Extract & edit",

  // ---- One-shot hints ----
  "hint.renderedEdit":
    "HTML edits as the page itself in Rendered view — switch at the top right. ⌥-click grabs an element to delete or duplicate it.",
  "toast.imageAdded": "Image saved to {rel}",
  "toast.imageNeedsSavedDoc":
    "Save the document first — images live in an attachments folder beside it.",
  "tab.pin": "Pin tab",
  "tab.unpin": "Unpin tab",
  "tab.splitRight": "Open to the side",
  "tab.closeSplit": "Close split",
  "split.closeAria": "Close the side pane",
  "split.previewBadge": "Preview",
  "elsel.delete": "Delete",
  "elsel.duplicate": "Duplicate",

  // ---- Breadcrumb ----
  "breadcrumb.unsaved": "Unsaved changes",

  // ---- Tabs ----
  "tab.close": "Close {name}",

  // ---- File browser (grid / columns / list) ----
  "explorer.defaultName": "Files",
  "explorer.view.grid": "Icons",
  "explorer.view.list": "List",
  "explorer.view.columns": "Columns",
  "sidebar.view.list": "List",
  "sidebar.view.tree": "Tree",
  "sidebar.view.columns": "Columns",
  "sidebar.view.icons": "Icons",
  "grid.back": "Back",
  "grid.location": "Location",
  "grid.emptyNoFolder": "Open a folder to browse it here.",
  "grid.emptyTitle": "This folder is empty",
  "grid.emptyHint": "Use the + buttons above to add a document or a folder.",
  "grid.recentlyOpened": "Recently opened",
  "grid.recentlyAdded": "Recently added",
  "miller.empty": "Empty",
  "filelist.searchPlaceholder": "Search this folder",
  "filelist.showFolders": "Show folders",
  "filelist.hideFolders": "Hide folders",
  "filelist.emptyNoRoot": "Your documents will appear here.",
  "filelist.noMatch": "No files match “{query}”.",
  "filelist.emptyTitle": "Nothing here yet",
  "filelist.emptyHint": "Press + or just start typing to create your first document.",

  // ---- Context menu (right-click a file / folder) ----
  "contextmenu.aria": "Context menu",
  "contextmenu.open": "Open",
  "contextmenu.convertToVelq": "Convert to .velq",
  "contextmenu.rename": "Rename",
  "contextmenu.duplicate": "Duplicate",
  "contextmenu.revealMac": "Reveal in Finder",
  "contextmenu.revealOther": "Reveal in Explorer",
  "contextmenu.trash": "Move to Trash",
  "contextmenu.deleteN": "Move {count} items to Trash",

  // ---- Quick Look ----
  "quicklook.close": "Close preview",
  "quicklook.frameTitle": "Quick Look preview",
  "quicklook.position": "{index} of {total}",
  "quicklook.footer": "← → browse · Enter to open · Esc to close",

  // ---- Conflict banner ----
  "conflict.message": "This file changed on disk while you were editing.",
  "conflict.reload": "Reload from disk",
  "conflict.keepMine": "Keep my version",
  "convert.title": "Make a .velq?",
  "convert.body":
    "A .velq copy will be created in your Documents/Velq folder. Your original files stay exactly where they are.",
  "convert.more": "+{count} more",
  "convert.always": "Always do this for files I drop in",
  "convert.keep": "Add as files",
  "convert.make": "Make .velq",
  "convertBanner.text": "Keep this as a plain file — or make a .velq copy in Documents/Velq.",
  "convertBanner.make": "Make .velq",

  // ---- Drop zone ----
  "dropzone.hint": "Drop to add to your Velq folder",
  "panedivider.label": "Resize pane",

  // ---- Version history ----
  "history.title": "Version history",
  "history.close": "Close history",
  "history.emptyNoDoc": "Open a saved document to see its history.",
  "history.emptyNoVersions": "Your save points will appear here as you write.",
  "history.sessionSaves": "{count} saves in this session",
  "diff.whatChanged": "What changed since {time} ({ago})",
  "diff.backToEditing": "Back to editing",
  "diff.restore": "Restore this version",

  // ---- Relative / day-group time labels ----
  "time.justNow": "just now",
  "time.minutesAgo": "{n}m ago",
  "time.hoursAgo": "{n}h ago",
  "time.today": "Today",
  "time.yesterday": "Yesterday",

  // ---- Plugins panel ----
  "plugins.title": "Plugins",
  "plugins.footerPre": "Plugins are CodeMirror extensions. They render in ",
  "plugins.footerLive": "Live",
  "plugins.footerPost": " mode.",

  // ---- Preview / editor bits ----
  "preview.frameTitle": "Preview",
  "editor.toggleTask": "Toggle task",
  "toast.dismiss": "Dismiss",

  // ---- Toasts & user-facing errors ----
  "error.macPermission":
    "macOS is blocking access to that folder. Grant Velq access in System Settings → Privacy & Security → Files and Folders, or pick a folder outside Desktop/Documents/Downloads.",
  "toast.openedInViewer": "Opened {name} in a secure viewer.",
  "toast.cantOpen": "Couldn't open {name}: {error}",
  "toast.cantOpenFolder": "Couldn't open that folder: {error}",
  "toast.cantOpenHome": "Couldn't open your Velq folder: {error}",
  "toast.cantReadFolder": "Couldn't read that folder: {error}",
  "toast.restored": "Restored an earlier version.",
  "toast.nothingToUndo": "Nothing to undo",
  "toast.undid": "Undid: {label}",
  "toast.redid": "Redid: {label}",
  "toast.cantUndo": "Couldn't undo: {error}",
  "toast.cantRedo": "Couldn't redo: {error}",
  "toast.cantRename": "Couldn't rename: {error}",
  "toast.cantDelete": "Couldn't delete: {error}",
  "toast.cantMove": "Couldn't move: {error}",
  "toast.deletedMany": "Moved {count} items to Trash",
  "toast.renamedMany": "Renamed {count} items",
  "toast.dropOpenFolderFirst": "Open a folder first, then drop files into it.",
  "toast.cantAdd": "Couldn't add {name}: {error}",
  "toast.addedOne": "Added 1 item to {vault}",
  "toast.addedMany": "Added {count} items to {vault}",
  "toast.exportedMd": "Exported {name}.md",
  "toast.exportedHtml": "Exported {name}.html",
  "toast.exportedPdf": "Exported {name}.pdf",
  "toast.cantExportPdf": "Couldn't export the PDF.",
  "toast.packaged": "Packaged {name}.velq{note}",
  "toast.cantPackageVelq": "Couldn't package the .velq.",
  "toast.packaging": "Packaging {name}…",
  "packaging.rendering": "Rendering…",
  "packaging.ogp": "Fetching link previews…",
  "packaging.bundling": "Downloading images & packaging…",
  "toast.savedToVelq": "Saved to Documents/Velq · {count} files · {size}",
  "toast.convertedToVelq": "Converted {name} to .velq",
  "toast.cantPackageNamed": "Couldn't package {name}: {error}",
  "toast.notBundled": "{count} couldn't be bundled (not found): {items}",
  "toast.updateDesktopOnly": "Updates are only available in the desktop app.",
  "toast.upToDate": "Velq is up to date.",
  "toast.updateAvailable": "Velq {version} is available.",
  "toast.installRestart": "Install & restart",
  "toast.cantCheckUpdates": "Couldn't check for updates.",
  "toast.downloading": "Downloading Velq {version}…",
  "toast.cantInstall": "The update couldn't be installed.",

  // ---- Undo labels (shown inside "Undid: {label}") ----
  "undo.newFile": "new file",
  "undo.newFolder": "new folder",
  "undo.rename": "rename to {name}",
  "undo.delete": "delete {name}",
  "undo.duplicate": "duplicate",
  "undo.move": "move",
  "undo.deleteMany": "delete {count} items",
  "undo.moveMany": "move {count} items",
  "undo.newFolderFromSelection": "new folder with {count} items",
  "undo.renameMany": "rename {count} items",

  // ---- Multi-selection action bar ----
  "selection.count": "{count} selected",
  "selection.newFolder": "New Folder",
  "selection.newFolder.title": "New Folder with Selection",
  "selection.rename": "Rename…",
  "selection.delete": "Delete",
  "selection.clear": "Clear selection",

  // ---- Batch rename dialog ----
  "batch.title": "Rename {count} items",
  "batch.aria": "Batch rename",
  "batch.mode.replace": "Find & Replace",
  "batch.mode.add": "Add Text",
  "batch.mode.number": "Numbering",
  "batch.find": "Find",
  "batch.replace": "Replace with",
  "batch.prefix": "Prefix",
  "batch.suffix": "Suffix",
  "batch.baseName": "Name",
  "batch.startAt": "Start at",
  "batch.preview": "Preview",
  "batch.apply": "Rename",
  "batch.cancel": "Cancel",
  "batch.collision": "{count} names would collide — adjust to continue.",
  "batch.unchanged": "No names change yet.",

  // ---- Native dialog titles ----
  "dialog.chooseHtml": "Choose an HTML file to package",
  "dialog.openVault": "Open folder as a Velq vault",

  // ---- AI assistant ----
  "common.assistant": "AI assistant",
  "action.assistant": "AI assistant",
  "agent.title": "Assistant",
  "agent.close": "Close assistant",
  "agent.placeholder": "Ask for an edit — e.g. “shorten the intro”",
  "agent.send": "Send",
  "agent.sendHint": "{key} to send",
  "agent.thinking": "Working…",
  "agent.plan": "Plan",
  "agent.newFile": "New file",
  "agent.emptyNoVault":
    "Open a folder first — the assistant edits the files in the folder you have open.",
  "agent.emptyHint":
    "Ask in plain language, like “shorten the intro” or “create about.md”. Edits appear in your open document.",
  "agent.notReady": "{agent} isn't set up on this computer yet.",
  "agent.openSettings": "Open assistant settings",
  "settings.agents": "AI assistant",
  "settings.agents.desc":
    "Choose the agent that edits your files. Signing in happens in the agent's own tool — Velq keeps no keys.",
  "settings.agents.installed": "Ready",
  "settings.agents.npx": "Fetched on first use",
  "settings.agents.missing": "Not installed",
  "settings.agents.setDefault": "Set as default",
  "settings.agents.default": "Default",
  "settings.agents.login": "Log in",
  "settings.agents.install": "Install",
} as const;

/** Every key defined in the English catalog. */
export type MsgKey = keyof typeof en;
/** The shape every locale must implement: the same keys, any string values. */
export type Dict = Record<MsgKey, string>;
