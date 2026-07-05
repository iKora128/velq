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

/// The CSP for served `.velq` content. Sources are pinned to THIS package's
/// origin (`velq://<id>`) rather than `'self'` — explicit origins hold in every
/// embedding (sandboxed iframe included), and one package can never reference
/// another's files. The network stays off (`connect-src 'none'`).
pub fn velq_csp(id: &str) -> String {
    let o = format!("velq://{id}");
    format!(
        "default-src {o} data: blob:; connect-src 'none'; script-src {o} 'unsafe-inline'; style-src {o} 'unsafe-inline'; img-src {o} data: blob:; font-src {o} data:; media-src {o} data: blob:; base-uri 'none'; form-action 'none'"
    )
}

#[tauri::command]
pub fn read_velq_manifest(path: String) -> Result<Manifest, String> {
    velq_core::read_manifest(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unpack_velq(path: String, out_dir: String) -> Result<(), String> {
    velq_core::unpack(Path::new(&path), Path::new(&out_dir)).map_err(|e| e.to_string())
}

/// Validate a `.velq` and register it for `velq://` serving; returns the content
/// URL. Shared by the standalone viewer window and the in-tab viewer (the main
/// window loads it in a `sandbox="allow-scripts"` iframe — scripts run, but the
/// scheme's CSP still says `connect-src 'none'` and the frame has no IPC).
fn register(app: &AppHandle, path: &str) -> Result<String, String> {
    velq_core::validate(Path::new(path)).map_err(|e| e.to_string())?;
    let id = format!("v{}", VIEWER_SEQ.fetch_add(1, Ordering::Relaxed));
    app.state::<VelqViewers>()
        .0
        .lock()
        .unwrap()
        .insert(id.clone(), PathBuf::from(path));
    Ok(format!("velq://{id}/index.html"))
}

/// Register a `.velq` for in-tab viewing and hand back its `velq://` URL.
#[tauri::command]
pub fn stage_velq(app: AppHandle, path: String) -> Result<String, String> {
    register(&app, &path)
}

/// Spawn an isolated viewer window for a `.velq`. The window is in no capability
/// (zero IPC/fs) and its content is served with `connect-src 'none'`.
pub fn spawn_viewer(app: &AppHandle, path: &str) -> Result<(), String> {
    let title = velq_core::read_manifest(Path::new(path))
        .map(|m| m.title)
        .unwrap_or_else(|_| "Velq document".into());

    let url: tauri::Url = register(app, path)?
        .parse()
        .map_err(|_| "could not build viewer url".to_string())?;

    WebviewWindowBuilder::new(
        app,
        format!("velq-viewer-{}", VIEWER_SEQ.fetch_add(1, Ordering::Relaxed)),
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
    use super::{content_type, velq_csp};

    #[test]
    fn content_types() {
        assert_eq!(content_type("index.html"), "text/html; charset=utf-8");
        assert_eq!(
            content_type("assets/app.js"),
            "text/javascript; charset=utf-8"
        );
        assert_eq!(content_type("x.png"), "image/png");
    }

    /// The CSP must pin sources to the package's own explicit origin, never
    /// `'self'`: WebKit does not resolve `'self'` for subresources inside a
    /// sandboxed (opaque-origin) iframe — the in-tab viewer's images silently
    /// vanished (M31 field bug). Explicit origins hold in every embedding.
    #[test]
    fn csp_pins_the_package_origin() {
        let csp = velq_csp("v7");
        assert!(csp.contains("img-src velq://v7 data: blob:"), "{csp}");
        assert!(csp.contains("connect-src 'none'"), "{csp}");
        assert!(!csp.contains("'self'"), "{csp}");
    }
}
