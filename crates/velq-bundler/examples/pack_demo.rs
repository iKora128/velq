//! Proof: trace an HTML file's links and show what gets collected + rewritten.
//! `cargo run -p velq-bundler --example pack_demo <file.html>`
use std::path::Path;
use velq_bundler::bundle;

#[tokio::main]
async fn main() {
    let path = std::env::args().nth(1).expect("usage: pack_demo <html>");
    let p = Path::new(&path);
    let html = std::fs::read_to_string(p).expect("read html");
    let base = p.parent().unwrap_or_else(|| Path::new("."));

    // fetch_cdn = false → only local files, so this runs fully offline.
    let res = bundle(&html, base, false).await;

    println!(
        "collected {} assets ({} bytes); {} failed",
        res.report.collected,
        res.report.bytes,
        res.report.failed.len()
    );
    for a in &res.assets {
        println!("  assets/{}  ({} bytes)", a.path, a.bytes.len());
    }
    for f in &res.report.failed {
        println!("  FAILED {} — {}", f.url, f.reason);
    }
    println!("--- rewritten references in index.html ---");
    for line in res.index_html.lines() {
        let t = line.trim();
        if t.contains("<img") || t.contains("<script") || t.contains("<link") {
            println!("  {t}");
        }
    }
}
