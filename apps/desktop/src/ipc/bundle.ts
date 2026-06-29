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
