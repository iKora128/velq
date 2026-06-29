//! Save-history commands (plan §5, §10). Thin glue over `velq-vcs`; the history
//! repo is opened per call (libgit2 open is cheap and avoids shared-state locking).

use std::path::Path;

use velq_vcs::{History, Version};

fn history(root: &str) -> Result<History, String> {
    History::open_or_init(Path::new(root)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_history(root: String) -> Result<(), String> {
    history(&root).map(|_| ())
}

/// Write the document and save a version in one step (the save shortcut + autosave).
#[tauri::command]
pub fn save_version(root: String, path: String, content: String) -> Result<Version, String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    history(&root)?
        .commit_save(Path::new(&path), None)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_versions(root: String, path: String) -> Result<Vec<Version>, String> {
    history(&root)?
        .list_versions(Path::new(&path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn version_content(root: String, path: String, version_id: String) -> Result<String, String> {
    history(&root)?
        .version_content(Path::new(&path), &version_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_version(root: String, path: String, version_id: String) -> Result<Version, String> {
    history(&root)?
        .restore(Path::new(&path), &version_id)
        .map_err(|e| e.to_string())
}
