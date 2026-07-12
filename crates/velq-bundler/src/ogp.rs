//! Open Graph (`og:*`) link previews. A link in a doc becomes a rich card: fetch
//! the target page's metadata (title / description / image), render a compact card,
//! and — bundled into the `.velq` at package time — the viewer shows it with no
//! network. Parsing and card rendering are pure (unit-tested); only `fetch_ogp`
//! touches the network.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ogp {
    pub url: String,
    pub title: String,
    pub description: String,
    pub image: String,
    pub site_name: String,
}

/// Extract Open Graph metadata from a page's HTML, falling back to `<title>` and
/// the standard `<meta name="description">`.
pub fn parse_ogp(html: &str, url: &str) -> Ogp {
    let mut o = Ogp {
        url: url.to_string(),
        ..Default::default()
    };
    let mut i = 0;
    while let Some(start) = html[i..].find("<meta").map(|p| i + p) {
        let end = html[start..].find('>').map_or(html.len(), |p| start + p);
        let tag = &html[start..end];
        i = end + 1;
        let key = attr(tag, "property").or_else(|| attr(tag, "name"));
        let content = attr(tag, "content");
        if let (Some(k), Some(c)) = (key, content) {
            match k.to_ascii_lowercase().as_str() {
                "og:title" => o.title = c,
                "og:description" => o.description = c,
                "description" if o.description.is_empty() => o.description = c,
                "og:image" | "og:image:url" | "og:image:secure_url" if o.image.is_empty() => {
                    o.image = c;
                }
                "og:site_name" => o.site_name = c,
                _ => {}
            }
        }
    }
    if o.title.is_empty() {
        if let Some(t) = between(html, "<title>", "</title>") {
            o.title = t.trim().to_string();
        }
    }
    o.title = decode_basic(&o.title);
    o.description = decode_basic(&o.description);
    o
}

/// The value of `name="..."` (single- or double-quoted) inside a tag string.
fn attr(tag: &str, name: &str) -> Option<String> {
    let lower = tag.to_ascii_lowercase();
    let at = lower.find(&format!("{name}="))? + name.len() + 1;
    let rest = &tag[at..];
    let quote = rest.chars().next()?;
    if quote != '"' && quote != '\'' {
        return None;
    }
    let body = &rest[1..];
    let close = body.find(quote)?;
    Some(body[..close].to_string())
}

fn between<'a>(html: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let s = html.find(start)? + start.len();
    let e = html[s..].find(end)? + s;
    Some(&html[s..e])
}

fn decode_basic(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Render OGP metadata as a compact link-preview card (styled by the viewer CSS).
pub fn ogp_card_html(o: &Ogp) -> String {
    let host = o
        .url
        .split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or(&o.url);
    let title = if o.title.is_empty() { &o.url } else { &o.title };
    let img = if o.image.is_empty() {
        String::new()
    } else {
        format!(
            r#"<img class="velq-ogp__img" src="{}" alt="" loading="lazy">"#,
            esc(&o.image)
        )
    };
    format!(
        concat!(
            r#"<a class="velq-ogp" href="{url}" target="_blank" rel="noreferrer noopener">"#,
            r#"{img}<span class="velq-ogp__text">"#,
            r#"<span class="velq-ogp__title">{title}</span>"#,
            r#"<span class="velq-ogp__desc">{desc}</span>"#,
            r#"<span class="velq-ogp__host">{host}</span></span></a>"#,
        ),
        url = esc(&o.url),
        img = img,
        title = esc(title),
        desc = esc(&o.description),
        host = esc(host),
    )
}

/// Fetch a URL and extract its OGP metadata (network).
pub async fn fetch_ogp(url: &str) -> Result<Ogp, String> {
    let client = reqwest::Client::builder()
        .user_agent("velq/0.1 (+https://velq.sh)")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let html = resp.text().await.map_err(|e| e.to_string())?;
    Ok(parse_ogp(&html, url))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_og_tags_and_falls_back_to_title() {
        let html = r#"<html><head><title>Fallback</title>
        <meta property="og:title" content="Real &amp; Title">
        <meta property="og:description" content='A nice page.'>
        <meta property="og:image" content="https://x.test/i.png">
        <meta name="og:site_name" content="X">
        </head><body>hi</body></html>"#;
        let o = parse_ogp(html, "https://x.test/p");
        assert_eq!(o.title, "Real & Title");
        assert_eq!(o.description, "A nice page.");
        assert_eq!(o.image, "https://x.test/i.png");
        assert_eq!(o.site_name, "X");

        let bare = parse_ogp(
            "<html><head><title>Just Title</title></head></html>",
            "https://y.test",
        );
        assert_eq!(bare.title, "Just Title");
    }

    #[test]
    fn card_html_has_link_title_thumb_and_host() {
        let o = Ogp {
            url: "https://ex.com/a".into(),
            title: "Hi".into(),
            description: "d".into(),
            image: "https://ex.com/i.png".into(),
            site_name: "Ex".into(),
        };
        let card = ogp_card_html(&o);
        assert!(card.contains(r#"href="https://ex.com/a""#));
        assert!(card.contains(">Hi<"));
        assert!(card.contains("velq-ogp__img"));
        assert!(card.contains(">ex.com<"));
    }
}
