/**
 * Builds the full HTML document for the preview iframe. The iframe is sandboxed
 * (no `allow-scripts`) and isolated, so styles must be self-contained — we can't
 * reach the app's CSS variables. One calm, GitHub-quality prose theme, themed by
 * an explicit palette. Reused by the HTML exporter (M16).
 */

interface Palette {
  bg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  codeBg: string;
  codeText: string;
  quoteBar: string;
  tableHead: string;
  tableZebra: string;
  mark: string;
}

const LIGHT: Palette = {
  bg: "#fafafa",
  text: "#1f2328",
  muted: "#59636e",
  border: "#d8dee4",
  accent: "#2563eb",
  codeBg: "rgba(99,110,123,0.10)",
  codeText: "#9a3412",
  quoteBar: "#d0d7de",
  tableHead: "#f3f4f6",
  tableZebra: "#f6f8fa",
  mark: "#fff8c5",
};

const DARK: Palette = {
  bg: "#0a0a0a",
  text: "#e6e6e6",
  muted: "#9aa0a6",
  border: "#2a2a2a",
  accent: "#60a5fa",
  codeBg: "rgba(240,240,240,0.08)",
  codeText: "#fca5a5",
  quoteBar: "#3a3a3a",
  tableHead: "#1a1a1a",
  tableZebra: "#141414",
  mark: "rgba(187,128,9,0.35)",
};

function styles(p: Palette): string {
  return `
  :root { color-scheme: ${p === DARK ? "dark" : "light"}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: "iA Writer Quattro", "New York", Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 1.7;
    color: ${p.text};
    background: ${p.bg};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-wrap: break-word;
  }
  .velq-prose {
    max-width: 72ch;
    margin: 0 auto;
    padding: 40px 48px 40vh;
  }
  .velq-prose > :first-child { margin-top: 0; }
  h1, h2, h3, h4, h5, h6 {
    line-height: 1.25;
    font-weight: 700;
    margin: 1.6em 0 0.6em;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.9em; margin-top: 0.2em; }
  h2 { font-size: 1.5em; padding-bottom: 0.2em; border-bottom: 1px solid ${p.border}; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1.05em; }
  h5, h6 { font-size: 1em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.1em; }
  a { color: ${p.accent}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { font-weight: 700; }
  ul, ol { padding-left: 1.6em; }
  li { margin: 0.25em 0; }
  li::marker { color: ${p.muted}; }
  ul.contains-task-list { list-style: none; padding-left: 0.3em; }
  .task-list-item { display: flex; align-items: baseline; gap: 0.5em; }
  .task-list-item input { margin: 0; transform: translateY(1px); accent-color: ${p.accent}; }
  blockquote {
    margin-left: 0;
    padding: 0.2em 1.1em;
    border-left: 3px solid ${p.quoteBar};
    color: ${p.muted};
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    font-size: 0.86em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }
  pre {
    background: ${p.codeBg};
    padding: 14px 16px;
    border-radius: 10px;
    overflow-x: auto;
    line-height: 1.5;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.84em; }
  hr { border: none; border-top: 1px solid ${p.border}; margin: 2em 0; }
  img { max-width: 100%; border-radius: 8px; }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.95em;
  }
  th, td { border: 1px solid ${p.border}; padding: 7px 12px; text-align: left; }
  th { background: ${p.tableHead}; font-weight: 600; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  mark { background: ${p.mark}; color: inherit; padding: 0 0.15em; border-radius: 3px; }
  .footnotes { font-size: 0.9em; color: ${p.muted}; border-top: 1px solid ${p.border}; margin-top: 2.5em; padding-top: 1em; }
  sup a { text-decoration: none; }
  /* Smooth jumps between scroll-sync anchors. */
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  `;
}

export function buildPreviewDoc(bodyHtml: string, opts: { dark: boolean }): string {
  const p = opts.dark ? DARK : LIGHT;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${
    opts.dark ? "dark" : "light"
  }"><style>${styles(p)}</style></head><body><div class="velq-prose">${bodyHtml}</div></body></html>`;
}

/** Wrap an HTML fragment into a full document; pass full documents through. */
export function htmlDocument(source: string): string {
  if (/<html[\s>]/i.test(source)) return source;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"></head><body>${source}</body></html>`;
}
