#!/usr/bin/env node
// Post-deploy smoke check for everything that decides whether Google indexes us.
//
// This exists because of a bug that was invisible for weeks: the language-redirect
// Function lived in lp/functions/, but the Pages project's root directory is the
// repo root, so Pages never compiled it. Every page still served fine — only the
// redirect was missing — and nothing checked. Run this after a deploy.
//
//   node scripts/verify-seo.mjs                 # production
//   node scripts/verify-seo.mjs http://…:8788   # a local `wrangler pages dev`

// Where to send the requests, vs. the origin the pages declare themselves to live
// at. They differ when pointing this at a local `wrangler pages dev`, where the
// canonical tags and sitemap still (correctly) say velq.sh.
const SITE = "https://velq.sh";
const BASE = (process.argv[2] || SITE).replace(/\/$/, "");

const UA_BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const UA_GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const PAGES = ["/", "/developers/", "/ja/", "/ja/developers/"];

const failures = [];

function check(name, ok, detail) {
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(name);
}

function get(path, { ua = UA_BROWSER, lang = "en-US,en", cookie = "" } = {}) {
  const headers = { "User-Agent": ua, "Accept-Language": lang, Accept: "text/html" };
  if (cookie) headers.Cookie = cookie;
  return fetch(BASE + path, { headers, redirect: "manual" });
}

// 1. Every canonical URL answers 200 and is indexable.
for (const path of PAGES) {
  const res = await get(path);
  check(`${path} responds 200`, res.status === 200, `got ${res.status}`);
  if (res.status !== 200) continue;

  const html = await res.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(`${path} canonical points at itself`, canonical === `${SITE}${path}`, `got ${canonical}`);
  check(`${path} has no noindex`, !/<meta[^>]+name="robots"[^>]*noindex/i.test(html), "noindex found");

  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
  check(
    `${path} declares en / ja / x-default`,
    ["en", "ja", "x-default"].every((l) => alternates.includes(l)),
    `got [${alternates}]`,
  );
}

// 2. Trailing-slash normalisation. Google reports the slash-less form as
//    "page with redirect" — that is correct and expected, but the target must
//    be the canonical URL, not a 404.
{
  const res = await get("/ja");
  const loc = res.headers.get("location");
  check("/ja redirects to /ja/", res.status === 308 && loc === "/ja/", `got ${res.status} -> ${loc}`);
}

// 3. The language redirect — the part that silently went missing.
{
  const res = await get("/", { lang: "ja,en;q=0.8" });
  const loc = res.headers.get("location");
  check(
    "JA browser on / is redirected to /ja/  [edge Function alive]",
    res.status === 302 && loc === "/ja/",
    `got ${res.status} -> ${loc}. The Function at /functions/_middleware.js is not deployed; ` +
      "it must sit at the repo root because the Pages root directory is the repo root.",
  );
}

// 4. …and never for crawlers, or the English tree drops out of the index.
for (const path of ["/", "/developers/"]) {
  const res = await get(path, { ua: UA_GOOGLEBOT, lang: "ja,en;q=0.8" });
  check(`Googlebot on ${path} is never redirected`, res.status === 200, `got ${res.status}`);
}

// 5. An explicit language choice always wins over the browser's guess.
{
  const res = await get("/", { lang: "ja,en;q=0.8", cookie: "velq_lang=en" });
  check("velq_lang=en cookie beats a JA browser", res.status === 200, `got ${res.status}`);
}

// 6. Sitemap: all four pages, each paired with its translation.
{
  const res = await fetch(`${BASE}/sitemap-0.xml`);
  const xml = await res.text();
  check("sitemap-0.xml is served", res.status === 200, `got ${res.status}`);
  for (const path of PAGES) {
    check(`sitemap lists ${path}`, xml.includes(`<loc>${SITE}${path}</loc>`), "missing");
  }
  check(
    "sitemap carries hreflang alternates",
    (xml.match(/xhtml:link/g) || []).length >= PAGES.length * 2,
    "no xhtml:link alternates — check the sitemap i18n option in astro.config.mjs",
  );
}

console.log(
  failures.length ? `\n${failures.length} check(s) failed against ${BASE}` : `\nAll checks passed against ${BASE}`,
);
process.exit(failures.length ? 1 : 0);
