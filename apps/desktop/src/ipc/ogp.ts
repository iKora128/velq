import { invoke } from "./tauri";

/** Open Graph metadata for a link, for rendering a rich preview card. */
export interface Ogp {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export const fetchOgp = (url: string) => invoke<Ogp>("fetch_ogp", { url });
