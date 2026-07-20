import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "@/ipc/tauri";

// A src with a scheme (http:, data:, asset:, blob:, tauri:, velq:) or protocol-relative
// (//host) is already loadable; only bare/relative/absolute-local paths need rewriting.
const HAS_SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Rewrite relative `<img>` sources in rendered Markdown so the webview can load the local
 * files, via Tauri's asset protocol, resolving them against the document's own folder.
 * Runs on generated HTML only (never the user's source), so it's safe to rewrite. No-op
 * in browser mode or when the document has no path (an unsaved scratch).
 */
export function rewriteLocalImages(html: string, docPath?: string): string {
  if (!docPath || !isTauri()) return html;
  const slash = docPath.lastIndexOf("/");
  if (slash < 0) return html;
  const dir = docPath.slice(0, slash);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  let changed = false;
  for (const img of parsed.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (!src || HAS_SCHEME.test(src)) continue;
    const rel = src.replace(/^\.\//, "");
    const abs = rel.startsWith("/") ? rel : `${dir}/${rel}`;
    img.setAttribute("src", convertFileSrc(decodeURI(abs)));
    changed = true;
  }
  return changed ? parsed.body.innerHTML : html;
}
