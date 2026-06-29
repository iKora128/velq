//! `velq-vcs` — the "save history" domain.
//!
//! Wraps git2 (vendored libgit2, no system Git) so saves become versions and the
//! user can browse / diff / restore — but **no git vocabulary leaks**: the public
//! surface speaks `Version`, `commit_save`, `restore`. similar powers the summaries
//! and the headless line diff (the UI renders word-level diffs with @codemirror/merge).

#![forbid(unsafe_code)]

use std::path::{Path, PathBuf};

use git2::{Commit, Oid, Repository, Signature, Tree};
use serde::Serialize;
use similar::{ChangeTag, TextDiff};

#[derive(Debug, thiserror::Error)]
pub enum VcsError {
    #[error(transparent)]
    Git(#[from] git2::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, VcsError>;

/// A point in a file's save history. No commit/branch/HEAD terms.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    pub id: String,
    pub time: i64,
    pub label: Option<String>,
    pub summary: String,
}

/// One line in a unified diff (for summaries + headless tests).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineChange {
    pub tag: String, // "equal" | "insert" | "delete"
    pub text: String,
}

const GITIGNORE: &str = "# Velq save history tracks text only; big binaries are skipped.\n*.png\n*.jpg\n*.jpeg\n*.gif\n*.webp\n*.svg\n*.mp4\n*.mov\n*.mp3\n*.wav\n*.pdf\n*.zip\n*.velq\n*.woff\n*.woff2\n*.ttf\n*.otf\n.DS_Store\n";

pub struct History {
    repo: Repository,
    root: PathBuf,
}

impl History {
    /// Open the vault's history, creating it (and a sensible `.gitignore`) if absent.
    pub fn open_or_init(root: &Path) -> Result<History> {
        let repo = Repository::open(root).or_else(|_| Repository::init(root))?;
        let h = History {
            repo,
            root: root.to_path_buf(),
        };
        h.ensure_gitignore()?;
        Ok(h)
    }

    fn ensure_gitignore(&self) -> Result<()> {
        let p = self.root.join(".gitignore");
        if !p.exists() {
            std::fs::write(&p, GITIGNORE)?;
        }
        Ok(())
    }

    fn signature(&self) -> Result<Signature<'static>> {
        match self.repo.signature() {
            Ok(s) => Ok(s),
            Err(_) => Ok(Signature::now("Velq", "save@velq.local")?),
        }
    }

    fn rel(&self, file: &Path) -> Result<PathBuf> {
        let abs = std::fs::canonicalize(file).unwrap_or_else(|_| file.to_path_buf());
        let root = std::fs::canonicalize(&self.root).unwrap_or_else(|_| self.root.clone());
        abs.strip_prefix(&root)
            .map(Path::to_path_buf)
            .map_err(|_| VcsError::Other("file is outside the vault".into()))
    }

    /// Save the current file as a new version. Auto-generates a message if none.
    pub fn commit_save(&self, file: &Path, message: Option<&str>) -> Result<Version> {
        let rel = self.rel(file)?;
        let mut index = self.repo.index()?;
        index.add_path(&rel)?;
        index.write()?;
        let tree = self.repo.find_tree(index.write_tree()?)?;
        let sig = self.signature()?;
        let parent = self.repo.head().ok().and_then(|h| h.peel_to_commit().ok());
        let msg = message
            .map(str::to_string)
            .unwrap_or_else(|| default_message(&rel));
        let parents: Vec<&Commit> = parent.iter().collect();
        let oid = self
            .repo
            .commit(Some("HEAD"), &sig, &sig, &msg, &tree, &parents)?;
        self.version_from_commit(&self.repo.find_commit(oid)?, &rel)
    }

    /// Versions that touched this file, newest first.
    pub fn list_versions(&self, file: &Path) -> Result<Vec<Version>> {
        let rel = self.rel(file)?;
        let mut walk = self.repo.revwalk()?;
        if walk.push_head().is_err() {
            return Ok(Vec::new());
        }
        walk.set_sorting(git2::Sort::TIME)?;
        let mut out = Vec::new();
        for oid in walk {
            let commit = self.repo.find_commit(oid?)?;
            if commit_touches(&commit, &rel)? {
                out.push(self.version_from_commit(&commit, &rel)?);
            }
        }
        Ok(out)
    }

    pub fn version_content(&self, file: &Path, version_id: &str) -> Result<String> {
        let rel = self.rel(file)?;
        let commit = self.repo.find_commit(Oid::from_str(version_id)?)?;
        content_at(&self.repo, &commit, &rel)
            .ok_or_else(|| VcsError::Other("file not present in that version".into()))
    }

    /// Restore is **non-destructive**: it writes the old content and saves a *new*
    /// version on top (later versions are never deleted).
    pub fn restore(&self, file: &Path, version_id: &str) -> Result<Version> {
        let content = self.version_content(file, version_id)?;
        std::fs::write(file, content)?;
        self.commit_save(
            file,
            Some(&format!("Restore version {}", short(version_id))),
        )
    }

    fn version_from_commit(&self, commit: &Commit, rel: &Path) -> Result<Version> {
        let new = content_at(&self.repo, commit, rel).unwrap_or_default();
        let old = commit
            .parent(0)
            .ok()
            .and_then(|p| content_at(&self.repo, &p, rel))
            .unwrap_or_default();
        Ok(Version {
            id: commit.id().to_string(),
            time: commit.time().seconds(),
            label: None,
            summary: summarize(&old, &new),
        })
    }
}

fn default_message(rel: &Path) -> String {
    format!("Save {}", rel.display())
}

fn short(id: &str) -> String {
    id.chars().take(7).collect()
}

fn tree_blob_oid(tree: &Tree, rel: &Path) -> Option<Oid> {
    tree.get_path(rel).ok().map(|e| e.id())
}

fn commit_touches(commit: &Commit, rel: &Path) -> Result<bool> {
    let new = tree_blob_oid(&commit.tree()?, rel);
    let old = match commit.parent(0) {
        Ok(p) => tree_blob_oid(&p.tree()?, rel),
        Err(_) => None,
    };
    Ok(new != old)
}

fn content_at(repo: &Repository, commit: &Commit, rel: &Path) -> Option<String> {
    let entry = commit.tree().ok()?.get_path(rel).ok()?;
    let blob = repo.find_blob(entry.id()).ok()?;
    Some(String::from_utf8_lossy(blob.content()).into_owned())
}

/// A friendly one-line summary of a change, e.g. "3 added · 1 removed".
pub fn summarize(old: &str, new: &str) -> String {
    let diff = TextDiff::from_lines(old, new);
    let mut added = 0usize;
    let mut removed = 0usize;
    for ch in diff.iter_all_changes() {
        match ch.tag() {
            ChangeTag::Insert => added += 1,
            ChangeTag::Delete => removed += 1,
            ChangeTag::Equal => {}
        }
    }
    match (added, removed) {
        (0, 0) => "No changes".into(),
        (a, 0) => format!("{a} line{} added", plural(a)),
        (0, d) => format!("{d} line{} removed", plural(d)),
        (a, d) => format!("{a} added · {d} removed"),
    }
}

fn plural(n: usize) -> &'static str {
    if n == 1 {
        ""
    } else {
        "s"
    }
}

/// Line-level unified diff (the UI renders word-level with @codemirror/merge).
pub fn diff_lines(old: &str, new: &str) -> Vec<LineChange> {
    TextDiff::from_lines(old, new)
        .iter_all_changes()
        .map(|ch| LineChange {
            tag: match ch.tag() {
                ChangeTag::Insert => "insert",
                ChangeTag::Delete => "delete",
                ChangeTag::Equal => "equal",
            }
            .into(),
            text: ch.value().to_string(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp() -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!(
            "velq-vcs-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    #[test]
    fn save_diff_restore_roundtrip() {
        let root = tmp();
        let file = root.join("note.md");
        let h = History::open_or_init(&root).unwrap();

        std::fs::write(&file, "# Title\n\nfirst\n").unwrap();
        let v1 = h.commit_save(&file, None).unwrap();

        std::fs::write(&file, "# Title\n\nfirst\nsecond\n").unwrap();
        let _v2 = h.commit_save(&file, None).unwrap();

        // Two versions, newest first.
        let versions = h.list_versions(&file).unwrap();
        assert_eq!(versions.len(), 2);
        assert_eq!(versions[0].summary, "1 line added");

        // Old content is retrievable.
        assert_eq!(
            h.version_content(&file, &v1.id).unwrap(),
            "# Title\n\nfirst\n"
        );

        // Restore is non-destructive: a third version appears, file matches v1.
        h.restore(&file, &v1.id).unwrap();
        assert_eq!(h.list_versions(&file).unwrap().len(), 3);
        assert_eq!(
            std::fs::read_to_string(&file).unwrap(),
            "# Title\n\nfirst\n"
        );

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn gitignore_is_seeded() {
        let root = tmp();
        History::open_or_init(&root).unwrap();
        let gi = std::fs::read_to_string(root.join(".gitignore")).unwrap();
        assert!(gi.contains("*.png"));
        assert!(gi.contains("*.velq"));
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn summarize_counts() {
        assert_eq!(summarize("a\nb\n", "a\nb\nc\n"), "1 line added");
        assert_eq!(summarize("a\nb\n", "a\n"), "1 line removed");
        assert_eq!(summarize("a\n", "a\n"), "No changes");
    }
}
