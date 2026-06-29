//! `velq-search` — the `SearchIndex` trait and the Phase-1 filename search.
//!
//! The MVP ([`FsSearch`]) walks the filesystem and scores filename matches — no DB
//! needed for a string match. Turso (the chosen engine, plan §2-D2) backs full-text
//! and vector search in a later phase via a future `TursoIndex` impl of the same
//! trait, so callers never change. See the project memory `velq-search-mvp-decision`.

#![forbid(unsafe_code)]

use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Hit {
    pub path: PathBuf,
    pub name: String,
    pub is_dir: bool,
    pub score: i32,
}

pub trait SearchIndex {
    /// Filename search within `scope` (a folder subtree), best matches first.
    fn query_filenames(&self, query: &str, scope: &Path, limit: usize) -> Vec<Hit>;
}

/// Filesystem-walk filename search. Stateless: walks `scope` per query (debounced
/// upstream); for a 10k-file vault a name-only walk is a few milliseconds.
pub struct FsSearch;

fn is_hidden(name: &str) -> bool {
    name.starts_with('.') || name == "node_modules"
}

/// Higher is better. Prefix match > word-boundary match > plain substring; earlier
/// match positions rank higher. `None` if `q` isn't present.
fn score(name_lower: &str, q: &str) -> Option<i32> {
    let pos = name_lower.find(q)?;
    let mut s = 60 - (pos as i32).min(50);
    if pos == 0 {
        s += 100;
    } else if name_lower
        .as_bytes()
        .get(pos - 1)
        .is_some_and(|b| !b.is_ascii_alphanumeric())
    {
        s += 40;
    }
    Some(s)
}

fn walk(dir: &Path, q: &str, out: &mut Vec<Hit>, cap: usize) {
    if out.len() >= cap {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut subdirs = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_hidden(&name) {
            continue;
        }
        let path = entry.path();
        let is_dir = path.is_dir();
        if let Some(sc) = score(&name.to_lowercase(), q) {
            out.push(Hit {
                path: path.clone(),
                name,
                is_dir,
                score: sc,
            });
        }
        if is_dir {
            subdirs.push(path);
        }
    }
    for sd in subdirs {
        if out.len() >= cap {
            break;
        }
        walk(&sd, q, out, cap);
    }
}

impl SearchIndex for FsSearch {
    fn query_filenames(&self, query: &str, scope: &Path, limit: usize) -> Vec<Hit> {
        let q = query.trim().to_lowercase();
        if q.is_empty() {
            return Vec::new();
        }
        let mut hits = Vec::new();
        walk(scope, &q, &mut hits, limit.saturating_mul(4).max(limit));
        hits.sort_by(|a, b| {
            b.score
                .cmp(&a.score)
                .then(a.name.len().cmp(&b.name.len()))
                .then_with(|| a.name.cmp(&b.name))
        });
        hits.truncate(limit);
        hits
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn fixture() -> tempdir::Dir {
        let dir = tempdir::Dir::new("velq-search");
        fs::create_dir(dir.path().join("notes")).unwrap();
        fs::write(dir.path().join("Readme.md"), "x").unwrap();
        fs::write(dir.path().join("notes/meeting-notes.md"), "x").unwrap();
        fs::write(dir.path().join("notes/Random.md"), "x").unwrap();
        fs::create_dir(dir.path().join(".git")).unwrap();
        fs::write(dir.path().join(".git/config"), "x").unwrap();
        dir
    }

    #[test]
    fn finds_nested_and_scores_prefix_first() {
        let dir = fixture();
        let hits = FsSearch.query_filenames("note", dir.path(), 10);
        let names: Vec<_> = hits.iter().map(|h| h.name.as_str()).collect();
        assert!(names.contains(&"meeting-notes.md"));
        // "notes" folder (prefix) outranks "meeting-notes.md" (mid-word).
        assert_eq!(hits[0].name, "notes");
    }

    #[test]
    fn skips_hidden_dirs() {
        let dir = fixture();
        let hits = FsSearch.query_filenames("config", dir.path(), 10);
        assert!(hits.is_empty(), "hidden .git/config must not appear");
    }

    #[test]
    fn empty_query_returns_nothing() {
        let dir = fixture();
        assert!(FsSearch.query_filenames("  ", dir.path(), 10).is_empty());
    }
}

/// Minimal tempdir helper for tests (avoids a dev-dependency).
#[cfg(test)]
mod tempdir {
    use std::path::{Path, PathBuf};

    pub struct Dir(PathBuf);
    impl Dir {
        pub fn new(prefix: &str) -> Self {
            let mut counter = std::env::temp_dir();
            let unique = format!(
                "{prefix}-{}-{}",
                std::process::id(),
                COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
            );
            counter.push(unique);
            std::fs::create_dir_all(&counter).unwrap();
            Dir(counter)
        }
        pub fn path(&self) -> &Path {
            &self.0
        }
    }
    impl Drop for Dir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
}
