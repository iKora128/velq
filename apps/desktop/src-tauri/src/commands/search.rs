//! Filename search (plan §9.4). MVP via the filesystem-walk `SearchIndex`; full-text
//! / vector search arrives later on Turso (see velq-search).

use std::path::Path;

use velq_search::{FsSearch, SearchIndex};

use super::vault::{make_node, FileNode};

#[tauri::command]
pub fn search_filenames(query: String, scope: String, limit: Option<usize>) -> Vec<FileNode> {
    let hits = FsSearch.query_filenames(&query, Path::new(&scope), limit.unwrap_or(60));
    hits.iter().filter_map(|h| make_node(&h.path)).collect()
}
