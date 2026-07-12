//! `velq-core` — the `.velq` package format.
//!
//! A `.velq` is a ZIP (magic `PK\x03\x04`, so renaming to `.zip` just opens it —
//! no lock-in) containing `manifest.json` + `index.html` + `assets/`. This crate is
//! the foundation `velq-bundler` and the desktop app build on.

#![forbid(unsafe_code)]

use std::io::{Read, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;

#[derive(Debug, thiserror::Error)]
pub enum VelqError {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error("the .velq is missing {0}")]
    Missing(String),
}

pub type Result<T> = std::result::Result<T, VelqError>;

/// `.velq` metadata (plan §5/§6). Forward-compatible: unknown fields are ignored,
/// missing ones default.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Manifest {
    pub title: String,
    pub created: i64,
    pub updated: i64,
    pub source_url: Option<String>,
    pub generator: String,
    pub tags: Vec<String>,
    pub custom: serde_json::Value,
}

impl Default for Manifest {
    fn default() -> Self {
        Self {
            title: "Untitled".into(),
            created: 0,
            updated: 0,
            source_url: None,
            generator: generator_version(),
            tags: Vec::new(),
            custom: serde_json::Value::Null,
        }
    }
}

/// A bundled resource, e.g. `assets/css/main.css`.
pub struct Asset {
    pub path: String,
    pub bytes: Vec<u8>,
}

/// The crate version stamp for `Manifest.generator`.
pub fn generator_version() -> String {
    concat!("velq-core ", env!("CARGO_PKG_VERSION")).to_string()
}

fn options() -> SimpleFileOptions {
    SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated)
}

/// Write a `.velq` (ZIP) to `out`.
pub fn pack(out: &Path, manifest: &Manifest, index_html: &[u8], assets: &[Asset]) -> Result<()> {
    pack_docs(out, manifest, None, index_html, assets)
}

/// Write a Markdown-backed `.velq`: keeps the editable `index.md` source AND a
/// rendered `index.html` (so a viewer shows it with no Markdown engine).
pub fn pack_md(
    out: &Path,
    manifest: &Manifest,
    index_md: &[u8],
    index_html: &[u8],
    assets: &[Asset],
) -> Result<()> {
    pack_docs(out, manifest, Some(index_md), index_html, assets)
}

/// Shared writer. `index.html` is always present (the canonical "view"); `index.md`
/// is written only for Markdown docs (the canonical "edit").
fn pack_docs(
    out: &Path,
    manifest: &Manifest,
    index_md: Option<&[u8]>,
    index_html: &[u8],
    assets: &[Asset],
) -> Result<()> {
    let file = std::fs::File::create(out)?;
    let mut zip = zip::ZipWriter::new(file);
    zip.start_file("manifest.json", options())?;
    zip.write_all(serde_json::to_vec_pretty(manifest)?.as_slice())?;
    if let Some(md) = index_md {
        zip.start_file("index.md", options())?;
        zip.write_all(md)?;
    }
    zip.start_file("index.html", options())?;
    zip.write_all(index_html)?;
    for a in assets {
        zip.start_file(&a.path, options())?;
        zip.write_all(&a.bytes)?;
    }
    zip.finish()?;
    Ok(())
}

fn open(velq: &Path) -> Result<zip::ZipArchive<std::fs::File>> {
    Ok(zip::ZipArchive::new(std::fs::File::open(velq)?)?)
}

pub fn read_manifest(velq: &Path) -> Result<Manifest> {
    let mut archive = open(velq)?;
    let mut entry = archive
        .by_name("manifest.json")
        .map_err(|_| VelqError::Missing("manifest.json".into()))?;
    let mut s = String::new();
    entry.read_to_string(&mut s)?;
    Ok(serde_json::from_str(&s)?)
}

/// Read one entry's bytes (used by the isolated viewer's protocol handler).
pub fn read_file_bytes(velq: &Path, name: &str) -> Result<Vec<u8>> {
    let mut archive = open(velq)?;
    let mut entry = archive
        .by_name(name)
        .map_err(|_| VelqError::Missing(name.into()))?;
    let mut buf = Vec::new();
    entry.read_to_end(&mut buf)?;
    Ok(buf)
}

/// Extract everything to `out_dir` (the `.zip`-rename escape hatch, in-app).
pub fn unpack(velq: &Path, out_dir: &Path) -> Result<()> {
    open(velq)?.extract(out_dir)?;
    Ok(())
}

/// Every bundled asset — all members except the manifest and the index document(s).
/// Directory entries are skipped (`pack` recreates paths from the asset names).
pub fn read_assets(velq: &Path) -> Result<Vec<Asset>> {
    let mut archive = open(velq)?;
    let mut assets = Vec::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        if entry.is_dir() {
            continue;
        }
        let name = entry.name().to_string();
        if matches!(name.as_str(), "manifest.json" | "index.html" | "index.md") {
            continue;
        }
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes)?;
        assets.push(Asset { path: name, bytes });
    }
    Ok(assets)
}

/// The editable Markdown source inside a `.velq`, if it is a Markdown doc (`None`
/// for a plain HTML package).
pub fn read_index_md(velq: &Path) -> Result<Option<String>> {
    match read_file_bytes(velq, "index.md") {
        Ok(bytes) => Ok(Some(String::from_utf8_lossy(&bytes).into_owned())),
        Err(VelqError::Missing(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Replace the `index.html` inside an existing `.velq`, preserving its manifest and
/// every asset — the "edit the HTML inside the package" write-back. Written to a
/// sibling temp file then renamed over the original, so a failure never leaves a
/// half-written (corrupt) package.
pub fn update_index(velq: &Path, index_html: &[u8]) -> Result<()> {
    let manifest = read_manifest(velq)?;
    let assets = read_assets(velq)?;
    write_atomic(velq, |tmp| pack(tmp, &manifest, index_html, &assets))
}

/// The Markdown write-back: replace BOTH `index.md` (edited source) and
/// `index.html` (its freshly rendered view), preserving manifest and assets.
pub fn update_md(velq: &Path, index_md: &[u8], index_html: &[u8]) -> Result<()> {
    let manifest = read_manifest(velq)?;
    let assets = read_assets(velq)?;
    write_atomic(velq, |tmp| {
        pack_md(tmp, &manifest, index_md, index_html, &assets)
    })
}

/// Write to a sibling temp file then rename over the original, so a failure never
/// leaves a half-written (corrupt) package.
fn write_atomic(velq: &Path, write: impl FnOnce(&Path) -> Result<()>) -> Result<()> {
    let tmp = {
        let mut s = velq.as_os_str().to_owned();
        s.push(".tmp");
        std::path::PathBuf::from(s)
    };
    write(&tmp)?;
    std::fs::rename(&tmp, velq)?;
    Ok(())
}

/// A `.velq` is valid if it has both required members.
pub fn validate(velq: &Path) -> Result<()> {
    let mut archive = open(velq)?;
    for required in ["manifest.json", "index.html"] {
        archive
            .by_name(required)
            .map_err(|_| VelqError::Missing(required.into()))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> std::path::PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!(
            "velq-core-{}-{}-{name}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        p
    }

    #[test]
    fn pack_unpack_roundtrip_and_zip_magic() {
        let out = tmp("doc.velq");
        let manifest = Manifest {
            title: "Hello".into(),
            tags: vec!["demo".into()],
            ..Default::default()
        };
        let assets = vec![Asset {
            path: "assets/css/main.css".into(),
            bytes: b"body{color:red}".to_vec(),
        }];
        pack(&out, &manifest, b"<h1>Hi</h1>", &assets).unwrap();

        // Magic number is a ZIP, so renaming to .zip works (no lock-in).
        let head = std::fs::read(&out).unwrap();
        assert_eq!(&head[..4], b"PK\x03\x04");

        validate(&out).unwrap();
        assert_eq!(read_manifest(&out).unwrap().title, "Hello");
        assert_eq!(read_file_bytes(&out, "index.html").unwrap(), b"<h1>Hi</h1>");
        assert_eq!(
            read_file_bytes(&out, "assets/css/main.css").unwrap(),
            b"body{color:red}"
        );

        let dir = tmp("unpacked");
        unpack(&out, &dir).unwrap();
        assert!(dir.join("manifest.json").exists());
        assert!(dir.join("index.html").exists());
        assert!(dir.join("assets/css/main.css").exists());

        std::fs::remove_file(&out).ok();
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn update_index_replaces_html_and_keeps_manifest_and_assets() {
        let out = tmp("edit.velq");
        let manifest = Manifest {
            title: "Deck".into(),
            tags: vec!["keep".into()],
            ..Default::default()
        };
        let assets = vec![Asset {
            path: "assets/img/a.png".into(),
            bytes: b"PNGDATA".to_vec(),
        }];
        pack(&out, &manifest, b"<h1>old</h1>", &assets).unwrap();

        update_index(&out, b"<h1>new, edited in place</h1>").unwrap();

        // The HTML is the edit…
        assert_eq!(
            read_file_bytes(&out, "index.html").unwrap(),
            b"<h1>new, edited in place</h1>"
        );
        // …the manifest and every asset survive untouched…
        let m = read_manifest(&out).unwrap();
        assert_eq!(m.title, "Deck");
        assert_eq!(m.tags, vec!["keep".to_string()]);
        assert_eq!(
            read_file_bytes(&out, "assets/img/a.png").unwrap(),
            b"PNGDATA"
        );
        // …and it's still a valid package (no leftover temp file).
        validate(&out).unwrap();
        let mut tmp_path = out.as_os_str().to_owned();
        tmp_path.push(".tmp");
        assert!(!std::path::Path::new(&tmp_path).exists());

        std::fs::remove_file(&out).ok();
    }

    #[test]
    fn md_velq_keeps_source_and_rendered_and_round_trips() {
        let out = tmp("note.velq");
        let manifest = Manifest {
            title: "Note".into(),
            ..Default::default()
        };
        let assets = vec![Asset {
            path: "assets/img/pic.png".into(),
            bytes: b"IMG".to_vec(),
        }];
        pack_md(&out, &manifest, b"# Old", b"<h1>Old</h1>", &assets).unwrap();

        // Both the editable source and the rendered view are present.
        assert_eq!(read_index_md(&out).unwrap().as_deref(), Some("# Old"));
        assert_eq!(
            read_file_bytes(&out, "index.html").unwrap(),
            b"<h1>Old</h1>"
        );

        // Saving re-writes both, keeping manifest + assets.
        update_md(&out, b"# New", b"<h1>New</h1>").unwrap();
        assert_eq!(read_index_md(&out).unwrap().as_deref(), Some("# New"));
        assert_eq!(
            read_file_bytes(&out, "index.html").unwrap(),
            b"<h1>New</h1>"
        );
        assert_eq!(read_manifest(&out).unwrap().title, "Note");
        assert_eq!(read_file_bytes(&out, "assets/img/pic.png").unwrap(), b"IMG");
        validate(&out).unwrap();

        // A plain HTML package has no Markdown source.
        let html_only = tmp("plain.velq");
        pack(&html_only, &manifest, b"<h1>Hi</h1>", &[]).unwrap();
        assert_eq!(read_index_md(&html_only).unwrap(), None);

        std::fs::remove_file(&out).ok();
        std::fs::remove_file(&html_only).ok();
    }

    #[test]
    fn missing_member_is_an_error() {
        let out = tmp("bad.velq");
        let file = std::fs::File::create(&out).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        zip.start_file("manifest.json", options()).unwrap();
        zip.write_all(b"{}").unwrap();
        zip.finish().unwrap();
        assert!(validate(&out).is_err()); // no index.html
        std::fs::remove_file(&out).ok();
    }
}
