import { invoke } from "./tauri";
import type { BundleReport } from "./types";

export const bundleToVelq = (input: string, out: string, fetchCdn = true) =>
  invoke<BundleReport>("bundle_to_velq", { input, out, fetchCdn });

export const bundleHtmlToVelq = (
  html: string,
  out: string,
  baseDir: string | null,
  fetchCdn = true,
) => invoke<BundleReport>("bundle_html_to_velq", { html, out, baseDir, fetchCdn });

export interface PackagedVelq {
  outPath: string;
  collected: number;
  failed: number;
}

/** Trace an HTML file's dependencies and write a .velq into Documents/Velq. */
export const packageHtmlFile = (htmlPath: string) =>
  invoke<PackagedVelq>("package_html_file", { htmlPath });

/** Render a Markdown file, bundle its images, and write a .velq (source + rendered
 * view + assets) into Documents/Velq. */
export const packageMdFile = (mdPath: string) =>
  invoke<PackagedVelq>("package_md_file", { mdPath });

/** Bundle a pre-rendered (OGP-enriched) Markdown doc — download the images its
 * HTML references and pack a .velq keeping the .md source. The frontend renders +
 * enriches (to show per-link progress); this does the image fetch + zip. */
export const bundleMdDoc = (mdPath: string, md: string, html: string) =>
  invoke<PackagedVelq>("bundle_md_doc", { mdPath, md, html });

/** Convert a Markdown file to a `.velq` IN PLACE — a sibling `<stem>.velq` beside
 * the source, original `.md` removed. EXPLICIT action only (never on open). The
 * frontend renders + enriches (for progress); this bundles, zips, and swaps. */
export const convertMdInPlace = (mdPath: string, md: string, html: string) =>
  invoke<PackagedVelq>("convert_md_in_place", { mdPath, md, html });

/** Convert an HTML file to a `.velq` IN PLACE (sibling `<stem>.velq`, original
 * removed). EXPLICIT action only. */
export const convertHtmlInPlace = (htmlPath: string) =>
  invoke<PackagedVelq>("convert_html_in_place", { htmlPath });
