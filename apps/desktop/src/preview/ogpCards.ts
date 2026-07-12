import { fetchOgp, type Ogp } from "@/ipc/ogp";

/** OGP fetches are cached per URL for the session — a link that appears in many
 * previews (or re-renders) is fetched once. Failures resolve to a bare-URL card. */
const cache = new Map<string, Promise<Ogp>>();

function getOgp(url: string): Promise<Ogp> {
  let p = cache.get(url);
  if (!p) {
    p = fetchOgp(url).catch(
      (): Ogp => ({ url, title: url, description: "", image: "", siteName: "" }),
    );
    cache.set(url, p);
  }
  return p;
}

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Card markup mirrors the Rust `ogp_card_html` (bundled into the .velq) so the
 * live preview and the packaged viewer look identical. Styled by `.velq-ogp`. */
function cardHtml(o: Ogp): string {
  const host = o.url.split("://")[1]?.split("/")[0] ?? o.url;
  const img = o.image
    ? `<img class="velq-ogp__img" src="${esc(o.image)}" alt="" loading="lazy">`
    : "";
  return `<a class="velq-ogp" href="${esc(o.url)}" target="_blank" rel="noreferrer noopener">${img}<span class="velq-ogp__text"><span class="velq-ogp__title">${esc(o.title || o.url)}</span><span class="velq-ogp__desc">${esc(o.description)}</span><span class="velq-ogp__host">${esc(host)}</span></span></a>`;
}

/**
 * Turn paragraphs that are JUST a bare URL into rich OGP link cards (the Zenn /
 * Notion behaviour). Inline links and everything else are left untouched. Never
 * throws — a fetch failure degrades to a plain-URL card. Returns the input
 * unchanged when there are no bare-URL paragraphs (the common case, no cost).
 */
export async function enrichOgpCards(
  html: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const targets: { p: Element; url: string }[] = [];
  for (const p of Array.from(doc.querySelectorAll("p"))) {
    const a = p.querySelector("a");
    const href = a?.getAttribute("href")?.trim();
    if (a && href && p.childElementCount === 1 && p.textContent?.trim() === href) {
      if (/^https?:\/\//i.test(href)) targets.push({ p, url: href });
    }
  }
  if (targets.length === 0) return html;
  let done = 0;
  onProgress?.(0, targets.length);
  const cards = await Promise.all(
    targets.map((t) =>
      getOgp(t.url).then((o) => {
        done += 1;
        onProgress?.(done, targets.length);
        return cardHtml(o);
      }),
    ),
  );
  targets.forEach((t, i) => {
    const wrap = doc.createElement("div");
    wrap.innerHTML = cards[i];
    const card = wrap.firstChild;
    if (card) t.p.replaceWith(card);
  });
  return doc.body.innerHTML;
}
