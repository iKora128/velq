//! Markdown → HTML rendering via comrak. **Default-safe**: raw HTML/JS is escaped
//! (`unsafe_ = false`) and `tagfilter` is on, so untrusted Markdown can't inject
//! script. Source positions (`data-sourcepos`) are emitted for line-anchor scroll
//! sync (plan §8.4). The preview iframe is additionally sandboxed without scripts.

use comrak::{markdown_to_html, Options};

/// Render Markdown to sanitized HTML with full GFM and source positions.
pub fn render(md: &str) -> String {
    let mut o = Options::default();
    o.extension.strikethrough = true;
    o.extension.tagfilter = true;
    o.extension.table = true;
    o.extension.autolink = true;
    o.extension.tasklist = true;
    o.extension.superscript = true;
    o.extension.footnotes = true;
    o.extension.description_lists = true;
    o.extension.multiline_block_quotes = true;
    o.parse.smart = true;
    o.render.r#unsafe = false; // escape raw HTML/JS — default safe (plan §7)
    o.render.sourcepos = true; // data-sourcepos for line-anchor scroll sync
    o.render.github_pre_lang = true;
    markdown_to_html(md, &o)
}

#[tauri::command]
pub fn render_markdown(md: String) -> String {
    render(&md)
}

#[cfg(test)]
mod tests {
    use super::render;

    #[test]
    fn renders_gfm_table_and_tasklist() {
        let html = render("| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done");
        assert!(html.contains("<table"));
        assert!(html.contains("type=\"checkbox\""));
    }

    #[test]
    fn neutralizes_raw_html_by_default() {
        // Raw HTML blocks are omitted, inline raw HTML is escaped — either way no
        // executable tag survives (plan §7: comrak default-safe).
        let block = render("<script>alert(1)</script>");
        assert!(!block.to_lowercase().contains("<script"));
        let inline = render("click <button onclick=\"x()\">go</button> now");
        assert!(!inline.to_lowercase().contains("<button"));
    }

    #[test]
    fn emits_source_positions() {
        let html = render("# Heading\n\nparagraph");
        assert!(html.contains("data-sourcepos"));
    }
}
