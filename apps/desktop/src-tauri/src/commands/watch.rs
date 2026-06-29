//! Filesystem watching (plan §10). A debounced recursive watcher emits `fs:changed`
//! with the affected paths; the frontend reloads the tree and, for an externally
//! changed open file, reloads (if clean) or shows a conflict banner (if editing).
//! The debouncer coalesces editors' atomic saves (write-temp + rename churn).

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult};
use tauri::{AppHandle, Emitter, State};

/// Holds the active debouncer; dropping it stops watching.
#[derive(Default)]
pub struct WatchState(pub Mutex<Option<Box<dyn std::any::Any + Send>>>);

#[tauri::command]
pub fn watch_vault(app: AppHandle, state: State<WatchState>, path: String) -> Result<(), String> {
    let emitter = app.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(400),
        None,
        move |res: DebounceEventResult| {
            let Ok(events) = res else {
                return;
            };
            let mut paths: Vec<String> = Vec::new();
            for ev in events {
                for p in ev.paths.iter() {
                    let s = p.to_string_lossy();
                    // Never surface git internals to the UI.
                    if s.contains("/.git/") || s.ends_with("/.git") {
                        continue;
                    }
                    paths.push(s.into_owned());
                }
            }
            if !paths.is_empty() {
                paths.sort();
                paths.dedup();
                let _ = emitter.emit("fs:changed", paths);
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.0.lock().unwrap() = Some(Box::new(debouncer));
    Ok(())
}

#[tauri::command]
pub fn unwatch_vault(state: State<WatchState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}
