//! `.velq` viewing (plan §6/§7). The viewer window belongs to **no capability**, so
//! it has zero IPC / fs / plugin access by construction. Its content is served by the
//! `velq:` URI scheme (below) straight from the ZIP, with a strict CSP
//! (`connect-src 'none'`) — JS runs, but the network and filesystem don't.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use velq_core::Manifest;

/// Maps a viewer id (the `velq://<id>/` host) to the `.velq` file it serves.
#[derive(Default)]
pub struct VelqViewers(pub Mutex<HashMap<String, PathBuf>>);

static VIEWER_SEQ: AtomicU32 = AtomicU32::new(1);

pub fn content_type(path: &str) -> &'static str {
    match path
        .rsplit('.')
        .next()
        .map(str::to_ascii_lowercase)
        .as_deref()
    {
        Some("html" | "htm") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("ttf") => "font/ttf",
        _ => "application/octet-stream",
    }
}

/// Look up the bytes for a `velq://<id>/<path>` request.
pub fn serve(app: &AppHandle, id: &str, path: &str) -> Option<Vec<u8>> {
    let viewers = app.state::<VelqViewers>();
    let velq = viewers.0.lock().ok()?.get(id).cloned()?;
    velq_core::read_file_bytes(&velq, path).ok()
}

#[tauri::command]
pub fn read_velq_manifest(path: String) -> Result<Manifest, String> {
    velq_core::read_manifest(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unpack_velq(path: String, out_dir: String) -> Result<(), String> {
    velq_core::unpack(Path::new(&path), Path::new(&out_dir)).map_err(|e| e.to_string())
}

/// Spawn an isolated viewer window for a `.velq`. The window is in no capability
/// (zero IPC/fs) and its content is served with `connect-src 'none'`.
pub fn spawn_viewer(app: &AppHandle, path: &str) -> Result<(), String> {
    velq_core::validate(Path::new(path)).map_err(|e| e.to_string())?;
    let title = velq_core::read_manifest(Path::new(path))
        .map(|m| m.title)
        .unwrap_or_else(|_| "Velq document".into());

    let id = format!("v{}", VIEWER_SEQ.fetch_add(1, Ordering::Relaxed));
    app.state::<VelqViewers>()
        .0
        .lock()
        .unwrap()
        .insert(id.clone(), PathBuf::from(path));

    let url: tauri::Url = format!("velq://{id}/index.html")
        .parse()
        .map_err(|_| "could not build viewer url".to_string())?;

    WebviewWindowBuilder::new(
        app,
        format!("velq-viewer-{id}"),
        WebviewUrl::CustomProtocol(url),
    )
    .title(title)
    .inner_size(920.0, 720.0)
    .incognito(true)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_velq_viewer(app: AppHandle, path: String) -> Result<(), String> {
    spawn_viewer(&app, &path)
}

#[cfg(test)]
mod tests {
    use super::content_type;

    #[test]
    fn content_types() {
        assert_eq!(content_type("index.html"), "text/html; charset=utf-8");
        assert_eq!(
            content_type("assets/app.js"),
            "text/javascript; charset=utf-8"
        );
        assert_eq!(content_type("x.png"), "image/png");
    }
}
