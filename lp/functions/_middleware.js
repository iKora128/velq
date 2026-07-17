// Cloudflare Pages Function — first-visit language redirect.
//
// The first time a visitor whose browser prefers Japanese lands on an English
// page, send them to the /ja/ equivalent with a real 302 (no flash of the wrong
// language). Rules that keep it from being annoying:
//   • An explicit choice wins forever. The nav/footer language switcher writes a
//     `velq_lang` cookie; once set we honour it and never auto-redirect against it.
//   • Crawlers are never redirected, so both language versions stay indexable
//     (paired with the hreflang tags already in <head>).
//   • Only real HTML navigations are touched — assets and the /ja/ tree pass through.
//
// Lives outside Astro's build: `wrangler pages deploy dist` compiles ./functions
// automatically and layers it in front of the static assets.

const COOKIE = "velq_lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Bots that must see the URL they asked for (so /en and /ja both get indexed /
// previewed correctly). "bot" alone covers Googlebot, bingbot, etc.; the rest
// are crawlers/unfurlers whose UA has no "bot" substring.
const BOT =
  /bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|redditbot|vkshare|w3c_validator|whatsapp|telegram|discord|slack|twitterbot|linkedinbot|applebot|lighthouse|headlesschrome/i;

// Reduce an Accept-Language header to "ja" | "en" | null — whichever the visitor
// ranks first. Everything else is ignored so a fr/de/… visitor keeps the English
// default (which matches hreflang x-default → en).
export function preferredLang(header) {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q=([0-9.]+)$/);
        if (m) q = Number.parseFloat(m[1]);
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter((l) => l.tag && l.tag !== "*")
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag === "ja" || tag.startsWith("ja-")) return "ja";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return null;
}

function readCookie(header, name) {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() === name) return pair.slice(eq + 1).trim();
  }
  return null;
}

// Pure decision: given the request signals, return the path to redirect to, or
// null to let the request through. Unit-tested in isolation.
export function decideRedirect({ path, accept = "", acceptLang = "", cookie = "", ua = "" }) {
  // Never touch the JA tree, assets (anything with a file extension), non-document
  // requests, or crawlers.
  if (path === "/ja" || path.startsWith("/ja/")) return null;
  if (/\.[a-z0-9]+$/i.test(path)) return null;
  if (accept && !accept.includes("text/html")) return null;
  if (ua && BOT.test(ua)) return null;

  // Explicit choice (cookie) beats the browser's Accept-Language guess.
  const choice = readCookie(cookie, COOKIE);
  const lang = choice === "en" || choice === "ja" ? choice : preferredLang(acceptLang);
  if (lang !== "ja") return null;

  const target = path === "/" ? "/ja/" : `/ja${path}`;
  return target === path ? null : target;
}

export async function onRequest(context) {
  const { request, next } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const url = new URL(request.url);
  const target = decideRedirect({
    path: url.pathname,
    accept: request.headers.get("accept") || "",
    acceptLang: request.headers.get("accept-language") || "",
    cookie: request.headers.get("cookie") || "",
    ua: request.headers.get("user-agent") || "",
  });
  if (!target) return next();

  const res = new Response(null, {
    status: 302,
    headers: { Location: target + url.search },
  });
  // Pin the decision so it is genuinely first-visit-only, and keep any cache from
  // serving this redirect to a differently-configured visitor.
  res.headers.append("Set-Cookie", `${COOKIE}=ja; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}
