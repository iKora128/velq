import { invoke } from "./tauri";

/** Markdown → sanitized HTML (comrak in Tauri, marked in browser-mock mode). */
export const renderMarkdown = (md: string) => invoke<string>("render_markdown", { md });
