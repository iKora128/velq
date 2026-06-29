//! Bundle an HTML (or rendered Markdown) document into an offline `.velq`
//! (plan §6/§14). Heavy work (CDN fetch) runs off the UI thread.

use std::any::Any;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use velq_bundler::{bundle, BundleReport};
use velq_core::Manifest;

/// Extract a readable message from a caught panic payload.
fn panic_message(panic: Box<dyn Any + Send>) -> String {
    panic
        .downcast_ref::<&str>()
        .map(|s| (*s).to_string())
        .or_else(|| panic.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "unknown error".to_string())
}

/// Run bundling on a *plain* OS thread — crucially **outside** the Tokio runtime
/// context. `velq-bundler` uses `reqwest::blocking` for CDN fetches, which panics
/// if called from within an async runtime (Tokio's blocking pool counts). A fresh
/// `std::thread` has no runtime context, so it's safe; we also catch any panic and
/// turn it into a real error message instead of a generic "task panicked".
fn run_isolated<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    match std::thread::spawn(f).join() {
        Ok(result) => result,
        Err(panic) => Err(format!("packaging crashed: {}", panic_message(panic))),
    }
}

fn pack_bundled(input: &str, out: &str, fetch_cdn: bool) -> Result<BundleReport, String> {
    let input_path = Path::new(input);
    let html = std::fs::read_to_string(input_path).map_err(|e| e.to_string())?;
    let base = input_path.parent().unwrap_or_else(|| Path::new("."));
    let result = bundle(&html, base, fetch_cdn);

    let manifest = Manifest {
        title: input_path
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Document".into()),
        generator: velq_core::generator_version(),
        ..Default::default()
    };
    velq_core::pack(
        Path::new(out),
        &manifest,
        result.index_html.as_bytes(),
        &result.assets,
    )
    .map_err(|e| e.to_string())?;
    Ok(result.report)
}

#[tauri::command]
pub async fn bundle_to_velq(
    input: String,
    out: String,
    fetch_cdn: Option<bool>,
) -> Result<BundleReport, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_isolated(move || pack_bundled(&input, &out, fetch_cdn.unwrap_or(true)))
    })
    .await
    .map_err(|e| format!("packaging task was cancelled: {e}"))?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagedVelq {
    pub out_path: String,
    pub collected: usize,
    pub failed: usize,
}

/// A non-colliding `<stem>.velq` (then `<stem> 2.velq`, …) inside `dir`.
fn unique_velq(dir: &Path, stem: &str) -> PathBuf {
    let direct = dir.join(format!("{stem}.velq"));
    if !direct.exists() {
        return direct;
    }
    let mut i = 2;
    loop {
        let p = dir.join(format!("{stem} {i}.velq"));
        if !p.exists() {
            return p;
        }
        i += 1;
    }
}

/// Open-and-package an HTML file: trace its dependencies and write a self-contained
/// `.velq` into the user's `Documents/Velq` staging folder (created if needed).
#[tauri::command]
pub async fn package_html_file(app: AppHandle, html_path: String) -> Result<PackagedVelq, String> {
    let docs = app
        .path()
        .document_dir()
        .map_err(|e| format!("couldn't find your Documents folder: {e}"))?;
    let dir = docs.join("Velq");
    std::fs::create_dir_all(&dir).map_err(|e| format!("couldn't create {}: {e}", dir.display()))?;
    let stem = Path::new(&html_path)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Document".into());
    let out = unique_velq(&dir, &stem);
    let out_str = out.to_string_lossy().into_owned();

    let report = {
        let out_str = out_str.clone();
        tauri::async_runtime::spawn_blocking(move || {
            run_isolated(move || pack_bundled(&html_path, &out_str, true))
        })
        .await
        .map_err(|e| format!("packaging task was cancelled: {e}"))??
    };
    Ok(PackagedVelq {
        out_path: out_str,
        collected: report.collected,
        failed: report.failed.len(),
    })
}

/// Bundle a raw HTML string (the in-editor document) to a `.velq`.
#[tauri::command]
pub async fn bundle_html_to_velq(
    html: String,
    out: String,
    base_dir: Option<String>,
    fetch_cdn: Option<bool>,
) -> Result<BundleReport, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_isolated(move || {
            let base = base_dir.unwrap_or_else(|| ".".into());
            let result = bundle(&html, Path::new(&base), fetch_cdn.unwrap_or(true));
            let manifest = Manifest {
                generator: velq_core::generator_version(),
                ..Default::default()
            };
            velq_core::pack(
                Path::new(&out),
                &manifest,
                result.index_html.as_bytes(),
                &result.assets,
            )
            .map_err(|e| e.to_string())?;
            Ok(result.report)
        })
    })
    .await
    .map_err(|e| format!("packaging task was cancelled: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A CDN reference used to hit `reqwest::blocking` inside the Tokio runtime and
    /// panic; it must now resolve to a "failed" entry, never a crash.
    #[test]
    fn remote_url_packaging_does_not_panic() {
        let html = r#"<html><head><link rel="stylesheet" href="https://nonexistent.invalid/x.css"></head><body><p>hi</p></body></html>"#;
        let out = std::env::temp_dir().join("velq-remote-test.velq");
        let res = tauri::async_runtime::block_on(bundle_html_to_velq(
            html.to_string(),
            out.to_string_lossy().into_owned(),
            None,
            Some(true),
        ));
        let _ = std::fs::remove_file(&out);
        assert!(
            res.is_ok(),
            "remote URL must not panic the packager: {res:?}"
        );
        assert_eq!(res.unwrap().failed.len(), 1);
    }
}
