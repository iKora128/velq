//! App-level settings, persisted as JSON in the OS app-config directory.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// One entry in the "Recently opened" list (a Finder-style Recents). Kept here
/// because it persists with the rest of the user's settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentDoc {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub theme: String,
    pub density: String,
    pub editor_mode: String,
    pub file_view: String,
    pub vim_mode: bool,
    pub show_line_numbers: bool,
    pub prose_font: bool,
    pub last_vault: Option<String>,
    pub last_export_dir: Option<String>,
    pub auto_package_html: bool,
    pub recent_docs: Vec<RecentDoc>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            density: "comfortable".into(),
            editor_mode: "live".into(),
            file_view: "grid".into(),
            vim_mode: false,
            show_line_numbers: false,
            prose_font: true,
            last_vault: None,
            last_export_dir: None,
            auto_package_html: true,
            recent_docs: Vec::new(),
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    let path = settings_path(&app)?;
    match std::fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).or_else(|_| Ok(Settings::default())),
        Err(_) => Ok(Settings::default()),
    }
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let path = settings_path(&app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}
