//! Tauri command modules, one per domain (plan §5). Each `#[tauri::command]`
//! returns `Result<T, String>`; DTOs are `camelCase` for the frontend.

pub mod agent;
pub mod app;
pub mod bundle;
pub mod export;
pub mod render;
pub mod search;
pub mod vault;
pub mod vcs;
pub mod velq;
pub mod watch;
