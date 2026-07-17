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

    // Offline by default (local files only); set VELQ_ONLINE=1 to also fetch CDN deps.
    let fetch_cdn = std::env::var("VELQ_ONLINE").is_ok();
    let res = bundle(&html, base, fetch_cdn).await;

    println!("index_path: {}", res.index_path);
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

    // Optional second arg: write a real .velq so its ZIP layout can be inspected.
    if let Some(out) = std::env::args().nth(2) {
        let manifest = velq_core::Manifest {
            index_path: res.index_path.clone(),
            ..Default::default()
        };
        velq_core::pack(
            Path::new(&out),
            &manifest,
            res.index_html.as_bytes(),
            &res.assets,
        )
        .expect("pack .velq");
        println!("wrote {out}");
    }
}
