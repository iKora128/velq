//! Bundle an HTML (or rendered Markdown) document into an offline `.velq`
//! (plan §6/§14). Dependency fetches are async (`velq-bundler` awaits them); the
//! command runs on Tauri's runtime, so we just `.await` — no blocking-HTTP gymnastics.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use velq_bundler::{bundle, BundleReport};
use velq_core::Manifest;

async fn pack_bundled(input: &str, out: &str, fetch_cdn: bool) -> Result<BundleReport, String> {
    let input_path = Path::new(input);
    let html = std::fs::read_to_string(input_path).map_err(|e| e.to_string())?;
    let base = input_path.parent().unwrap_or_else(|| Path::new("."));
    let result = bundle(&html, base, fetch_cdn).await;

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
    pack_bundled(&input, &out, fetch_cdn.unwrap_or(true)).await
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

/// Stems so generic that every site ships one — for these the parent folder is
/// the document's real name, so two `index.html` never fight over `index.velq`.
const GENERIC_STEMS: &[&str] = &["index", "home", "default", "main", "page", "document", "untitled"];

/// The `.velq` stem for a source HTML path: `portfolio/index.html` →
/// `portfolio-index`, but a distinctive name (`Q2レポート.html`) stays itself.
fn velq_stem(html_path: &Path) -> String {
    let stem = html_path
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Document".into());
    if GENERIC_STEMS.iter().any(|g| stem.eq_ignore_ascii_case(g)) {
        if let Some(parent) = html_path.parent().and_then(|p| p.file_name()) {
            return format!("{}-{stem}", parent.to_string_lossy());
        }
    }
    stem
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
    let stem = velq_stem(Path::new(&html_path));
    let out = unique_velq(&dir, &stem);
    let out_str = out.to_string_lossy().into_owned();

    let report = pack_bundled(&html_path, &out_str, true).await?;
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
    let base = base_dir.unwrap_or_else(|| ".".into());
    let result = bundle(&html, Path::new(&base), fetch_cdn.unwrap_or(true)).await;
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
}

#[cfg(test)]
mod tests {
    use super::*;

    /// End-to-end on the real repo file the user tests with: the icon gallery,
    /// whose `<img>` tags are ALL built by inline JS from a template literal
    /// (`velq-${k}-1024.png`). Packaging must pick them up via the script scan
    /// and the package must serve them back at their original paths.
    #[test]
    fn gallery_html_packages_with_its_script_built_images() {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let html = manifest_dir.join("../../../docs/brand/icon-candidates/index.html");
        if !html.exists() {
            return; // docs pruned (crate built standalone) — nothing to verify
        }
        let out = std::env::temp_dir().join("velq-gallery-e2e.velq");
        let _ = std::fs::remove_file(&out);
        let report = tauri::async_runtime::block_on(pack_bundled(
            html.to_string_lossy().as_ref(),
            out.to_string_lossy().as_ref(),
            false,
        ))
        .unwrap();
        // 11 icon PNGs are referenced only through the template literal.
        assert!(report.collected >= 10, "collected {}", report.collected);
        velq_core::validate(&out).unwrap();
        let png = velq_core::read_file_bytes(&out, "velq-a-paper-1024.png").unwrap();
        assert!(!png.is_empty());
        // The file is left in temp on purpose — sessions may stage it for the user.
    }

    #[test]
    fn generic_stems_get_the_parent_folder_prefix() {
        assert_eq!(velq_stem(Path::new("/dl/portfolio/index.html")), "portfolio-index");
        assert_eq!(velq_stem(Path::new("/x/Site/INDEX.HTML")), "Site-INDEX");
        assert_eq!(velq_stem(Path::new("/a/blog/home.html")), "blog-home");
    }

    #[test]
    fn distinctive_stems_stay_themselves() {
        assert_eq!(velq_stem(Path::new("/docs/Q2レポート.html")), "Q2レポート");
        assert_eq!(velq_stem(Path::new("/dl/press-kit.html")), "press-kit");
    }

    /// A CDN reference used to panic the packager (blocking HTTP inside Tokio). With
    /// async fetches it must resolve to a "failed" entry instead — never a crash.
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
