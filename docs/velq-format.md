# The `.velq` format

> Velq's core IP. A `.velq` packages an HTML (or rendered Markdown) document together
> with **all of its dependencies** so it works completely offline, and previews safely
> in a permission-zero viewer. Implemented in `crates/velq-core`.

## Container

- **A ZIP.** Magic number `PK\x03\x04` — identical to EPUB / `.docx`. Rename a `.velq`
  to `.zip` and any tool can open it. **No lock-in.**
- Extension: `.velq`. MIME (custom): `application/velq+zip`.

## Internal structure

```
manifest.json          # metadata (see below)
index.html             # the main document, links rewritten to assets/
assets/
  css/  js/  img/  fonts/
```

## `manifest.json`

```jsonc
{
  "title":     "string",
  "created":   0,              // epoch seconds
  "updated":   0,
  "sourceUrl": "https://…",    // null unless packaged from a web page
  "generator": "velq-core x.y.z",
  "tags":      ["…"],          // e.g. AI-assigned tags from the proprietary edition
  "custom":    { }             // free-form JSON for plugin extension
}
```

Forward-compatible: unknown fields are ignored, missing fields default.

## Generation (velq-bundler, M14)

1. Stream-parse the input HTML (lol_html). Extract `<link href>`, `<script src>`,
   `<img src/srcset>`, `@font-face` / `url()` in CSS, and `<style>` references.
2. Collect local files; fetch CDN URLs (`reqwest`, default on) so Tailwind CDN,
   Chart.js, etc. are embedded — **completely offline**.
3. Store assets under `assets/{css,js,img,fonts}/` by **content hash** (dedup).
4. Rewrite every reference to the relative `assets/…` path in one pass.
5. Failed URLs go to `BundleReport.failed` and warn — the package still builds.

Markdown → `.velq`: comrak → HTML (minimal theme) → the same pipeline.

## Security model (the viewer)

A `.velq` is previewed in an **isolated `WebView`** (plan §7):

- The viewer window (`velq-viewer-*`) belongs to **no Tauri capability**, so it has
  **zero IPC / fs / plugin access** by construction.
- Its content is served by the `velq:` URI scheme straight from the ZIP, with a strict
  **CSP**: `default-src 'self' data: blob:; connect-src 'none'; script-src 'self'
  'unsafe-inline'; …`. **JS runs; the network and host don't.**
- `.incognito(true)` isolates storage from the main app.
- The WebView is a separate process — a runaway `.velq` can be killed without touching Velq.

| Threat | Mitigation | Risk |
|---|---|---|
| Filesystem access | viewer is in no capability | zero |
| Data exfiltration | CSP `connect-src 'none'` | zero |
| App interference | isolated WebView (separate origin/storage/process) | zero |
| CPU exhaustion | separate process; kill to recover | low |

A self-test fixture lives at `apps/desktop/src-tauri/tests/fixtures/demo.velq`
(launch with `VELQ_OPEN_VELQ=<path>` to open it): it confirms JS executes, the Tauri
bridge is absent, and `fetch()` is blocked.
