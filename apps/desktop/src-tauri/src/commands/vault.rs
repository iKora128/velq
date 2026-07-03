//! Vault filesystem reads: open a root folder and lazily list one directory level
//! at a time (plan §9). Hidden entries (dotfiles, `node_modules`) are filtered so
//! writers never see `.git`. Git initialization is deferred to the save-history
//! milestone (M11).

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultInfo {
    pub path: String,
    pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: String,
    pub name: String,
    pub kind: String, // "file" | "dir"
    pub ext: Option<String>,
    pub size: u64,
    pub mtime: i64,
    pub created: i64,       // filesystem create time (ms); falls back to mtime
    pub git_status: String, // "none" until M11
    pub has_children: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
    pub mtime: i64,
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.') || name == "node_modules"
}

fn mtime_millis(meta: &fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Create ("birth") time in ms. Not every platform records it, so fall back to the
/// modified time — good enough to rank "recently added" items.
fn created_millis(meta: &fs::Metadata) -> i64 {
    meta.created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or_else(|| mtime_millis(meta))
}

fn dir_has_children(path: &Path) -> bool {
    fs::read_dir(path)
        .map(|mut it| {
            it.any(|e| {
                e.ok()
                    .and_then(|e| e.file_name().into_string().ok())
                    .map(|n| !is_hidden(&n))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

pub fn make_node(path: &Path) -> Option<FileNode> {
    let meta = fs::symlink_metadata(path).ok()?;
    let name = path.file_name()?.to_string_lossy().to_string();
    let is_dir = meta.is_dir();
    Some(FileNode {
        path: path.to_string_lossy().to_string(),
        name,
        kind: if is_dir { "dir".into() } else { "file".into() },
        ext: if is_dir {
            None
        } else {
            path.extension().map(|e| e.to_string_lossy().to_string())
        },
        size: if is_dir { 0 } else { meta.len() },
        mtime: mtime_millis(&meta),
        created: created_millis(&meta),
        git_status: "none".into(),
        has_children: if is_dir {
            dir_has_children(path)
        } else {
            false
        },
    })
}

#[tauri::command]
pub fn open_vault(path: String) -> Result<VaultInfo, String> {
    let canonical = fs::canonicalize(&path).map_err(|e| e.to_string())?;
    if !canonical.is_dir() {
        return Err("That path is not a folder.".into());
    }
    let name = canonical
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());
    Ok(VaultInfo {
        path: canonical.to_string_lossy().to_string(),
        name,
    })
}

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileNode>, String> {
    let mut nodes: Vec<FileNode> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_str()
                .map(|n| !is_hidden(n))
                .unwrap_or(false)
        })
        .filter_map(|e| make_node(&e.path()))
        .collect();
    // Folders first, then files; each alphabetical (case-insensitive).
    nodes.sort_by(|a, b| match (a.kind.as_str(), b.kind.as_str()) {
        ("dir", "file") => std::cmp::Ordering::Less,
        ("file", "dir") => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(nodes)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub node: FileNode,
    pub title: Option<String>,
    pub snippet: Option<String>,
}

fn is_textish(ext: &Option<String>) -> bool {
    // HTML excluded: its first line ("<!doctype html>") makes a poor title; the
    // card falls back to the filename.
    matches!(
        ext.as_deref().map(str::to_lowercase).as_deref(),
        Some("md" | "markdown" | "txt")
    )
}

/// Strip the leading block markers and inline emphasis from a Markdown line.
fn strip_md(line: &str) -> String {
    let t = line.trim_start_matches(['#', '>', '-', '*', '+', ' ', '\t']);
    t.replace(['*', '`', '_', '#'], "").trim().to_string()
}

fn truncate_chars(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(n).collect();
        out.push('…');
        out
    }
}

fn text_preview(path: &Path) -> (Option<String>, Option<String>) {
    let Ok(bytes) = fs::read(path) else {
        return (None, None);
    };
    let text = String::from_utf8_lossy(&bytes);
    let mut lines = text
        .lines()
        .take(40)
        .map(strip_md)
        .filter(|l| !l.is_empty());
    let title = lines.next();
    let rest = lines.take(3).collect::<Vec<_>>().join(" ");
    let snippet = if rest.is_empty() {
        None
    } else {
        Some(truncate_chars(&rest, 160))
    };
    (title, snippet)
}

/// List a directory with a title + body snippet for each text document (plan §9.2).
#[tauri::command]
pub fn preview_dir(path: String) -> Result<Vec<FilePreview>, String> {
    let nodes = read_dir(path)?;
    Ok(nodes
        .into_iter()
        .map(|node| {
            let (title, snippet) = if node.kind == "file" && is_textish(&node.ext) {
                text_preview(Path::new(&node.path))
            } else {
                (None, None)
            };
            FilePreview {
                node,
                title,
                snippet,
            }
        })
        .collect())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FileContent, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(FileContent {
        content: String::from_utf8_lossy(&bytes).into_owned(),
        encoding: "utf-8".into(),
        mtime: mtime_millis(&meta),
    })
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<i64, String> {
    fs::write(&path, content).map_err(|e| e.to_string())?;
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    Ok(mtime_millis(&meta))
}

// ---- CRUD (plan §9.3) ----

fn split_name(name: &str) -> (String, String) {
    match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), name[i + 1..].to_string()),
        _ => (name.to_string(), String::new()),
    }
}

/// A non-colliding path inside `parent` for `name` (appends " 2", " 3", … on clash).
fn unique_path(parent: &Path, name: &str) -> PathBuf {
    let direct = parent.join(name);
    if !direct.exists() {
        return direct;
    }
    let (stem, ext) = split_name(name);
    let mut i = 2;
    loop {
        let candidate = if ext.is_empty() {
            format!("{stem} {i}")
        } else {
            format!("{stem} {i}.{ext}")
        };
        let p = parent.join(candidate);
        if !p.exists() {
            return p;
        }
        i += 1;
    }
}

#[tauri::command]
pub fn create_file(parent_path: String, name: String) -> Result<FileNode, String> {
    let path = unique_path(Path::new(&parent_path), &name);
    fs::write(&path, "").map_err(|e| e.to_string())?;
    make_node(&path).ok_or_else(|| "Failed to read created file".into())
}

#[tauri::command]
pub fn create_folder(parent_path: String, name: String) -> Result<FileNode, String> {
    let path = unique_path(Path::new(&parent_path), &name);
    fs::create_dir(&path).map_err(|e| e.to_string())?;
    make_node(&path).ok_or_else(|| "Failed to read created folder".into())
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<FileNode, String> {
    let to_p = Path::new(&to);
    if to_p.exists() {
        return Err("An item with that name already exists.".into());
    }
    fs::rename(&from, to_p).map_err(|e| e.to_string())?;
    make_node(to_p).ok_or_else(|| "Failed to read renamed item".into())
}

#[tauri::command]
pub fn move_path(from: String, to: String) -> Result<FileNode, String> {
    rename_path(from, to)
}

/// Delete to the OS trash (never a hard delete from the UI).
#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_in_os(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

/// Collect file nodes (not folders) anywhere under `dir`, skipping hidden entries,
/// stopping once `cap` are gathered so a huge vault can't stall the caller.
fn collect_files(dir: &Path, out: &mut Vec<FileNode>, cap: usize) {
    if out.len() >= cap {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut subdirs = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_hidden(&name) {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            subdirs.push(path);
        } else if let Some(node) = make_node(&path) {
            out.push(node);
        }
    }
    for sd in subdirs {
        if out.len() >= cap {
            break;
        }
        collect_files(&sd, out, cap);
    }
}

/// The most recently *added* files anywhere in the vault, newest first — a
/// Finder-style "Recents". "Added" uses the filesystem create time (`created`),
/// which falls back to the modified time where the platform doesn't record it.
#[tauri::command]
pub fn recent_files(root: String, limit: Option<usize>) -> Result<Vec<FileNode>, String> {
    let mut files = Vec::new();
    collect_files(Path::new(&root), &mut files, 4000);
    files.sort_by_key(|f| std::cmp::Reverse(f.created));
    files.truncate(limit.unwrap_or(12));
    Ok(files)
}

/// The friendly starter document dropped into a brand-new Velq folder.
const WELCOME_MD: &str = "# Welcome to Velq

This is your **Velq folder** — an ordinary folder at `Documents/Velq`. Everything you
write, and every web page you package into a `.velq`, lives right here, so there's only
ever one place to look.

A few folders to start (rename or delete them freely — they're just folders on disk):

- **Documents** — finished writing
- **Projects** — work in progress
- **Archive** — things you're done with

Tip: drag a `.velq` (or any file) onto the window to add it here.
";

fn has_no_subdirs(dir: &Path) -> bool {
    fs::read_dir(dir)
        .map(|it| !it.flatten().any(|e| e.path().is_dir()))
        .unwrap_or(false)
}

/// The default home: `Documents/Velq`. Seeded with a small starter structure while
/// it has no folders yet — so a newcomer (or a Velq folder that so far only holds a
/// stray packaged `.velq`) never faces an empty void or a folder picker. Once any
/// folder exists we leave it alone, so we never fight the user's own organisation.
#[tauri::command]
pub fn ensure_default_vault(app: tauri::AppHandle) -> Result<VaultInfo, String> {
    let docs = app
        .path()
        .document_dir()
        .map_err(|e| format!("couldn't find your Documents folder: {e}"))?;
    let dir = docs.join("Velq");
    fs::create_dir_all(&dir).map_err(|e| format!("couldn't create {}: {e}", dir.display()))?;
    if has_no_subdirs(&dir) {
        for preset in ["Documents", "Projects", "Archive"] {
            let _ = fs::create_dir_all(dir.join(preset));
        }
        let welcome = dir.join("Welcome.md");
        if !welcome.exists() {
            let _ = fs::write(welcome, WELCOME_MD);
        }
    }
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Velq".into());
    Ok(VaultInfo {
        path: dir.to_string_lossy().to_string(),
        name,
    })
}

/// Copy a file from anywhere on disk into `dest_dir` (binary-safe; used by
/// drag-and-drop), giving it a non-colliding name. Returns the new node.
#[tauri::command]
pub fn import_file(src: String, dest_dir: String) -> Result<FileNode, String> {
    let src_p = Path::new(&src);
    if src_p.is_dir() {
        return Err("Dragging in a whole folder isn't supported yet — drop files.".into());
    }
    let name = src_p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .ok_or("That file has no name.")?;
    let dest = unique_path(Path::new(&dest_dir), &name);
    fs::copy(src_p, &dest).map_err(|e| e.to_string())?;
    make_node(&dest).ok_or_else(|| "Failed to read the imported file".into())
}
