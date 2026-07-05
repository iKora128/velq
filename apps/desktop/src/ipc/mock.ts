/**
 * In-memory mock backend for running the UI in a plain browser (no Tauri).
 * Handlers are registered per domain and grow alongside the milestones. This is
 * what makes the §13 UI/UX screenshot loop possible without launching the app.
 */
import { DEFAULT_SETTINGS, type Settings } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: mock handlers are intentionally loose.
type Handler = (args: any) => unknown | Promise<unknown>;

const handlers = new Map<string, Handler>();

export function registerMock(cmd: string, handler: Handler): void {
  handlers.set(cmd, handler);
}

export async function mockInvoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const handler = handlers.get(cmd);
  if (!handler) {
    console.warn(`[mock] unhandled command: ${cmd}`, args);
    throw new Error(`mock backend has no handler for "${cmd}"`);
  }
  return (await handler(args)) as T;
}

// ---- settings (persisted to localStorage so the browser demo remembers) ----
const SETTINGS_KEY = "velq.mock.settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

registerMock("get_settings", () => loadSettings());
registerMock("apply_menu_language", () => null);
registerMock("set_settings", ({ settings }: { settings: Settings }) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return null;
});

// ---- markdown render (browser only; Tauri uses comrak). Lazy so it never ships
//      in the Tauri bundle's main chunk. No data-sourcepos → scroll sync no-ops. ----
registerMock("render_markdown", async ({ md }: { md: string }) => {
  const { marked } = await import("marked");
  return marked.parse(md, { gfm: true, async: false }) as string;
});

// ---- mock vault filesystem (browser only) ----
interface MFile {
  kind: "file";
  content: string;
}
interface MDir {
  kind: "dir";
  children: Record<string, MNode>;
}
type MNode = MFile | MDir;

const VAULT_ROOT = "/Users/you/Notes";
const T0 = 1_750_000_000_000;

const f = (content: string): MFile => ({ kind: "file", content });
const d = (children: Record<string, MNode>): MDir => ({ kind: "dir", children });

const VAULT: MDir = d({
  "Welcome.md": f(
    "# Welcome to Velq\n\nThis is just a folder on your computer — your files stay plain Markdown.\n\n- **Select this sentence** to format it.\n- Press **Space** on a file to preview it.\n- Click the **↺** clock to see your version history.\n\n> Delete this note whenever you like.\n",
  ),
  "README.md": f("# Notes\n\nA sample vault for trying Velq.\n"),
  Drafts: d({
    "Launch announcement.md": f(
      "# Launch announcement\n\nVelq is a calm Markdown & HTML editor that packages documents into `.velq`.\n\n## Key points\n\n- Offline-first\n- Save history, no git knowledge required\n",
    ),
    "Untitled.md": f("# Untitled\n\nStart writing…\n"),
  }),
  Clients: d({
    Acme: d({ "Brief.md": f("# Acme brief\n\n- [ ] Kickoff\n- [ ] Draft\n- [ ] Review\n") }),
    Globex: d({ "Meeting.md": f("# Globex meeting\n\nDiscussed the rollout plan.\n") }),
  }),
  Ideas: d({
    "velq format.md": f(
      "# The .velq format\n\nA ZIP container — rename to `.zip` and it just opens.\n\n```\nmanifest.json\nindex.html\nassets/\n```\n",
    ),
  }),
  "Release notes.html": f(
    '<!doctype html>\n<html><head><meta charset="utf-8"><title>Release notes</title></head>\n<body><h1>v1.0</h1><p>Velq is here.</p></body></html>\n',
  ),
});

function resolve(path: string): MNode | null {
  if (path === VAULT_ROOT) return VAULT;
  if (!path.startsWith(`${VAULT_ROOT}/`)) return null;
  const parts = path.slice(VAULT_ROOT.length + 1).split("/");
  let node: MNode = VAULT;
  for (const part of parts) {
    if (node.kind !== "dir" || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

function extOf(name: string): string | null {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1) : null;
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function parentDirOf(path: string): MDir | null {
  const parent = path.slice(0, path.lastIndexOf("/"));
  const node = resolve(parent);
  return node?.kind === "dir" ? node : null;
}

function toFileNode(path: string, name: string, node: MNode, i = 0) {
  return {
    path,
    name,
    kind: node.kind,
    ext: node.kind === "file" ? extOf(name) : null,
    size: node.kind === "file" ? node.content.length : 0,
    mtime: T0 - i * 86_400_000,
    created: T0 - i * 86_400_000,
    gitStatus: "none",
    hasChildren: node.kind === "dir" && Object.keys(node.children).length > 0,
  };
}

function uniqueName(dir: MDir, name: string): string {
  if (!dir.children[name]) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (dir.children[`${stem} ${i}${ext}`]) i += 1;
  return `${stem} ${i}${ext}`;
}

registerMock("open_vault", ({ path }: { path: string }) => ({
  path: path || VAULT_ROOT,
  name: (path || VAULT_ROOT).split("/").filter(Boolean).pop(),
}));

registerMock("read_dir", ({ path }: { path: string }) => {
  const node = resolve(path);
  if (node?.kind !== "dir") return [];
  const entries = Object.entries(node.children).map(([name, child], i) =>
    toFileNode(`${path}/${name}`, name, child, i),
  );
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  return entries;
});

registerMock("read_file", ({ path }: { path: string }) => {
  const node = resolve(path);
  if (node?.kind !== "file") throw new Error(`mock: not a file: ${path}`);
  return { content: node.content, encoding: "utf-8", mtime: T0 };
});

function stripMd(line: string): string {
  return line
    .replace(/^[#>\-*+\s\t]+/, "")
    .replace(/[*`_#]/g, "")
    .trim();
}
function textPreview(content: string): { title: string | null; snippet: string | null } {
  const lines = content.split("\n").slice(0, 40).map(stripMd).filter(Boolean);
  const title = lines[0] ?? null;
  const rest = lines.slice(1, 4).join(" ");
  const snippet = rest ? (rest.length > 160 ? `${rest.slice(0, 160)}…` : rest) : null;
  return { title, snippet };
}

registerMock("preview_dir", ({ path }: { path: string }) => {
  const node = resolve(path);
  if (node?.kind !== "dir") return [];
  const entries = Object.entries(node.children).map(([name, child], i) => {
    const fn = toFileNode(`${path}/${name}`, name, child, i);
    const textish = child.kind === "file" && /\.(md|markdown|txt)$/i.test(name);
    const { title, snippet } =
      textish && child.kind === "file"
        ? textPreview(child.content)
        : { title: null, snippet: null };
    return { node: fn, title, snippet };
  });
  entries.sort((a, b) => {
    if (a.node.kind !== b.node.kind) return a.node.kind === "dir" ? -1 : 1;
    return a.node.name.toLowerCase().localeCompare(b.node.name.toLowerCase());
  });
  return entries;
});

registerMock(
  "search_filenames",
  ({ query, scope, limit }: { query: string; scope: string; limit?: number }) => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    const root = resolve(scope);
    if (root?.kind !== "dir") return [];
    const out: { node: ReturnType<typeof toFileNode>; score: number }[] = [];
    const walk = (dir: MDir, dirPath: string) => {
      for (const [name, child] of Object.entries(dir.children)) {
        if (name.startsWith(".")) continue;
        const path = `${dirPath}/${name}`;
        const lname = name.toLowerCase();
        const pos = lname.indexOf(q);
        if (pos >= 0) {
          let score = 60 - Math.min(pos, 50);
          if (pos === 0) score += 100;
          else if (!/[a-z0-9]/.test(lname[pos - 1] ?? "")) score += 40;
          out.push({ node: toFileNode(path, name, child), score });
        }
        if (child.kind === "dir") walk(child, path);
      }
    };
    walk(root, scope);
    out.sort((a, b) => b.score - a.score || a.node.name.length - b.node.name.length);
    return out.slice(0, limit ?? 60).map((o) => o.node);
  },
);

registerMock("recent_files", ({ root, limit }: { root: string; limit?: number }) => {
  const start = resolve(root);
  if (start?.kind !== "dir") return [];
  const out: ReturnType<typeof toFileNode>[] = [];
  const walk = (dir: MDir, dirPath: string) => {
    let i = 0;
    for (const [name, child] of Object.entries(dir.children)) {
      if (name.startsWith(".")) continue;
      const path = `${dirPath}/${name}`;
      if (child.kind === "dir") walk(child, path);
      else out.push(toFileNode(path, name, child, i++));
    }
  };
  walk(start, root);
  out.sort((a, b) => b.created - a.created);
  return out.slice(0, limit ?? 12);
});

registerMock("ensure_default_vault", () => ({
  path: VAULT_ROOT,
  name: VAULT_ROOT.split("/").filter(Boolean).pop(),
}));

registerMock("import_file", ({ src, destDir }: { src: string; destDir: string }) => {
  const dir = resolve(destDir);
  if (dir?.kind !== "dir") throw new Error("mock: no dest dir");
  const name = uniqueName(dir, basename(src));
  dir.children[name] = f(`(imported ${basename(src)})`);
  return toFileNode(`${destDir}/${name}`, name, dir.children[name]);
});

registerMock("write_file", ({ path, content }: { path: string; content: string }) => {
  const node = resolve(path);
  if (node?.kind === "file") node.content = content;
  return T0;
});

registerMock("create_file", ({ parentPath, name }: { parentPath: string; name: string }) => {
  const dir = resolve(parentPath);
  if (dir?.kind !== "dir") throw new Error("mock: no parent dir");
  const uname = uniqueName(dir, name);
  dir.children[uname] = f("");
  return toFileNode(`${parentPath}/${uname}`, uname, dir.children[uname]);
});

registerMock("create_folder", ({ parentPath, name }: { parentPath: string; name: string }) => {
  const dir = resolve(parentPath);
  if (dir?.kind !== "dir") throw new Error("mock: no parent dir");
  const uname = uniqueName(dir, name);
  dir.children[uname] = d({});
  return toFileNode(`${parentPath}/${uname}`, uname, dir.children[uname]);
});

function moveMock({ from, to }: { from: string; to: string }) {
  const node = resolve(from);
  const fromParent = parentDirOf(from);
  const toParent = parentDirOf(to);
  if (!node || !fromParent || !toParent) throw new Error("mock: bad move path");
  if (toParent.children[basename(to)]) throw new Error("An item with that name already exists.");
  delete fromParent.children[basename(from)];
  toParent.children[basename(to)] = node;
  return toFileNode(to, basename(to), node);
}
registerMock("rename_path", moveMock);
registerMock("move_path", moveMock);

registerMock("delete_path", ({ path }: { path: string }) => {
  const parent = parentDirOf(path);
  if (parent) delete parent.children[basename(path)];
  return null;
});

registerMock("reveal_in_os", () => null);
registerMock("watch_vault", () => null);
registerMock("unwatch_vault", () => null);
registerMock("write_file_binary", () => 0);
registerMock("open_velq_viewer", () => null);
registerMock(
  "stage_velq",
  () =>
    `data:text/html,${encodeURIComponent('<body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0"><p>.velq preview (mock)</p></body>')}`,
);
registerMock("unpack_velq", () => null);
registerMock("bundle_to_velq", () => ({ collected: 4, bytes: 28_540, failed: [] }));
registerMock("bundle_html_to_velq", () => ({ collected: 4, bytes: 28_540, failed: [] }));
registerMock("read_velq_manifest", () => ({
  title: "Demo",
  created: 0,
  updated: 0,
  sourceUrl: null,
  generator: "velq-core",
  tags: [],
  custom: null,
}));

// ---- save history (browser only; Tauri uses git2) ----
interface MVersion {
  id: string;
  time: number;
  label: string | null;
  summary: string;
  content: string;
}
const history = new Map<string, MVersion[]>();
let vseq = 0;

function summarizeLines(oldText: string, newText: string): string {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const setA = new Set(a);
  const setB = new Set(b);
  let added = 0;
  let removed = 0;
  for (const l of b) if (!setA.has(l)) added++;
  for (const l of a) if (!setB.has(l)) removed++;
  if (!added && !removed) return "No changes";
  if (added && !removed) return `${added} line${added === 1 ? "" : "s"} added`;
  if (!added && removed) return `${removed} line${removed === 1 ? "" : "s"} removed`;
  return `${added} added · ${removed} removed`;
}

function pushVersion(path: string, content: string, label: string | null): MVersion {
  const prev = history.get(path) ?? [];
  const old = prev.length ? prev[0].content : "";
  vseq += 1;
  const v: MVersion = {
    id: `v${vseq}`,
    time: Math.floor(Date.now() / 1000),
    label,
    summary: summarizeLines(old, content),
    content,
  };
  history.set(path, [v, ...prev]);
  return v;
}

// Seed a few versions for Welcome.md so the history demo is populated.
(() => {
  const p = `${VAULT_ROOT}/Welcome.md`;
  pushVersion(p, "# Welcome to Velq\n\nThis is just a folder on your computer.\n", null);
  pushVersion(
    p,
    "# Welcome to Velq\n\nThis is just a folder on your computer — your files stay plain Markdown.\n\n- Select this sentence to format it.\n",
    null,
  );
  const file = resolve(p);
  if (file?.kind === "file") pushVersion(p, file.content, null);
  const seeded = history.get(p);
  if (seeded) {
    const now = Math.floor(Date.now() / 1000);
    seeded[0].time = now - 90; // newest, ~1m ago
    seeded[1].time = now - 1800; // 30m ago
    seeded[2].time = now - 3600; // 1h ago
  }
})();
const pub = (v: MVersion) => ({ id: v.id, time: v.time, label: v.label, summary: v.summary });

registerMock("init_history", () => null);

registerMock("save_version", ({ path, content }: { path: string; content: string }) => {
  const node = resolve(path);
  if (node?.kind === "file") node.content = content;
  return pub(pushVersion(path, content, null));
});

registerMock("list_versions", ({ path }: { path: string }) => (history.get(path) ?? []).map(pub));

registerMock("version_content", ({ path, versionId }: { path: string; versionId: string }) => {
  const v = (history.get(path) ?? []).find((x) => x.id === versionId);
  if (!v) throw new Error("mock: no such version");
  return v.content;
});

registerMock("restore_version", ({ path, versionId }: { path: string; versionId: string }) => {
  const v = (history.get(path) ?? []).find((x) => x.id === versionId);
  if (!v) throw new Error("mock: no such version");
  const node = resolve(path);
  if (node?.kind === "file") node.content = v.content;
  return pub(pushVersion(path, v.content, null));
});
