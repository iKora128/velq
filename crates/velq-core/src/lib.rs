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
    let file = std::fs::File::create(out)?;
    let mut zip = zip::ZipWriter::new(file);
    zip.start_file("manifest.json", options())?;
    zip.write_all(serde_json::to_vec_pretty(manifest)?.as_slice())?;
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
