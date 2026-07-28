# SEO / indexing log

Search Console findings for velq.sh and what was done about them. The landing page ships from
`lp/`, deployed by the Git-connected Cloudflare Pages project `velq`. Run
`pnpm -C lp verify:seo` after any deploy that touches routing, hreflang, or the sitemap.

---

## 2026-07-28 — "ページにリダイレクトがあります" on /ja

**Reported:** Search Console listed `https://velq.sh/ja` (1 page) as *Page with redirect*, and a
separate page as *Crawled – currently not indexed*. First detected 2026-07-25.

### The redirect report is not a defect

`https://velq.sh/ja` → `308` → `https://velq.sh/ja/`. Astro builds with
`build.format: "directory"`, so the page is `/ja/index.html` and Cloudflare Pages normalises the
slash-less form. The canonical `/ja/` answers 200, is the URL in the sitemap, in `<link
rel="canonical">`, in the hreflang tags, and in every internal link. Search Console is only saying
"the redirect source is not the URL I will index; the target is." No action, and *Validate fix*
should not be pressed — there is nothing to validate.

Nothing on the site links to the slash-less `/ja`, so Google found it externally.

### What the report did surface

Auditing the routing turned up a real fault. `functions/_middleware.js` — the first-visit
Accept-Language redirect, whose whole point is that **crawlers are never redirected so both
language trees stay indexable** — had never been deployed. It lived in `lp/functions/`, but the
Pages project's root directory is the repo root (its build output is `lp/dist`), and Pages only
compiles a `functions/` directory found at that root. A JA browser hitting `/` got 200, not 302.

The only thing performing the redirect was the client-side fallback in `BaseLayout.astro`, and
that copy had **no crawler check**. Googlebot executes it. Had its renderer ever reported a
Japanese locale, every English page would have `location.replace()`-ed to its `/ja/` twin and
been dropped from the index as a redirect. No symptom yet — the English pages were still
indexed — but the failure mode was live.

### Fixes

| # | Change | Why |
|---|---|---|
| 1 | Moved `lp/functions/` → `functions/` (repo root) | The only location Cloudflare Pages compiles, given root dir = repo root. Verified with `wrangler pages dev lp/dist` from the root: all 8 redirect cases behave. |
| 2 | Crawler guard in the `BaseLayout.astro` inline fallback | Mirrors `BOT` in the middleware, plus `navigator.webdriver`. A JS redirect on an English page is an index-losing bug, not a UX detail. |
| 3 | `sitemap({ i18n: … })` in `astro.config.mjs` | The sitemap now carries `xhtml:link` alternates, so `/x/` and `/ja/x/` are one page in two languages rather than two unrelated URLs. Reinforces the `<head>` hreflang. |
| 4 | Deleted `lp/wrangler.toml` | Said `pages_build_output_dir = "dist"`; production reads none of it, and it lured `wrangler pages deploy` into running from `lp/`, where `functions/` is invisible. A config that only misleads. |
| 5 | `lp/scripts/verify-seo.mjs` + `pnpm -C lp verify:seo` | 27 assertions over the live site: status, canonical, hreflang, noindex, slash normalisation, the language redirect, crawler exemption, cookie precedence, sitemap contents. This class of bug is silent — every page still 200s — so it needs an explicit check. |

Production before the fix: 25 of 27 pass; the two failures are the missing Function and the
sitemap alternates. After the fix, locally: 27/27.

### Still open

- *Crawled – currently not indexed* (1 page): open the row in Search Console to see which URL,
  then request indexing via URL inspection. Normal for a site first detected three days ago.
- Confirm `pnpm -C lp verify:seo` passes against production once this ships.
