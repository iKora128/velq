/**
 * Builds the full HTML document for the preview iframe. The iframe is sandboxed
 * (no `allow-scripts`) and isolated, so styles must be self-contained — we can't
 * reach the app's CSS variables; every theme carries its own explicit palette.
 * Switchable templates (the "preview template" setting), each light+dark:
 *   paper    — the original calm, GitHub-quality serif prose
 *   docs     — the familiar GitHub-flavored sans look
 *   note     — Notion/Bear-style: accent-bar headings, callout quotes, soft corners
 *   magazine — editorial: display headings, accent bands, marker-highlighted bold
 *   tech     — Zenn-style: white article card on blue-gray, airy line-height, navy code
 *   sky      — Nani-style: sky-blue accents, extra-round card, dotted links, friendly
 *   glass    — tategazou-style: frosted card over a warm teal/orange/red gradient mesh
 * Reused by Quick Look and the HTML/PDF exporters (M16), so an export looks like
 * the preview it was made from.
 */

export const PREVIEW_TEMPLATE_IDS = [
  "paper",
  "docs",
  "note",
  "magazine",
  "tech",
  "sky",
  "glass",
] as const;
export type PreviewTemplate = (typeof PREVIEW_TEMPLATE_IDS)[number];

interface Palette {
  bg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  /** Translucent accent for heading bands and chips. */
  accentSoft: string;
  codeBg: string;
  codeText: string;
  /** Code *blocks* — may contrast harder than inline chips (magazine). */
  preBg: string;
  preText: string;
  quoteBar: string;
  quoteBg: string;
  tableHead: string;
  tableZebra: string;
  mark: string;
  shadow: string;
}

interface TemplateSpec {
  light: Palette;
  dark: Palette;
  /** Typography + decoration; appended to the shared structural base. Templates
   * with mode-specific extras (card surfaces, gradient meshes) also get `dark`. */
  css: (p: Palette, dark: boolean) => string;
}

const MONO = `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`;
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif`;
const SERIF = `"iA Writer Quattro", "New York", Georgia, "Times New Roman", serif`;
const MAG_BODY = `"Iowan Old Style", Georgia, "Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif`;
const MAG_DISPLAY = `"Avenir Next", "Helvetica Neue", -apple-system, "Hiragino Kaku Gothic StdN", "Hiragino Sans", "Noto Sans JP", sans-serif`;

/** Structure every template shares: resets, task lists, footnotes, scroll-sync. */
function base(p: Palette, dark: boolean): string {
  return `
  :root { color-scheme: ${dark ? "dark" : "light"}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    color: ${p.text};
    background: ${p.bg};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-wrap: break-word;
  }
  .velq-prose > :first-child { margin-top: 0; }
  ul.contains-task-list { list-style: none; padding-left: 0.3em; }
  .task-list-item { display: flex; align-items: baseline; gap: 0.5em; }
  .task-list-item input { margin: 0; transform: translateY(1px); accent-color: ${p.accent}; }
  img { max-width: 100%; }
  mark { background: ${p.mark}; color: inherit; padding: 0 0.15em; border-radius: 3px; }
  .footnotes { font-size: 0.9em; color: ${p.muted}; border-top: 1px solid ${p.border}; margin-top: 2.5em; padding-top: 1em; }
  sup a { text-decoration: none; }
  /* Smooth jumps between scroll-sync anchors. */
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  `;
}

// ---- paper — the original calm serif prose ----------------------------------

const paper: TemplateSpec = {
  light: {
    bg: "#fafafa",
    text: "#1f2328",
    muted: "#59636e",
    border: "#d8dee4",
    accent: "#2563eb",
    accentSoft: "rgba(37,99,235,0.08)",
    codeBg: "rgba(99,110,123,0.10)",
    codeText: "#9a3412",
    preBg: "rgba(99,110,123,0.10)",
    preText: "#1f2328",
    quoteBar: "#d0d7de",
    quoteBg: "#f3f4f6",
    tableHead: "#f3f4f6",
    tableZebra: "#f6f8fa",
    mark: "#fff8c5",
    shadow: "rgba(0,0,0,0.08)",
  },
  dark: {
    bg: "#0a0a0a",
    text: "#e6e6e6",
    muted: "#9aa0a6",
    border: "#2a2a2a",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.12)",
    codeBg: "rgba(240,240,240,0.08)",
    codeText: "#fca5a5",
    preBg: "rgba(240,240,240,0.08)",
    preText: "#e6e6e6",
    quoteBar: "#3a3a3a",
    quoteBg: "#141414",
    tableHead: "#1a1a1a",
    tableZebra: "#141414",
    mark: "rgba(187,128,9,0.35)",
    shadow: "rgba(0,0,0,0.5)",
  },
  css: (p) => `
  body { font-family: ${SERIF}; font-size: 17px; line-height: 1.7; }
  .velq-prose { max-width: 72ch; margin: 0 auto; padding: 40px 48px 40vh; }
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
  blockquote {
    margin-left: 0;
    padding: 0.2em 1.1em;
    border-left: 3px solid ${p.quoteBar};
    color: ${p.muted};
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.86em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }
  pre {
    background: ${p.preBg};
    padding: 14px 16px;
    border-radius: 10px;
    overflow-x: auto;
    line-height: 1.5;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.84em; }
  hr { border: none; border-top: 1px solid ${p.border}; margin: 2em 0; }
  img { border-radius: 8px; }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.95em;
  }
  th, td { border: 1px solid ${p.border}; padding: 7px 12px; text-align: left; }
  th { background: ${p.tableHead}; font-weight: 600; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- docs — the GitHub look everyone already knows ---------------------------

const docs: TemplateSpec = {
  light: {
    bg: "#ffffff",
    text: "#1f2328",
    muted: "#59636e",
    border: "#d1d9e0",
    accent: "#0969da",
    accentSoft: "rgba(9,105,218,0.1)",
    codeBg: "rgba(175,184,193,0.2)",
    codeText: "#1f2328",
    preBg: "#f6f8fa",
    preText: "#1f2328",
    quoteBar: "#d1d9e0",
    quoteBg: "transparent",
    tableHead: "#f6f8fa",
    tableZebra: "#f6f8fa",
    mark: "#fff8c5",
    shadow: "rgba(0,0,0,0.06)",
  },
  dark: {
    bg: "#0d1117",
    text: "#e6edf3",
    muted: "#9198a1",
    border: "#3d444d",
    accent: "#4493f8",
    accentSoft: "rgba(68,147,248,0.15)",
    codeBg: "rgba(101,108,118,0.2)",
    codeText: "#e6edf3",
    preBg: "#161b22",
    preText: "#e6edf3",
    quoteBar: "#3d444d",
    quoteBg: "transparent",
    tableHead: "#151b23",
    tableZebra: "#151b23",
    mark: "rgba(187,128,9,0.35)",
    shadow: "rgba(0,0,0,0.5)",
  },
  css: (p) => `
  body { font-family: ${SANS}; font-size: 16px; line-height: 1.6; }
  .velq-prose { max-width: 52rem; margin: 0 auto; padding: 40px 48px 40vh; }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.25; margin: 1.5em 0 0.6em; }
  h1 { font-size: 2em; margin-top: 0.2em; padding-bottom: 0.3em; border-bottom: 1px solid ${p.border}; }
  h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid ${p.border}; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  h5 { font-size: 0.875em; }
  h6 { font-size: 0.85em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1em; }
  a { color: ${p.accent}; text-decoration: underline; text-underline-offset: 0.2em; }
  strong { font-weight: 600; }
  ul, ol { padding-left: 2em; }
  li { margin: 0.25em 0; }
  blockquote {
    margin-left: 0;
    padding: 0 1em;
    border-left: 0.25em solid ${p.quoteBar};
    color: ${p.muted};
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 85%;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.2em 0.4em;
    border-radius: 6px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    line-height: 1.45;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 85%; }
  hr { border: none; height: 3px; background: ${p.border}; border-radius: 2px; margin: 24px 0; }
  img { border-radius: 6px; }
  table {
    border-collapse: collapse;
    width: max-content;
    max-width: 100%;
    font-size: 0.95em;
  }
  th, td { border: 1px solid ${p.border}; padding: 6px 13px; text-align: left; }
  th { background: ${p.tableHead}; font-weight: 600; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- note — Notion/Bear-style friendly notes ---------------------------------

const note: TemplateSpec = {
  light: {
    bg: "#ffffff",
    text: "#37352f",
    muted: "#787774",
    border: "#e3e2de",
    accent: "#7c3aed",
    accentSoft: "rgba(124,58,237,0.07)",
    codeBg: "rgba(135,131,120,0.15)",
    codeText: "#d44c47",
    preBg: "#f7f6f3",
    preText: "#37352f",
    quoteBar: "#7c3aed",
    quoteBg: "#f7f6f3",
    tableHead: "#f7f6f3",
    tableZebra: "#fbfbfa",
    mark: "#fdecc8",
    shadow: "rgba(15,15,15,0.06)",
  },
  dark: {
    bg: "#191919",
    text: "#e0e0de",
    muted: "#9b9998",
    border: "#333230",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.13)",
    codeBg: "rgba(135,131,120,0.25)",
    codeText: "#ff7369",
    preBg: "#202020",
    preText: "#e0e0de",
    quoteBar: "#a78bfa",
    quoteBg: "#202020",
    tableHead: "#252525",
    tableZebra: "#1e1e1e",
    mark: "rgba(250,204,21,0.22)",
    shadow: "rgba(0,0,0,0.5)",
  },
  css: (p) => `
  body { font-family: ${SANS}; font-size: 16.5px; line-height: 1.75; }
  .velq-prose { max-width: 46rem; margin: 0 auto; padding: 44px 48px 40vh; }
  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.3;
    margin: 1.7em 0 0.5em;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.9em; margin-top: 0.2em; letter-spacing: -0.02em; }
  h2 {
    font-size: 1.4em;
    padding: 0.3em 0.6em;
    border-left: 4px solid ${p.accent};
    border-radius: 0 8px 8px 0;
    background: linear-gradient(90deg, ${p.accentSoft}, transparent 78%);
  }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.05em; }
  h5, h6 { font-size: 1em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.05em; }
  a { color: ${p.accent}; text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 0.2em; }
  strong { font-weight: 700; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  li::marker { color: ${p.accent}; }
  blockquote {
    margin-left: 0;
    padding: 0.8em 1.1em;
    background: ${p.quoteBg};
    border-left: 3px solid ${p.quoteBar};
    border-radius: 10px;
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.85em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    border: 1px solid ${p.border};
    padding: 14px 16px;
    border-radius: 10px;
    overflow-x: auto;
    line-height: 1.55;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; }
  hr { border: none; border-top: 1px solid ${p.border}; margin: 2.2em 0; }
  img { border-radius: 10px; }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 0.95em;
    border: 1px solid ${p.border};
    border-radius: 10px;
    overflow: hidden;
  }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid ${p.border}; }
  th + th, td + td { border-left: 1px solid ${p.border}; }
  th { background: ${p.tableHead}; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- magazine — editorial, design-forward ------------------------------------

const magazine: TemplateSpec = {
  light: {
    bg: "#fdfcfa",
    text: "#1c1917",
    muted: "#78716c",
    border: "#e7e5e4",
    accent: "#e11d48",
    accentSoft: "rgba(225,29,72,0.08)",
    codeBg: "rgba(28,25,23,0.06)",
    codeText: "#9f1239",
    preBg: "#1c1917",
    preText: "#f5f0eb",
    quoteBar: "#e11d48",
    quoteBg: "#f6f3ef",
    tableHead: "transparent",
    tableZebra: "#f6f3ef",
    mark: "rgba(253,224,71,0.5)",
    shadow: "rgba(28,25,23,0.12)",
  },
  dark: {
    bg: "#141210",
    text: "#eae6e1",
    muted: "#a8a29e",
    border: "#2e2b28",
    accent: "#fb7185",
    accentSoft: "rgba(251,113,133,0.12)",
    codeBg: "rgba(250,245,240,0.08)",
    codeText: "#fda4af",
    preBg: "#0d0c0b",
    preText: "#e7e2dc",
    quoteBar: "#fb7185",
    quoteBg: "#1d1a18",
    tableHead: "transparent",
    tableZebra: "#1a1816",
    mark: "rgba(217,119,6,0.35)",
    shadow: "rgba(0,0,0,0.55)",
  },
  css: (p) => `
  body { font-family: ${MAG_BODY}; font-size: 17.5px; line-height: 1.85; }
  .velq-prose { max-width: 66ch; margin: 0 auto; padding: 56px 56px 40vh; }
  h1, h2, h3, h4, h5, h6 {
    font-family: ${MAG_DISPLAY};
    font-weight: 800;
    line-height: 1.22;
    letter-spacing: -0.015em;
    margin: 1.9em 0 0.6em;
  }
  h1 { font-size: 2.35em; margin-top: 0.15em; line-height: 1.12; }
  h1::after {
    content: "";
    display: block;
    width: 2em;
    height: 5px;
    margin-top: 0.32em;
    background: ${p.accent};
    border-radius: 999px;
  }
  h1 + p { font-size: 1.12em; line-height: 1.75; }
  h2 {
    font-size: 1.5em;
    padding: 0.32em 0.6em;
    border-left: 5px solid ${p.accent};
    border-radius: 0 8px 8px 0;
    background: linear-gradient(90deg, ${p.accentSoft}, transparent 72%);
  }
  h3 { font-size: 1.18em; }
  h3::before {
    content: "";
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    margin-right: 0.45em;
    background: ${p.accent};
    border-radius: 2px;
    transform: rotate(45deg);
    vertical-align: 0.05em;
  }
  h4 { font-size: 0.95em; letter-spacing: 0.08em; text-transform: uppercase; color: ${p.muted}; }
  h5, h6 { font-size: 0.95em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.2em; }
  a { color: ${p.accent}; text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 0.22em; }
  a:hover { text-decoration-thickness: 2.5px; }
  strong {
    font-weight: 700;
    background: linear-gradient(transparent 62%, ${p.mark} 62%);
    padding: 0 0.08em;
    border-radius: 2px;
  }
  ul, ol { padding-left: 1.55em; }
  li { margin: 0.3em 0; }
  li::marker { color: ${p.accent}; font-weight: 700; }
  blockquote {
    position: relative;
    margin: 1.7em 0;
    padding: 1em 1.3em 1em 3rem;
    background: ${p.quoteBg};
    border-radius: 12px;
    font-size: 1.02em;
  }
  blockquote::before {
    content: "\\201C";
    position: absolute;
    left: 12px;
    top: 6px;
    font-family: Georgia, serif;
    font-size: 2.8em;
    line-height: 1;
    color: ${p.accent};
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.82em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.16em 0.42em;
    border-radius: 6px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    padding: 18px 20px;
    border-radius: 14px;
    overflow-x: auto;
    line-height: 1.6;
    box-shadow: 0 12px 32px ${p.shadow};
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.82em; }
  hr { border: none; width: 72px; height: 4px; margin: 2.8em auto; background: ${p.accent}; border-radius: 999px; }
  img { border-radius: 12px; box-shadow: 0 12px 32px ${p.shadow}; }
  table { border-collapse: collapse; width: 100%; font-size: 0.92em; }
  th {
    font-family: ${MAG_DISPLAY};
    font-weight: 700;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 2.5px solid ${p.accent};
    background: ${p.tableHead};
  }
  td { padding: 10px 12px; text-align: left; border-bottom: 1px solid ${p.border}; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- tech — the Zenn-style article card everyone reads tech posts on ---------

const tech: TemplateSpec = {
  light: {
    bg: "#edf2f7",
    text: "#212931",
    muted: "#65717b",
    border: "#d6e3ed",
    accent: "#0f83fd",
    accentSoft: "rgba(62,168,255,0.14)",
    codeBg: "rgba(33,90,160,0.07)",
    codeText: "#212931",
    preBg: "#1a2638",
    preText: "#d6e3ed",
    quoteBar: "#d6e3ed",
    quoteBg: "transparent",
    tableHead: "#edf2f7",
    tableZebra: "#f7fafc",
    mark: "#fff8c5",
    shadow: "rgba(20,40,80,0.06)",
  },
  dark: {
    bg: "#0d141c",
    text: "#dbe3ea",
    muted: "#8b97a3",
    border: "#2c3944",
    accent: "#4db8ff",
    accentSoft: "rgba(77,184,255,0.16)",
    codeBg: "rgba(120,160,200,0.14)",
    codeText: "#dbe3ea",
    preBg: "#0a1017",
    preText: "#cdd8e5",
    quoteBar: "#2c3944",
    quoteBg: "transparent",
    tableHead: "#1b2530",
    tableZebra: "#131b24",
    mark: "rgba(187,128,9,0.35)",
    shadow: "rgba(0,0,0,0.45)",
  },
  css: (p, dark) => `
  body { font-family: ${SANS}; font-size: 16px; line-height: 1.9; padding: 0 20px 40vh; }
  .velq-prose {
    max-width: 47rem;
    margin: 36px auto 0;
    padding: 40px 44px;
    background: ${dark ? "#151d27" : "#ffffff"};
    border-radius: 14px;
    box-shadow: 0 2px 10px ${p.shadow};
  }
  h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.4; margin: 2.3em 0 0.6em; }
  h1 { font-size: 1.7em; margin-top: 0.2em; padding-bottom: 0.3em; border-bottom: 1px solid ${p.border}; }
  h2 { font-size: 1.4em; padding-bottom: 0.25em; border-bottom: 1px solid ${p.border}; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.05em; }
  h5, h6 { font-size: 1em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.35em; }
  a { color: ${p.accent}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { font-weight: 700; }
  ul, ol { padding-left: 1.7em; }
  li { margin: 0.4em 0; }
  blockquote {
    font-size: 0.97em;
    margin-left: 0;
    padding: 0 0 0 0.9em;
    border-left: 3px solid ${p.quoteBar};
    color: ${p.muted};
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.85em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    line-height: 1.6;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; }
  hr { border: none; border-top: 2px solid ${p.border}; margin: 2.5em 0; }
  img { border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
  th, td { border: 1px solid ${p.border}; padding: 8px 12px; text-align: left; }
  th { background: ${p.tableHead}; font-weight: 700; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- sky — Nani-style: sky blue, extra round, friendly ------------------------

const sky: TemplateSpec = {
  light: {
    bg: "#ebf6ff",
    text: "#080d12",
    muted: "#5f6a6f",
    border: "#e2eaee",
    accent: "#0089f2",
    accentSoft: "rgba(18,168,255,0.13)",
    codeBg: "rgba(41,108,147,0.09)",
    codeText: "#0f5e93",
    preBg: "#f3f9fe",
    preText: "#080d12",
    quoteBar: "#12a8ff",
    quoteBg: "#f3f9fe",
    tableHead: "#f3f9fe",
    tableZebra: "#fbfdff",
    mark: "#fff3bf",
    shadow: "rgba(18,88,166,0.10)",
  },
  dark: {
    bg: "#11151a",
    text: "#ecf4fa",
    muted: "#a8aeb6",
    border: "#33383e",
    accent: "#24afff",
    accentSoft: "rgba(36,175,255,0.16)",
    codeBg: "rgba(90,170,230,0.15)",
    codeText: "#7cc7ff",
    preBg: "#171d24",
    preText: "#d7dfe5",
    quoteBar: "#24afff",
    quoteBg: "#1d2a37",
    tableHead: "#1f2933",
    tableZebra: "#161c23",
    mark: "rgba(250,204,21,0.22)",
    shadow: "rgba(0,0,0,0.5)",
  },
  css: (p, dark) => `
  body { font-family: ${SANS}; font-size: 16px; line-height: 1.85; padding: 0 20px 40vh; }
  .velq-prose {
    max-width: 46rem;
    margin: 32px auto 0;
    padding: 44px 48px;
    background: ${dark ? "#1c2126" : "#ffffff"};
    border-radius: 32px;
    box-shadow: 0 6px 24px ${p.shadow};
  }
  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.4;
    margin: 2em 0 0.6em;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.75em; margin-top: 0.1em; }
  h2 { font-size: 1.3em; padding: 0.4em 0.75em; background: ${p.accentSoft}; border-radius: 14px; }
  h3 { font-size: 1.15em; }
  h3::before {
    content: "";
    display: inline-block;
    width: 0.45em;
    height: 0.45em;
    margin-right: 0.45em;
    background: ${p.accent};
    border-radius: 999px;
    vertical-align: 0.08em;
  }
  h4 { font-size: 1.02em; }
  h5, h6 { font-size: 1em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.15em; }
  a {
    color: ${p.accent};
    text-decoration: underline dotted;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 0.25em;
  }
  a:hover { text-decoration-style: solid; }
  strong { font-weight: 700; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.35em 0; }
  li::marker { color: ${p.accent}; }
  blockquote {
    margin-left: 0;
    padding: 0.9em 1.15em;
    background: ${p.quoteBg};
    border: 1px solid ${p.border};
    border-radius: 16px;
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.85em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.15em 0.4em;
    border-radius: 6px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    border: 1px solid ${p.border};
    padding: 16px 18px;
    border-radius: 16px;
    overflow-x: auto;
    line-height: 1.6;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; }
  hr { border: none; border-top: 2px dotted ${p.border}; margin: 2.4em 0; }
  img { border-radius: 16px; }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 0.95em;
    border: 1px solid ${p.border};
    border-radius: 12px;
    overflow: hidden;
  }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid ${p.border}; }
  th + th, td + td { border-left: 1px solid ${p.border}; }
  th { background: ${p.tableHead}; font-weight: 700; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `,
};

// ---- glass — tategazou-style: frosted card on a warm gradient mesh -----------

const GLASS_GRADIENT = "linear-gradient(120deg, #a0d3d9, #f29441, #f2380f)";

const glass: TemplateSpec = {
  light: {
    bg: "#f6f2ec",
    text: "#1f1f1f",
    muted: "#55514f",
    border: "rgba(27,24,20,0.12)",
    accent: "#f2380f",
    accentSoft: "rgba(242,148,65,0.25)",
    codeBg: "rgba(27,24,20,0.07)",
    codeText: "#c2410c",
    preBg: "#211d19",
    preText: "#f4efe9",
    quoteBar: "#f29441",
    quoteBg: "rgba(255,255,255,0.55)",
    tableHead: "rgba(160,211,217,0.30)",
    tableZebra: "rgba(255,255,255,0.5)",
    mark: "rgba(242,148,65,0.35)",
    shadow: "rgba(242,56,15,0.16)",
  },
  dark: {
    bg: "#17130f",
    text: "#ece7e1",
    muted: "#a9a29b",
    border: "rgba(255,255,255,0.12)",
    accent: "#ff7a54",
    accentSoft: "rgba(242,148,65,0.20)",
    codeBg: "rgba(255,255,255,0.09)",
    codeText: "#ffb38a",
    preBg: "#0e0b09",
    preText: "#e9e2da",
    quoteBar: "#f29441",
    quoteBg: "rgba(255,255,255,0.06)",
    tableHead: "rgba(160,211,217,0.14)",
    tableZebra: "rgba(255,255,255,0.05)",
    mark: "rgba(242,148,65,0.28)",
    shadow: "rgba(0,0,0,0.5)",
  },
  css: (p, dark) => {
    const mesh = dark
      ? `radial-gradient(900px 500px at 8% 0%, rgba(160,211,217,0.16), transparent 70%),
         radial-gradient(700px 600px at 95% 12%, rgba(242,148,65,0.13), transparent 65%),
         radial-gradient(800px 600px at 50% 100%, rgba(242,56,15,0.10), transparent 70%)`
      : `radial-gradient(900px 500px at 8% 0%, rgba(160,211,217,0.55), transparent 70%),
         radial-gradient(700px 600px at 95% 12%, rgba(242,148,65,0.38), transparent 65%),
         radial-gradient(800px 600px at 50% 100%, rgba(242,56,15,0.18), transparent 70%)`;
    const card = dark ? "rgba(32,28,24,0.72)" : "rgba(255,255,255,0.76)";
    const cardBorder = dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.7)";
    const h2Band = dark
      ? "linear-gradient(120deg, rgba(160,211,217,0.30), rgba(242,148,65,0.28))"
      : "linear-gradient(120deg, rgba(160,211,217,0.8), rgba(242,148,65,0.7))";
    return `
  body {
    font-family: "Noto Sans JP", ${SANS};
    font-size: 16.5px;
    line-height: 1.85;
    padding: 0 20px 40vh;
    background-image: ${mesh};
    background-attachment: fixed;
  }
  .velq-prose {
    max-width: 47rem;
    margin: 40px auto 0;
    padding: 48px 52px;
    background: ${card};
    border: 1px solid ${cardBorder};
    border-radius: 28px;
    box-shadow: 0 30px 70px ${p.shadow}, 0 10px 30px rgba(31,31,31,0.10);
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
  }
  h1, h2, h3, h4, h5, h6 {
    font-weight: 800;
    line-height: 1.35;
    margin: 2em 0 0.6em;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.85em; margin-top: 0.1em; }
  h1::after {
    content: "";
    display: block;
    width: 5em;
    height: 6px;
    margin-top: 0.4em;
    border-radius: 999px;
    background: ${GLASS_GRADIENT};
  }
  h2 {
    display: inline-block;
    font-size: 1.3em;
    padding: 0.3em 0.9em;
    border-radius: 999px;
    background: ${h2Band};
    color: ${dark ? p.text : "#231f1d"};
  }
  h3 { font-size: 1.15em; }
  h3::before {
    content: "";
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    margin-right: 0.45em;
    border-radius: 999px;
    background: linear-gradient(120deg, #a0d3d9, #f29441);
    vertical-align: 0.05em;
  }
  h4 { font-size: 1.02em; }
  h5, h6 { font-size: 1em; color: ${p.muted}; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1.2em; }
  a {
    color: ${p.accent};
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-decoration-color: rgba(242,56,15,0.35);
    text-underline-offset: 0.2em;
  }
  a:hover { text-decoration-color: ${p.accent}; }
  strong {
    font-weight: 700;
    background: linear-gradient(transparent 62%, ${p.mark} 62%);
    padding: 0 0.08em;
    border-radius: 2px;
  }
  ul, ol { padding-left: 1.55em; }
  li { margin: 0.35em 0; }
  li::marker { color: #f29441; font-weight: 700; }
  blockquote {
    margin-left: 0;
    padding: 0.9em 1.2em;
    background: ${p.quoteBg};
    border: 1px solid ${cardBorder};
    border-left: 3px solid ${p.quoteBar};
    border-radius: 16px;
  }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ${MONO};
    font-size: 0.85em;
    background: ${p.codeBg};
    color: ${p.codeText};
    padding: 0.15em 0.4em;
    border-radius: 6px;
  }
  pre {
    background: ${p.preBg};
    color: ${p.preText};
    padding: 16px 18px;
    border-radius: 16px;
    overflow-x: auto;
    line-height: 1.6;
    box-shadow: 0 10px 26px rgba(31,31,31,0.18);
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; }
  hr {
    border: none;
    width: 42%;
    height: 4px;
    margin: 2.6em auto;
    border-radius: 999px;
    background: ${GLASS_GRADIENT};
  }
  img { border-radius: 16px; box-shadow: 0 10px 26px rgba(31,31,31,0.12); }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 0.95em;
    border: 1px solid ${p.border};
    border-radius: 14px;
    overflow: hidden;
  }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid ${p.border}; }
  th + th, td + td { border-left: 1px solid ${p.border}; }
  th { background: ${p.tableHead}; font-weight: 700; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(2n) td { background: ${p.tableZebra}; }
  `;
  },
};

const TEMPLATES: Record<PreviewTemplate, TemplateSpec> = {
  paper,
  docs,
  note,
  magazine,
  tech,
  sky,
  glass,
};

export interface PreviewDocOpts {
  dark: boolean;
  /** Defaults to "paper"; an unknown persisted value also falls back to it. */
  template?: PreviewTemplate;
}

export function buildPreviewDoc(bodyHtml: string, opts: PreviewDocOpts): string {
  const spec = TEMPLATES[opts.template ?? "paper"] ?? TEMPLATES.paper;
  const p = opts.dark ? spec.dark : spec.light;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${
    opts.dark ? "dark" : "light"
  }"><style>${base(p, opts.dark)}${spec.css(p, opts.dark)}</style></head><body><div class="velq-prose">${bodyHtml}</div></body></html>`;
}

/** Wrap an HTML fragment into a full document; pass full documents through. */
export function htmlDocument(source: string): string {
  if (/<html[\s>]/i.test(source)) return source;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"></head><body>${source}</body></html>`;
}
