//! `velq-bundler` — turn an HTML document into a fully offline `.velq` by collecting
//! every dependency (local files *and* CDN URLs) and rewriting links to `assets/`
//! (plan §6/§14). One streaming pass to collect, fetch, then one pass to rewrite.

#![forbid(unsafe_code)]

pub mod ogp;

use std::cell::RefCell;
use std::collections::BTreeMap;
use std::path::{Component, Path, PathBuf};

use lol_html::html_content::ContentType;
use lol_html::{element, rewrite_str, text, RewriteStrSettings};
use serde::Serialize;
use sha2::{Digest, Sha256};
use velq_core::Asset;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Css,
    Js,
    Img,
    Font,
    Other,
}

impl Kind {
    fn dir(self) -> &'static str {
        match self {
            Kind::Css => "css",
            Kind::Js => "js",
            Kind::Img => "img",
            Kind::Font => "fonts",
            Kind::Other => "other",
        }
    }
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleReport {
    pub collected: usize,
    pub bytes: u64,
    pub failed: Vec<FailedUrl>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FailedUrl {
    pub url: String,
    pub reason: String,
}

pub struct BundleResult {
    pub index_html: String,
    /// Where `index.html` sits inside the package — root `"index.html"` normally,
    /// or a deeper mirror path (e.g. `"docs/mock-html/index.html"`) when the
    /// document reaches assets via `../`. Placing the HTML at its original depth is
    /// what lets those `../` references resolve unchanged in the viewer.
    pub index_path: String,
    pub assets: Vec<Asset>,
    pub report: BundleReport,
}

enum Source {
    Local(PathBuf),
    Remote(String),
    Inline, // data: URIs etc. — leave untouched
}

fn classify(url: &str, base: &Path) -> Source {
    let u = url.trim();
    if u.starts_with("data:") || u.starts_with('#') || u.is_empty() {
        Source::Inline
    } else if u.starts_with("http://") || u.starts_with("https://") {
        Source::Remote(u.to_string())
    } else if let Some(rest) = u.strip_prefix("//") {
        Source::Remote(format!("https://{rest}"))
    } else {
        Source::Local(base.join(u.split(['?', '#']).next().unwrap_or(u)))
    }
}

/// Lexically fold `.`/`..` — no filesystem access (refs may point at paths that only
/// make sense relative to the document, and we just need a normal form to compare
/// and re-root). Leading `..` that can't be folded away are kept.
fn normalize(p: &Path) -> PathBuf {
    let mut out: Vec<Component> = Vec::new();
    for comp in p.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => match out.last() {
                Some(Component::Normal(_)) => {
                    out.pop();
                }
                _ => out.push(Component::ParentDir),
            },
            c => out.push(c),
        }
    }
    out.iter().collect()
}

/// Make `base` absolute (against the process CWD) then normalize it.
fn abs_norm(base: &Path) -> PathBuf {
    let abs = if base.is_absolute() {
        base.to_path_buf()
    } else {
        std::env::current_dir().unwrap_or_default().join(base)
    };
    normalize(&abs)
}

/// The deepest directory containing every path — the component-wise longest common
/// prefix. Used as the package root, so each reference keeps its position relative
/// to it (and the document's own `../` links resolve the same way they did on disk).
fn common_ancestor(paths: &[PathBuf]) -> Option<PathBuf> {
    let mut iter = paths.iter();
    let mut prefix: Vec<Component> = iter.next()?.components().collect();
    for p in iter {
        let comps: Vec<Component> = p.components().collect();
        let keep = prefix
            .iter()
            .zip(&comps)
            .take_while(|(a, b)| a == b)
            .count();
        prefix.truncate(keep);
    }
    (!prefix.is_empty()).then(|| prefix.iter().collect())
}

/// `path` relative to `base` with `/` separators, if `base` is an ancestor (both
/// normalized absolute paths). `None` means `path` escapes the package root.
fn rel_from(base: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(base).ok()?;
    let s = rel.to_string_lossy().replace('\\', "/");
    (!s.is_empty()).then_some(s)
}

async fn fetch(
    client: &reqwest::Client,
    source: &Source,
    fetch_cdn: bool,
) -> Result<Vec<u8>, String> {
    match source {
        Source::Inline => Err("inline".into()),
        Source::Local(p) => std::fs::read(p).map_err(|e| e.to_string()),
        Source::Remote(u) => {
            if !fetch_cdn {
                return Err("CDN fetch disabled".into());
            }
            let resp = client.get(u).send().await.map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("HTTP {}", resp.status().as_u16()));
            }
            resp.bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|e| e.to_string())
        }
    }
}

fn kind_from_url(url: &str) -> Kind {
    let clean = url.split(['?', '#']).next().unwrap_or(url).to_lowercase();
    if [".woff2", ".woff", ".ttf", ".otf", ".eot"]
        .iter()
        .any(|e| clean.ends_with(e))
    {
        Kind::Font
    } else if clean.ends_with(".css") {
        Kind::Css
    } else if clean.ends_with(".js") || clean.ends_with(".mjs") {
        Kind::Js
    } else {
        Kind::Img
    }
}

fn ext_of(url: &str, kind: Kind) -> String {
    let clean = url.split(['?', '#']).next().unwrap_or(url);
    let ext = clean
        .rsplit('/')
        .next()
        .and_then(|f| f.rsplit_once('.'))
        .map(|(_, e)| e);
    match ext {
        Some(e) if e.len() <= 5 && e.chars().all(|c| c.is_ascii_alphanumeric()) => e.to_lowercase(),
        _ => match kind {
            Kind::Css => "css".into(),
            Kind::Js => "js".into(),
            Kind::Img => "img".into(),
            Kind::Font => "bin".into(),
            Kind::Other => "bin".into(),
        },
    }
}

fn asset_path(kind: Kind, url: &str, bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let hash = hasher.finalize();
    let short: String = hash.iter().take(5).map(|b| format!("{b:02x}")).collect();
    format!("assets/{}/{}.{}", kind.dir(), short, ext_of(url, kind))
}

/// Rewrite `url(...)` references inside a CSS string using `map` (original → asset path).
///
/// Walks by `find` rather than by byte index: CSS carries arbitrary UTF-8 (a `図` in a
/// comment, a `content:"…"`), and both slicing a `&str` at a byte offset and widening a
/// lone byte to `char` are wrong on anything non-ASCII.
fn rewrite_css(css: &str, map: &BTreeMap<String, String>) -> String {
    let mut out = String::with_capacity(css.len());
    let mut rest = css;
    while let Some(pos) = rest.find("url(") {
        out.push_str(&rest[..pos]);
        rest = &rest[pos..];
        let after = &rest[4..];
        let Some(close) = after.find(')') else {
            // No closing paren anywhere after this, so nothing further can match either;
            // the trailing push copies this `url(` and everything past it verbatim.
            break;
        };
        let trimmed = after[..close].trim().trim_matches(['"', '\'']);
        match map.get(trimmed) {
            Some(asset) => {
                out.push_str("url(");
                out.push_str(asset);
                out.push(')');
            }
            None => out.push_str(&rest[..4 + close + 1]),
        }
        rest = &after[close + 1..];
    }
    out.push_str(rest);
    out
}

fn collect_css_urls(css: &str) -> Vec<String> {
    let mut urls = Vec::new();
    let mut rest = css;
    while let Some(pos) = rest.find("url(") {
        rest = &rest[pos + 4..];
        if let Some(close) = rest.find(')') {
            let inner = rest[..close].trim().trim_matches(['"', '\'']);
            if !inner.is_empty() && !inner.starts_with("data:") {
                urls.push(inner.to_string());
            }
            rest = &rest[close + 1..];
        } else {
            break;
        }
    }
    urls
}

fn first_srcset_url(srcset: &str) -> Vec<String> {
    srcset
        .split(',')
        .filter_map(|part| part.split_whitespace().next())
        .map(str::to_string)
        .collect()
}

// ---- Script-referenced assets -------------------------------------------------
//
// Pages that build their DOM in JavaScript (`img.src = "cat.png"`, or a template
// literal like `velq-${k}-1024.png`) have no static <img> for the passes above to
// see. We can't rewrite JS safely, so these are handled differently: scan every
// script's text for path-looking tokens, expand `${…}` holes into `*` globs, and
// collect whatever actually exists on disk **at its original relative path** — the
// runtime-computed reference then resolves inside the package unchanged. Existence
// on disk is the real filter, so a stray `foo.png` in a comment costs nothing.

/// Extensions worth collecting when a script mentions them.
const SCRIPT_ASSET_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "ico", "css", "js", "mjs", "json", "woff",
    "woff2", "ttf", "otf", "mp3", "mp4", "webm", "wasm", "pdf", "txt",
];

/// How many files one `${…}` glob may pull in before we call it a mistake.
const GLOB_CAP: usize = 300;

fn is_token_char(c: char) -> bool {
    c.is_alphanumeric() || matches!(c, '_' | '-' | '.' | '/' | '$' | '{' | '}')
}

/// Maximal path-looking tokens in script text. `src="velq-${k}-1024.png"` yields
/// `velq-${k}-1024.png` — the quotes around it break the run, so this works even
/// deep inside a multiline template literal of HTML.
fn scan_script_tokens(script: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut cur = String::new();
    for c in script.chars() {
        if is_token_char(c) {
            cur.push(c);
        } else if !cur.is_empty() {
            tokens.push(std::mem::take(&mut cur));
        }
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    tokens
}

/// Does this token end in a collectible extension and stay safely relative?
fn looks_like_asset(s: &str) -> bool {
    if s.is_empty() || s.len() > 260 || s.starts_with('/') {
        return false;
    }
    if s.split('/').any(|seg| seg == ".." || seg.is_empty()) {
        return false;
    }
    match s.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() && !stem.ends_with('/') => SCRIPT_ASSET_EXTS
            .iter()
            .any(|e| ext.eq_ignore_ascii_case(e)),
        _ => false,
    }
}

/// Like `looks_like_asset` but permits `..` segments. Script refs may point up the
/// tree (`../../brand/logo.svg`); safety is enforced later by placing every asset
/// relative to the package root and dropping anything that escapes it (`rel_from`),
/// so a `..` that leaves the bundle is never collected. Absolute paths still refused.
fn token_is_assetish(s: &str) -> bool {
    if s.is_empty() || s.len() > 260 || s.starts_with('/') {
        return false;
    }
    match s.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() && !stem.ends_with('/') => SCRIPT_ASSET_EXTS
            .iter()
            .any(|e| ext.eq_ignore_ascii_case(e)),
        _ => false,
    }
}

/// `velq-${k}-1024.png` → `velq-*-1024.png`; None if the token has no `${…}` hole
/// (or unbalanced braces).
fn template_to_glob(token: &str) -> Option<String> {
    if !token.contains("${") {
        return None;
    }
    let mut out = String::new();
    let mut rest = token;
    while let Some(open) = rest.find("${") {
        out.push_str(&rest[..open]);
        out.push('*');
        let after = &rest[open + 2..];
        let close = after.find('}')?;
        rest = &after[close + 1..];
    }
    if rest.contains('{') || rest.contains('}') || out.contains('{') {
        return None;
    }
    out.push_str(rest);
    Some(out)
}

/// Segment-level `*` wildcard match (no `**`, no `?`).
fn seg_match(pat: &str, name: &str) -> bool {
    let parts: Vec<&str> = pat.split('*').collect();
    if parts.len() == 1 {
        return pat == name;
    }
    let mut pos = 0;
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        if i == 0 {
            if !name.starts_with(part) {
                return false;
            }
            pos = part.len();
        } else if i == parts.len() - 1 {
            return name.len() >= pos + part.len() && name.ends_with(part);
        } else {
            match name[pos..].find(part) {
                Some(k) => pos += k + part.len(),
                None => return false,
            }
        }
    }
    true
}

/// Files under `base` matching a relative glob like `img/velq-*-1024.png`.
/// Returns (relative path with `/`, absolute path); results are capped by callers.
fn glob_collect(base: &Path, pattern: &str) -> Vec<(String, PathBuf)> {
    let segs: Vec<&str> = pattern.split('/').collect();
    let mut hits = Vec::new();
    fn walk(dir: &Path, segs: &[&str], rel: &str, hits: &mut Vec<(String, PathBuf)>) {
        let Some((seg, rest)) = segs.split_first() else {
            return;
        };
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if !seg_match(seg, &name) {
                continue;
            }
            let child_rel = if rel.is_empty() {
                name.to_string()
            } else {
                format!("{rel}/{name}")
            };
            let p = entry.path();
            if rest.is_empty() {
                if p.is_file() {
                    hits.push((child_rel, p));
                }
            } else if p.is_dir() {
                walk(&p, rest, &child_rel, hits);
            }
        }
    }
    walk(base, &segs, "", &mut hits);
    hits.sort();
    hits
}

/// Bundle `html` (with assets resolved relative to `base_dir`) into an offline package.
/// Network fetches are async; the caller drives them on its own runtime.
pub async fn bundle(html: &str, base_dir: &Path, fetch_cdn: bool) -> BundleResult {
    // One client (and connection pool) for every fetch in this bundle.
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .user_agent("Velq/0.1")
        .build()
        .unwrap_or_default();

    // Pass 1 — collect references (and every inline script's text, for the
    // script-referenced asset scan below).
    let refs: RefCell<Vec<(String, Kind)>> = RefCell::new(Vec::new());
    let style_buf = RefCell::new(String::new());
    let scripts_text = RefCell::new(String::new());
    let collect_settings = RewriteStrSettings::new()
        .append_element_content_handler(element!("link[href]", |el| {
            if let Some(h) = el.get_attribute("href") {
                let rel = el
                    .get_attribute("rel")
                    .unwrap_or_default()
                    .to_ascii_lowercase();
                // Connection hints / navigation preloads point at an origin or a page,
                // not a packageable file — fetching them just 404s (and a `preconnect`
                // to a font CDN would even be counted as a "failed" asset). Skip them.
                let is_hint = rel.split_whitespace().any(|t| {
                    matches!(
                        t,
                        "preconnect" | "dns-prefetch" | "prefetch" | "prerender" | "modulepreload"
                    )
                });
                if !is_hint {
                    let kind = if rel.contains("stylesheet") {
                        Kind::Css
                    } else {
                        Kind::Other
                    };
                    refs.borrow_mut().push((h, kind));
                }
            }
            Ok(())
        }))
        .append_element_content_handler(element!("script[src]", |el| {
            if let Some(s) = el.get_attribute("src") {
                refs.borrow_mut().push((s, Kind::Js));
            }
            Ok(())
        }))
        .append_element_content_handler(element!("img[src]", |el| {
            if let Some(s) = el.get_attribute("src") {
                refs.borrow_mut().push((s, Kind::Img));
            }
            Ok(())
        }))
        .append_element_content_handler(element!("img[srcset], source[srcset]", |el| {
            if let Some(s) = el.get_attribute("srcset") {
                for u in first_srcset_url(&s) {
                    refs.borrow_mut().push((u, Kind::Img));
                }
            }
            Ok(())
        }))
        .append_element_content_handler(text!("style", |t| {
            style_buf.borrow_mut().push_str(t.as_str());
            if t.last_in_text_node() {
                for u in collect_css_urls(&style_buf.borrow()) {
                    let k = kind_from_url(&u);
                    refs.borrow_mut().push((u, k));
                }
                style_buf.borrow_mut().clear();
            }
            Ok(())
        }))
        .append_element_content_handler(text!("script", |t| {
            scripts_text.borrow_mut().push_str(t.as_str());
            if t.last_in_text_node() {
                scripts_text.borrow_mut().push('\n');
            }
            Ok(())
        }));
    let _ = rewrite_str(html, collect_settings);

    // The document's own directory (absolute, normalized). Its position under the
    // common root becomes `index.html`'s home, so the document's `../` refs resolve
    // there exactly as they did on disk.
    let base_root = abs_norm(base_dir);

    // Remote (CDN) refs are still localized to `assets/<hash>` and rewritten. Local
    // refs keep their on-disk relative structure and are NOT rewritten — the whole
    // layout is mirrored into the package, so authored links resolve unchanged.
    let mut remote_map: BTreeMap<String, String> = BTreeMap::new();
    let mut assets: Vec<Asset> = Vec::new();
    let mut report = BundleReport::default();
    let mut seen = std::collections::BTreeSet::new();

    // Local refs are deferred until the common root is known. CSS seeds the queue so
    // its own `url()` targets get collected too.
    let mut local_paths: Vec<PathBuf> = vec![base_root.clone()];
    let mut local_queue: Vec<(PathBuf, Kind)> = Vec::new();

    for (url, kind) in refs.into_inner() {
        if !seen.insert(url.clone()) {
            continue;
        }
        match classify(&url, base_dir) {
            Source::Inline => {}
            Source::Local(p) => {
                let np = normalize(&p);
                local_paths.push(np.clone());
                // Local JS may build the DOM at runtime — read its text now so its
                // `img.src = "…"` targets join the root calculation below and get
                // collected (a `../` in one must widen the root to include it).
                if kind == Kind::Js {
                    if let Ok(bytes) = std::fs::read(&np) {
                        scripts_text
                            .borrow_mut()
                            .push_str(&String::from_utf8_lossy(&bytes));
                        scripts_text.borrow_mut().push('\n');
                    }
                }
                local_queue.push((np, kind));
            }
            Source::Remote(u) => match fetch(&client, &Source::Remote(u), fetch_cdn).await {
                Ok(mut bytes) => {
                    // Remote CSS: fetch its (remote) url() targets CONCURRENTLY, then
                    // rewrite. Google Fonts ships one @font-face per weight and a full
                    // Noto Sans JP ttf is ~5MB each — fetched serially the packager
                    // looks hung, so we join them into one round-trip's worth of wait.
                    if kind == Kind::Css {
                        let css = String::from_utf8_lossy(&bytes).into_owned();
                        let targets: Vec<String> = collect_css_urls(&css)
                            .into_iter()
                            .filter(|i| matches!(classify(i, base_dir), Source::Remote(_)))
                            .filter(|i| seen.insert(i.clone()))
                            .collect();
                        let fetched = futures::future::join_all(targets.into_iter().map(|inner| {
                            let client = &client;
                            async move {
                                let src = classify(&inner, base_dir);
                                (inner, fetch(client, &src, fetch_cdn).await)
                            }
                        }))
                        .await;
                        let mut css_map: BTreeMap<String, String> = BTreeMap::new();
                        for (inner, result) in fetched {
                            match result {
                                Ok(ib) => {
                                    let ip = asset_path(kind_from_url(&inner), &inner, &ib);
                                    report.bytes += ib.len() as u64;
                                    report.collected += 1;
                                    css_map.insert(inner.clone(), relative_to_css(&ip));
                                    assets.push(Asset {
                                        path: ip,
                                        bytes: ib,
                                    });
                                }
                                Err(reason) => report.failed.push(FailedUrl { url: inner, reason }),
                            }
                        }
                        bytes = rewrite_css(&css, &css_map).into_bytes();
                    }
                    let p = asset_path(kind, &url, &bytes);
                    report.bytes += bytes.len() as u64;
                    report.collected += 1;
                    remote_map.insert(url.clone(), p.clone());
                    assets.push(Asset { path: p, bytes });
                }
                Err(reason) => report.failed.push(FailedUrl { url, reason }),
            },
        }
    }

    // The package root: the deepest directory containing the document and every STATIC
    // local ref. A static `../` — authored, or present in the post-script DOM the
    // frontend hands us — is a trusted part of the document and widens the root so it
    // resolves unchanged in the viewer. A script *token* the scan merely guessed from
    // JS text does NOT widen the root; a guessed `../` that leaves the tree is refused
    // below (the escape guard), so scanning can't be tricked into exfiltrating files.
    let root = common_ancestor(&local_paths).unwrap_or_else(|| base_root.clone());
    let index_path = match rel_from(&root, &base_root) {
        Some(dir) => format!("{dir}/index.html"),
        None => "index.html".to_string(),
    };

    // Place local assets at their root-relative paths (no rewrite). Local CSS also
    // seeds its own `url()` targets — they keep their relative form, resolved against
    // the CSS's preserved location.
    let mut placed: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    while let Some((np, kind)) = local_queue.pop() {
        let Some(rel) = rel_from(&root, &np) else {
            report.failed.push(FailedUrl {
                url: np.to_string_lossy().into_owned(),
                reason: "reference escapes the package root".into(),
            });
            continue;
        };
        if rel == index_path || !placed.insert(rel.clone()) {
            continue;
        }
        let bytes = match std::fs::read(&np) {
            Ok(b) => b,
            Err(e) => {
                report.failed.push(FailedUrl {
                    url: rel,
                    reason: e.to_string(),
                });
                continue;
            }
        };
        if kind == Kind::Css {
            let css = String::from_utf8_lossy(&bytes);
            let css_dir = np
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| root.clone());
            for inner in collect_css_urls(&css) {
                if let Source::Local(ip) = classify(&inner, &css_dir) {
                    let inp = normalize(&ip);
                    if rel_from(&root, &inp).is_some() {
                        local_queue.push((inp, kind_from_url(&inner)));
                    }
                }
            }
        }
        report.bytes += bytes.len() as u64;
        report.collected += 1;
        assets.push(Asset { path: rel, bytes });
    }

    // Script-referenced assets: tokens like `cat.png`, `velq-${k}-1024.png`, or a
    // `../` path a JS `img.src` emits. Placed at their root-relative paths so a runtime
    // ref, resolved against index.html's location, finds them. A guessed `..` that
    // escapes the root is dropped (it never widened the root) — the escape guard.
    let scripts = scripts_text.into_inner();
    for token in scan_script_tokens(&scripts) {
        let abs_matches: Vec<PathBuf> = match template_to_glob(&token) {
            Some(glob) if looks_like_asset(&glob) => {
                let hits = glob_collect(base_dir, &glob);
                if hits.len() > GLOB_CAP {
                    report.failed.push(FailedUrl {
                        url: token.clone(),
                        reason: format!("matched {} files (cap {GLOB_CAP})", hits.len()),
                    });
                    continue;
                }
                hits.into_iter().map(|(_, abs)| abs).collect()
            }
            Some(_) => continue,
            None if token_is_assetish(&token) => {
                let p = normalize(&base_dir.join(&token));
                if p.is_file() {
                    vec![p]
                } else {
                    Vec::new()
                }
            }
            None => continue,
        };
        for np in abs_matches {
            let Some(rel) = rel_from(&root, &np) else {
                continue; // escapes the package root — never collect it
            };
            if rel == index_path || rel.ends_with(".velq") || !placed.insert(rel.clone()) {
                continue;
            }
            if let Ok(bytes) = std::fs::read(&np) {
                report.bytes += bytes.len() as u64;
                report.collected += 1;
                assets.push(Asset { path: rel, bytes });
            }
        }
    }

    // Pass 2 — rewrite ONLY remote refs to their `assets/<hash>` paths. Local refs
    // are left exactly as authored (their targets are packaged at the same relative
    // location, so they resolve unchanged). With no remotes, skip the pass entirely.
    let index_html = if remote_map.is_empty() {
        html.to_string()
    } else {
        let map = &remote_map;
        let style_buf2 = RefCell::new(String::new());
        let rewrite_settings = RewriteStrSettings::new()
            .append_element_content_handler(rewrite_attr("link[href]", "href", map))
            .append_element_content_handler(rewrite_attr("script[src]", "src", map))
            .append_element_content_handler(rewrite_attr("img[src]", "src", map))
            .append_element_content_handler(element!("img[srcset], source[srcset]", |el| {
                if let Some(s) = el.get_attribute("srcset") {
                    let rewritten: Vec<String> = s
                        .split(',')
                        .map(|part| {
                            let mut it = part.split_whitespace();
                            match (it.next(), it.next()) {
                                (Some(u), d) => {
                                    let nu = map.get(u).map(String::as_str).unwrap_or(u);
                                    match d {
                                        Some(desc) => format!("{nu} {desc}"),
                                        None => nu.to_string(),
                                    }
                                }
                                _ => part.trim().to_string(),
                            }
                        })
                        .collect();
                    el.set_attribute("srcset", &rewritten.join(", "))?;
                }
                Ok(())
            }))
            .append_element_content_handler(text!("style", |t| {
                style_buf2.borrow_mut().push_str(t.as_str());
                if t.last_in_text_node() {
                    let rewritten = rewrite_css(&style_buf2.borrow(), map);
                    t.replace(&rewritten, ContentType::Html);
                    style_buf2.borrow_mut().clear();
                } else {
                    t.remove();
                }
                Ok(())
            }));
        rewrite_str(html, rewrite_settings).unwrap_or_else(|_| html.to_string())
    };

    BundleResult {
        index_html,
        index_path,
        assets,
        report,
    }
}

/// CSS assets live in assets/css/; their url() targets (assets/fonts/…) need a path
/// relative to that, i.e. `../fonts/…`.
fn relative_to_css(asset_path: &str) -> String {
    asset_path
        .strip_prefix("assets/")
        .map(|r| format!("../{r}"))
        .unwrap_or_else(|| asset_path.to_string())
}

fn rewrite_attr<'a>(
    selector: &'a str,
    attr: &'a str,
    map: &'a BTreeMap<String, String>,
) -> (
    std::borrow::Cow<'a, lol_html::Selector>,
    lol_html::ElementContentHandlers<'a>,
) {
    let attr = attr.to_string();
    element!(selector, move |el| {
        if let Some(v) = el.get_attribute(&attr) {
            if let Some(p) = map.get(&v) {
                el.set_attribute(&attr, p)?;
            }
        }
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU64, Ordering};

    use super::*;

    /// Monotonic, so two tests entering tmpdir() within the same clock tick
    /// (SystemTime is coarse on macOS) can never collide on a directory name —
    /// otherwise one test's cleanup wipes a dir another is still bundling.
    static TMP_SEQ: AtomicU64 = AtomicU64::new(0);

    fn tmpdir() -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!(
            "velq-bundler-{}-{}-{}",
            std::process::id(),
            TMP_SEQ.fetch_add(1, Ordering::Relaxed),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    /// A `図` in a CSS comment used to land `rewrite_css`'s cursor mid-character and
    /// panic the whole packaging run — on a page with no `url()` to rewrite at all.
    #[test]
    fn rewrite_css_keeps_non_ascii_intact() {
        let mut map = BTreeMap::new();
        map.insert("bg.png".to_string(), "assets/img/ab.png".to_string());

        let css = "/* Phase 図 */\n.a { content:\"日本語\"; background:url(bg.png) }\n/* 終 */";
        let out = rewrite_css(css, &map);

        assert!(out.contains("/* Phase 図 */"), "{out}");
        assert!(out.contains("content:\"日本語\""), "{out}");
        assert!(out.contains("/* 終 */"), "{out}");
        assert!(out.contains("url(assets/img/ab.png)"), "{out}");
    }

    /// Non-ASCII with nothing to rewrite must come back byte-for-byte unchanged.
    #[test]
    fn rewrite_css_without_urls_is_identity() {
        let css = "/* Phase 図 */\n.diagram { border:1px solid #ccc; }\n/* 図表 ✓ é */";
        assert_eq!(rewrite_css(css, &BTreeMap::new()), css);
    }

    /// An unterminated `url(` must not duplicate or drop the surrounding text.
    #[test]
    fn rewrite_css_unclosed_url_is_preserved() {
        let css = "/* 図 */ .a { background:url(broken.png";
        assert_eq!(rewrite_css(css, &BTreeMap::new()), css);
    }

    #[tokio::test]
    async fn collects_and_mirrors_local_assets_offline() {
        let dir = tmpdir();
        std::fs::create_dir_all(dir.join("css")).unwrap();
        std::fs::write(
            dir.join("css/site.css"),
            "body{background:url('../img/bg.png')}",
        )
        .unwrap();
        std::fs::create_dir_all(dir.join("img")).unwrap();
        std::fs::write(dir.join("img/bg.png"), b"\x89PNG fake").unwrap();
        std::fs::write(dir.join("app.js"), b"console.log(1)").unwrap();
        let html = r#"<html><head><link rel="stylesheet" href="css/site.css"></head>
            <body><img src="img/bg.png"><script src="app.js"></script></body></html>"#;

        let res = bundle(html, &dir, false).await;

        // css, js, png (referenced twice but deduped) collected; nothing failed.
        assert!(res.report.failed.is_empty(), "{:?}", res.report.failed);
        // Everything sits below the doc, so the root IS the doc dir: index at root,
        // assets keep their on-disk relative paths.
        assert_eq!(res.index_path, "index.html");
        assert!(res.assets.iter().any(|a| a.path == "css/site.css"));
        assert!(res.assets.iter().any(|a| a.path == "img/bg.png"));
        assert!(res.assets.iter().any(|a| a.path == "app.js"));
        // Local refs are NOT rewritten — they resolve as authored against the
        // mirrored layout, so nothing gets moved under `assets/`.
        assert!(
            res.index_html.contains(r#"href="css/site.css""#),
            "{}",
            res.index_html
        );
        assert!(res.index_html.contains(r#"src="img/bg.png""#));
        assert!(!res.index_html.contains("assets/"));
        // The CSS keeps its own relative url(); its target is packaged too.
        let css = res
            .assets
            .iter()
            .find(|a| a.path == "css/site.css")
            .unwrap();
        let css_text = String::from_utf8_lossy(&css.bytes);
        assert!(css_text.contains("url('../img/bg.png')"), "{css_text}");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn bundle_then_pack_produces_a_valid_velq() {
        let dir = tmpdir();
        std::fs::write(dir.join("style.css"), "body{margin:0}").unwrap();
        let html =
            r#"<html><head><link rel="stylesheet" href="style.css"></head><body>Hi</body></html>"#;
        let res = bundle(html, &dir, false).await;

        let out = dir.join("doc.velq");
        let manifest = velq_core::Manifest {
            title: "T".into(),
            index_path: res.index_path.clone(),
            ..Default::default()
        };
        velq_core::pack(&out, &manifest, res.index_html.as_bytes(), &res.assets).unwrap();

        velq_core::validate(&out).unwrap();
        assert_eq!(velq_core::read_manifest(&out).unwrap().title, "T");
        // The bundled CSS sits at its original path; the index references it unchanged.
        assert!(res.assets.iter().any(|a| a.path == "style.css"));
        let idx =
            String::from_utf8(velq_core::read_file_bytes(&out, &res.index_path).unwrap()).unwrap();
        assert!(idx.contains("style.css"));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn missing_local_asset_is_reported_not_fatal() {
        let dir = tmpdir();
        let html = r#"<html><body><img src="nope.png"></body></html>"#;
        let res = bundle(html, &dir, false).await;
        assert_eq!(res.report.failed.len(), 1);
        assert!(res.index_html.contains("nope.png")); // left as-is, not broken
        std::fs::remove_dir_all(&dir).ok();
    }

    /// The icon-gallery case: `<img>` tags are built by an inline script from a
    /// template literal, so no static reference exists. The matching files must
    /// still land in the package, at their ORIGINAL relative paths.
    #[tokio::test]
    async fn template_literal_images_are_collected_at_original_paths() {
        let dir = tmpdir();
        for k in ["a", "b", "c"] {
            std::fs::write(dir.join(format!("velq-{k}-1024.png")), b"png").unwrap();
        }
        std::fs::write(dir.join("velq-a-1024.velq"), b"decoy").unwrap();
        let html = r#"<html><body><div id="g"></div><script>
            const card = (k) => `<div><img src="velq-${k}-1024.png" width="128"/></div>`;
            for (const k of ["a","b","c"]) g.insertAdjacentHTML("beforeend", card(k));
        </script></body></html>"#;

        let res = bundle(html, &dir, false).await;

        for k in ["a", "b", "c"] {
            let want = format!("velq-{k}-1024.png");
            assert!(
                res.assets.iter().any(|a| a.path == want),
                "missing {want}: {:?}",
                res.assets.iter().map(|a| &a.path).collect::<Vec<_>>()
            );
        }
        // The template stays untouched — runtime JS resolves the same names.
        assert!(res.index_html.contains("velq-${k}-1024.png"));
        assert!(res.assets.iter().all(|a| !a.path.ends_with(".velq")));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn plain_string_refs_in_inline_and_external_js_are_collected() {
        let dir = tmpdir();
        std::fs::create_dir_all(dir.join("photos")).unwrap();
        std::fs::write(dir.join("photos/cat.png"), b"cat").unwrap();
        std::fs::write(dir.join("sprite.webp"), b"sprite").unwrap();
        std::fs::write(
            dir.join("app.js"),
            br#"el.style.background = "url(sprite.webp)";"#,
        )
        .unwrap();
        let html = r#"<html><body><script src="app.js"></script>
            <script>img.src = "photos/cat.png";</script></body></html>"#;

        let res = bundle(html, &dir, false).await;

        assert!(res.assets.iter().any(|a| a.path == "photos/cat.png"));
        assert!(res.assets.iter().any(|a| a.path == "sprite.webp"));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn script_refs_cannot_escape_the_base_dir() {
        let dir = tmpdir();
        let outside = dir.parent().unwrap().join("velq-escape-test.png");
        std::fs::write(&outside, b"secret").unwrap();
        let html = r#"<html><body><script>x = "../velq-escape-test.png";</script></body></html>"#;
        let res = bundle(html, &dir, false).await;
        assert!(
            res.assets.is_empty(),
            "{:?}",
            res.assets.iter().map(|a| &a.path).collect::<Vec<_>>()
        );
        std::fs::remove_file(&outside).ok();
        std::fs::remove_dir_all(&dir).ok();
    }

    /// The heart of the mirror layout: a document that reaches an asset via `../`.
    /// index.html must land at its original depth and the asset above it, so the
    /// `../` link resolves unchanged in the viewer — never rewritten, never flattened.
    #[tokio::test]
    async fn dotdot_refs_mirror_the_source_layout() {
        let dir = tmpdir();
        std::fs::create_dir_all(dir.join("brand")).unwrap();
        std::fs::write(dir.join("brand/logo.svg"), b"<svg/>").unwrap();
        let doc_dir = dir.join("docs/page");
        std::fs::create_dir_all(&doc_dir).unwrap();
        let html = r#"<html><body><img src="../../brand/logo.svg"></body></html>"#;

        let res = bundle(html, &doc_dir, false).await;

        assert!(res.report.failed.is_empty(), "{:?}", res.report.failed);
        // The doc dir is two levels below the common root, so the HTML lands deep and
        // the asset lands where `../../brand/logo.svg` resolves.
        assert_eq!(res.index_path, "docs/page/index.html");
        assert!(
            res.assets.iter().any(|a| a.path == "brand/logo.svg"),
            "{:?}",
            res.assets.iter().map(|a| &a.path).collect::<Vec<_>>()
        );
        // The `../` reference is left exactly as written.
        assert!(res.index_html.contains(r#"src="../../brand/logo.svg""#));

        std::fs::remove_dir_all(&dir).ok();
    }

    /// The real-world case that started this work: an `<img>` reaching an asset via
    /// `../`, as it appears in the POST-SCRIPT DOM. The frontend runs the page, then
    /// hands the rendered HTML to the bundler — so a JS-built `<img>` is static markup
    /// by the time we see it. The static `../` widens the root and the asset mirrors.
    #[tokio::test]
    async fn dotdot_image_from_rendered_dom_is_mirrored() {
        let dir = tmpdir();
        std::fs::create_dir_all(dir.join("brand")).unwrap();
        std::fs::write(dir.join("brand/mark.svg"), b"<svg/>").unwrap();
        let doc_dir = dir.join("docs/mock");
        std::fs::create_dir_all(&doc_dir).unwrap();
        // As serialized after scripts ran: the <img> is now static markup.
        let html =
            r#"<html><body><div id="r"><img src="../../brand/mark.svg"></div></body></html>"#;

        let res = bundle(html, &doc_dir, false).await;

        assert_eq!(res.index_path, "docs/mock/index.html");
        assert!(
            res.assets.iter().any(|a| a.path == "brand/mark.svg"),
            "{:?}",
            res.assets.iter().map(|a| &a.path).collect::<Vec<_>>()
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    /// `<link rel="preconnect">` / `dns-prefetch` point at an origin, not a file.
    /// They must never be fetched (a `preconnect` to a CDN would 404 and show up as a
    /// spurious "failed" asset the user can't act on).
    #[tokio::test]
    async fn connection_hints_are_not_fetched() {
        let dir = tmpdir();
        let html = r#"<html><head>
            <link rel="preconnect" href="https://fonts.gstatic.com">
            <link rel="dns-prefetch" href="https://cdn.example.com">
            <link rel="stylesheet" href="local.css">
        </head><body>hi</body></html>"#;
        std::fs::write(dir.join("local.css"), "body{margin:0}").unwrap();

        let res = bundle(html, &dir, true).await; // online, yet the hints are skipped

        // Only the real stylesheet is handled; the two hints never became failures.
        assert!(res.report.failed.is_empty(), "{:?}", res.report.failed);
        assert!(res.assets.iter().any(|a| a.path == "local.css"));
        assert_eq!(res.assets.len(), 1);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn template_to_glob_and_seg_match() {
        assert_eq!(
            template_to_glob("velq-${k}-1024.png").as_deref(),
            Some("velq-*-1024.png")
        );
        assert_eq!(template_to_glob("plain.png"), None);
        assert!(seg_match("velq-*-1024.png", "velq-a-duo-1024.png"));
        assert!(!seg_match("velq-*-1024.png", "velq-a-512.png"));
        assert!(looks_like_asset("img/x.png"));
        assert!(!looks_like_asset("../x.png"));
        assert!(!looks_like_asset("/abs/x.png"));
        assert!(!looks_like_asset("x.exe"));
    }
}
