/**
 * All landing-page copy, EN and JA. The JA text is written as Japanese copy,
 * not translated English — keep it that way when editing.
 */

export interface Feature {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  shot: string;
  alt: string;
}

export interface Copy {
  lang: "en" | "ja";
  htmlLang: string;
  meta: { title: string; description: string; ogImage: string };
  nav: {
    features: string;
    velq: string;
    download: string;
    faq: string;
    lang: { label: string; href: string; title: string };
    cta: string;
  };
  hero: {
    h1a: string;
    h1b: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    note: string;
    shot: string;
    alt: string;
  };
  why: {
    kicker: string;
    title: string;
    items: { icon: string; q: string; a: string }[];
  };
  pillars: {
    title: string;
    sub: string;
    items: { icon: string; title: string; body: string }[];
  };
  features: Feature[];
  velq: {
    kicker: string;
    title: string;
    sub: string;
    steps: { icon: string; title: string; body: string }[];
    treeTitle: string;
    zip: { title: string; body: string };
    sandbox: { title: string; body: string };
    illoAlt: string;
    sandboxAlt: string;
  };
  details: {
    title: string;
    sub: string;
    items: { icon: string; title: string; body: string }[];
  };
  faq: { title: string; items: { q: string; a: string }[] };
  download: {
    title: string;
    sub: string;
    cards: { os: string; meta: string; cta: string; key: "mac" | "win" | "linux" }[];
    autoCta: string;
    note: string;
  };
  cta: { line: string; button: string; secondary: string };
  footer: { legal: string; links: { label: string; href: string }[] };
}

export const GITHUB = "https://github.com/iKora128/velq";
export const RELEASES = `${GITHUB}/releases/latest`;
export const RELEASES_API = "https://api.github.com/repos/iKora128/velq/releases/latest";

export const en: Copy = {
  lang: "en",
  htmlLang: "en",
  meta: {
    title: "Velq — open, edit and carry the Markdown & HTML your AI writes. One offline file.",
    description:
      "Velq opens the Markdown & HTML your AI writes — no browser tab — and lets you edit against the real rendered page. Pack documents with their dependencies into one offline .velq, keep a save history without git. Free & open source for macOS, Windows and Linux.",
    ogImage: "/og-en.png",
  },
  nav: {
    features: "Features",
    velq: ".velq",
    download: "Download",
    faq: "FAQ",
    lang: { label: "日本語", href: "/ja/", title: "日本語版を開く" },
    cta: "Download",
  },
  hero: {
    h1a: "Write in calm.",
    h1b: "Share it whole.",
    lede:
      "Velq opens the Markdown &amp; HTML your AI writes — no browser tab — and lets you edit while looking at the real rendered page. Then pack it, dependencies and all, into one <code>.velq</code> that survives moved folders and missing networks.",
    ctaPrimary: "Download for macOS",
    ctaSecondary: "View on GitHub",
    note: "Free & open source · Apache-2.0 · macOS / Windows / Linux · auto-updates",
    shot: "/shots/hero-en.webp",
    alt: "The Velq window: folder tree, document list, and a live-formatted Markdown document",
  },
  why: {
    kicker: "Why Velq",
    title: "Your AI writes Markdown & HTML now. Then what?",
    items: [
      {
        icon: "globe",
        q: "A browser tab, just to read a file?",
        a: "Velq opens .md and .html like documents. Double-click in the file manager, read, done — no server, no tab.",
      },
      {
        icon: "pen-line",
        q: "Browsers can't edit.",
        a: "Velq can. The rendered page itself is the editor — type, add a paragraph, hit ⌘B — and every edit writes back into the .html source.",
      },
      {
        icon: "package",
        q: "Move the folder, lose the images.",
        a: "Pack the document with its CSS, scripts, images and fonts into one .velq. Paths change, networks vanish — it still opens.",
      },
    ],
  },
  pillars: {
    title: "Three things, done properly.",
    sub: "An editor, a file manager, and a memory. Nothing extra — each one polished.",
    items: [
      {
        icon: "pen-line",
        title: "An editor that stays out of the way",
        body: "Source, Split, or Typora-style Live: headings, tables, task lists and code format in place while the active line stays raw Markdown — and .html opens as the page itself, editable in place.",
      },
      {
        icon: "folder-tree",
        title: "A file manager you already know",
        body: "Your vault is a real folder on disk. Tree, previewed list, Miller columns, icon grid — with Quick Look on Space and inline rename.",
      },
      {
        icon: "history",
        title: "Every save is a version",
        body: "Velq quietly keeps versions as you save. Browse them, see what changed word by word, and restore without losing anything.",
      },
    ],
  },
  features: [
    {
      kicker: "Markdown & HTML",
      title: "A browser shows HTML. Velq edits it.",
      body: "Open the HTML your AI wrote and it appears as the page it is — then just edit it. Type into the rendered page, add paragraphs, bold with ⌘B; Velq writes each change back to the right place in the source and leaves every other byte untouched. Markdown gets the same treatment, Typora-style. Saving writes plain .html / .md — no conversion, nothing proprietary.",
      points: [
        "HTML: the rendered page is the editor — text, paragraphs, ⌘B/I/U, all written back to source",
        "Markdown: write in the rendered view itself (WYSIWYG Live mode)",
        "Prefer code? Source and Split (source + live page) are one toggle away",
      ],
      shot: "/shots/html-en.webp",
      alt: "Velq editing an HTML file: highlighted source beside the live-rendered page",
    },
    {
      kicker: "File manager",
      title: "Files stay files.",
      body: "No import, no database, no lock-in. Velq works directly on a folder of plain .md and .html — what you see in the app is exactly what sits on disk.",
      points: [
        "Icon, list and column views, plus Quick Look on Space",
        "Spring-loaded drag &amp; drop, inline rename, always-visible search",
        "Open the same folder with any other app, any time",
      ],
      shot: "/shots/files-en.webp",
      alt: "Velq's icon grid view showing folders and files with colorful type icons",
    },
    {
      kicker: "Save history",
      title: "Turn back time. No git required.",
      body: "Every save becomes a version — no commits, no branches, no jargon. See exactly what changed between any two moments, word by word, and restore non-destructively.",
      points: [
        "GitHub-quality, word-level “what changed” view",
        "One-click restore that never erases the present",
        "A real version engine underneath — invisible on the surface",
      ],
      shot: "/shots/history.webp",
      alt: "Velq's version history panel and a word-level diff of a Markdown document",
    },
    {
      kicker: "Command palette",
      title: "Everything is one keystroke away.",
      body: "⌘K opens commands, ⌘P jumps to any file. Switch views, themes and Vim mode without leaving the keyboard.",
      points: [
        "Fuzzy file switcher",
        "Every command searchable",
        "Built-in shortcut cheat-sheet",
      ],
      shot: "/shots/palette.webp",
      alt: "Velq's command palette listing commands with keyboard shortcuts",
    },
  ],
  velq: {
    kicker: "The .velq format",
    title: "One file that carries everything.",
    sub: "Export any document — Markdown or HTML — as a single .velq that keeps working with no network, indefinitely.",
    steps: [
      {
        icon: "archive",
        title: "Collect",
        body: "CSS, JavaScript, images and fonts are gathered — including the ones loaded from CDNs.",
      },
      {
        icon: "file-code",
        title: "Rewrite",
        body: "Every reference is rewritten to its bundled copy, de-duplicated by content hash.",
      },
      {
        icon: "shield-check",
        title: "Sealed",
        body: "It opens in a zero-permission viewer: JavaScript runs, but your files and network stay untouched.",
      },
    ],
    treeTitle: "document.velq",
    zip: {
      title: "No magic inside — it's a ZIP.",
      body: "Rename <code>document.velq</code> to <code>.zip</code> and look for yourself: a manifest, an <code>index.html</code>, an assets folder. An open format means your documents outlive any app — including this one.",
    },
    sandbox: {
      title: "Offline isn't a fallback. It's the contract.",
      body: "A .velq opens in an isolated, permission-zero window. No network calls, no file access — on a plane, in ten years, on a machine that never saw the original page.",
    },
    illoAlt: "Diagram: CSS, JS, images and fonts flowing from a web page into a single .velq file",
    sandboxAlt: "Illustration: a document sealed inside a glass dome, with wifi and cloud crossed out",
  },
  details: {
    title: "And the quiet details",
    sub: "The small things you notice after a week, not in a demo.",
    items: [
      { icon: "moon-star", title: "Dark & light", body: "Follows the system, or your pick." },
      { icon: "puzzle", title: "Plugins are just extensions", body: "KaTeX & Mermaid ship as references." },
      { icon: "file-down", title: "PDF export", body: "Markdown, HTML, .velq or PDF." },
      { icon: "square-terminal", title: "Vim mode", body: "One toggle away." },
      { icon: "languages", title: "English & 日本語", body: "Fully localized UI." },
      { icon: "refresh-cw", title: "Auto-updates", body: "New releases install themselves." },
      { icon: "laptop-minimal", title: "Cross-platform", body: "macOS, Windows and Linux." },
      { icon: "accessibility", title: "WCAG-AA text", body: "Reduced-motion aware, too." },
      { icon: "files", title: "Plain files on disk", body: "No proprietary silo." },
      { icon: "keyboard", title: "Keyboard-first", body: "Every action has a shortcut." },
      { icon: "wifi-off", title: "Offline-first", body: "No account. No cloud required." },
      { icon: "badge-check", title: "Open source", body: "Apache-2.0, plugins exempt." },
    ],
  },
  faq: {
    title: "Questions, answered",
    items: [
      {
        q: "Is Velq free?",
        a: "Yes — free and open source under Apache-2.0. Clearly-separated paid AI services may come later, but the editor itself stays free.",
      },
      {
        q: "Where do my files live?",
        a: "In a normal folder on your disk, as plain .md / .html. Rename them, sync them, open them in other apps — Velq never imports or locks anything.",
      },
      {
        q: "Do I need to know git?",
        a: "No. You'll never see “commit” or “branch”. You save; Velq remembers versions; you restore when you need to.",
      },
      {
        q: "Can someone without Velq open a .velq?",
        a: "Yes. It's a ZIP container — rename it to .zip and every file is right there. The nicest experience is Velq's sandboxed offline viewer, though.",
      },
      {
        q: "Which platforms are supported?",
        a: "macOS (Apple Silicon & Intel), Windows 64-bit, and Linux (.AppImage / .deb), all with automatic updates. Velq is early 0.x — macOS is the platform it's developed and used on daily.",
      },
      {
        q: "Does my writing leave my machine?",
        a: "No. Velq works fully offline; your documents stay on your disk unless you choose to share them.",
      },
    ],
  },
  download: {
    title: "Get Velq",
    sub: "Download once. It keeps itself up to date.",
    cards: [
      { os: "macOS", meta: "Apple Silicon · .dmg", cta: "Download .dmg", key: "mac" },
      { os: "Windows", meta: "64-bit · .msi / .exe", cta: "Download", key: "win" },
      { os: "Linux", meta: ".AppImage / .deb", cta: "Download", key: "linux" },
    ],
    autoCta: "Download for %s",
    note: "Early 0.x — macOS is the daily-driven platform; Windows and Linux ship from the same CI.",
  },
  cta: {
    line: "Calm is a feature.",
    button: "Download Velq",
    secondary: "Star on GitHub",
  },
  footer: {
    legal: "© 2026 Velq · Apache-2.0 (plugin exception)",
    links: [
      { label: "GitHub", href: GITHUB },
      { label: "Releases", href: `${GITHUB}/releases` },
      { label: "Plugin API", href: `${GITHUB}/blob/main/docs/plugin-api.md` },
      { label: "License", href: `${GITHUB}/blob/main/LICENSE` },
    ],
  },
};

export const ja: Copy = {
  lang: "ja",
  htmlLang: "ja",
  meta: {
    title: "Velq(ヴェルク)— AI が書いた Markdown / HTML を見たまま編集、1 ファイルで持ち運ぶ",
    description:
      "Velq(ヴェルク)は、AI が書き出す Markdown / HTML をブラウザなしで開いて、見たまま編集できる無料のデスクトップアプリ。依存ファイルごと 1 つの .velq にまとめれば、パスが変わってもオフラインでもそのまま開けます。Git いらずの保存履歴つき。macOS / Windows / Linux 対応。",
    ogImage: "/og-ja.png",
  },
  nav: {
    features: "機能",
    velq: ".velq とは",
    download: "ダウンロード",
    faq: "よくある質問",
    lang: { label: "English", href: "/", title: "Open the English version" },
    cta: "ダウンロード",
  },
  hero: {
    h1a: "静かに書いて、",
    h1b: "まるごと届ける。",
    lede:
      "Velq(ヴェルク)は、AI が書き出す Markdown / HTML をブラウザなしでそのまま開いて、見たまま編集できるデスクトップアプリ。仕上げは依存ファイルごと 1 つの <code>.velq</code> に。パスが変わっても、ネットがなくても、そのまま開けます。",
    ctaPrimary: "macOS 版をダウンロード",
    ctaSecondary: "GitHub で見る",
    note: "無料・オープンソース(Apache-2.0)· macOS / Windows / Linux · 自動アップデート",
    shot: "/shots/hero-ja.webp",
    alt: "Velq のウィンドウ:フォルダツリー、ドキュメント一覧、整形されつつある Markdown 文書",
  },
  why: {
    kicker: "なぜ Velq?",
    title: "AI が書いた HTML、そのままにしていませんか。",
    items: [
      {
        icon: "globe",
        q: "読むためだけに、ブラウザ?",
        a: "Velq なら .md / .html をドキュメントとして開けます。ファイルマネージャからダブルクリック、それだけ。サーバもタブも不要です。",
      },
      {
        icon: "pen-line",
        q: "ブラウザでは、直せない。",
        a: "Velq は直せます。描画されたページそのものが編集画面 — 文章を打ち、段落を足し、⌘B で太字に。すべて HTML ソースの正しい位置へ書き戻されます。",
      },
      {
        icon: "package",
        q: "フォルダを移すと、画像が消える。",
        a: "CSS・スクリプト・画像・フォントごと 1 つの .velq に梱包。パスが変わっても、オフラインでも、そのまま開きます。",
      },
    ],
  },
  pillars: {
    title: "3 つのことを、ちゃんと。",
    sub: "エディタ、ファイル管理、そして記憶。余計なものは足さず、それぞれを磨きました。",
    items: [
      {
        icon: "pen-line",
        title: "邪魔をしないエディタ",
        body: "ソース・分割・見たままの 3 モード。見出しも表も入力と同時に整形され、カーソル行だけは生の Markdown のまま。.html は描画されたページのまま、その場で編集できます。",
      },
      {
        icon: "folder-tree",
        title: "Finder の手癖で使えるファイル管理",
        body: "保管庫の正体は、ただのフォルダ。ツリー、プレビュー付きリスト、カラム、アイコングリッド。Space でクイックルック、その場でリネーム。",
      },
      {
        icon: "history",
        title: "保存するたび、バージョンが残る",
        body: "保存のたびに静かに記録。いつでも見比べて、何も失わずに元へ戻せます。コミットという言葉は出てきません。",
      },
    ],
  },
  features: [
    {
      kicker: "Markdown & HTML",
      title: "ブラウザは表示するだけ。Velq は、直せる。",
      body: "AI が書き出した HTML を開くと、ページはページのまま現れます。そのまま打てば、その場で直る — 段落を足しても、⌘B で太字にしても、Velq がソースの正しい位置へ書き戻し、それ以外は 1 バイトも動かしません。Markdown も同じ思想の Typora 型 WYSIWYG。保存されるのはプレーンな .html / .md で、変換も独自形式もありません。",
      points: [
        "HTML:描画されたページがそのまま編集画面 — 文章・段落・⌘B/I/U をソースへ書き戻し",
        "Markdown:描画された画面にカーソルを置いて、そのまま書く(Live / WYSIWYG)",
        "コードで直したいときは、ソース表示と分割表示にワンクリックで切替",
      ],
      shot: "/shots/html-ja.webp",
      alt: "Velq で HTML ファイルを編集中:ハイライトされたソースと描画結果を並べた分割ビュー",
    },
    {
      kicker: "ファイル管理",
      title: "ファイルは、ファイルのまま。",
      body: "インポートも独自データベースもありません。Velq が扱うのは、ディスク上のプレーンな .md / .html そのもの。アプリに見えているものが、そのままフォルダの中身です。",
      points: [
        "アイコン・リスト・カラムの 3 表示、Space でクイックルック",
        "スプリングローディング対応のドラッグ&amp;ドロップ、その場リネーム、常時表示の検索",
        "同じフォルダを、いつでも他のアプリで開けます",
      ],
      shot: "/shots/files-ja.webp",
      alt: "Velq のアイコングリッド表示。日本語 UI でフォルダとファイルが並ぶ",
    },
    {
      kicker: "保存履歴",
      title: "「あの時に戻したい」を、いつでも。",
      body: "保存するたびにバージョンが残ります。どこがどう変わったかは単語単位の色分けでひと目で分かり、復元してもいまの内容は消えません。Git の語彙を覚える必要はありません。",
      points: [
        "GitHub 品質の「何が変わったか」表示(単語単位)",
        "ワンクリックの非破壊リストア",
        "中身は本物のバージョン管理エンジン。でもその言葉は画面に出ません",
      ],
      shot: "/shots/history.webp",
      alt: "Velq のバージョン履歴パネルと、単語単位で色分けされた差分表示",
    },
    {
      kicker: "コマンドパレット",
      title: "すべては、⌘K から。",
      body: "⌘K でコマンド、⌘P でファイルへジャンプ。表示の切り替えもテーマも Vim モードも、キーボードから手を離さずに。",
      points: ["あいまい検索のファイルスイッチャ", "全コマンドを検索可能", "ショートカット早見表を内蔵"],
      shot: "/shots/palette.webp",
      alt: "Velq のコマンドパレット。コマンドとショートカットの一覧",
    },
  ],
  velq: {
    kicker: ".velq フォーマット",
    title: "すべてを運ぶ、ひとつのファイル。",
    sub: "Markdown も HTML も、ネットワークなしで動き続ける 1 つの .velq に書き出せます。",
    steps: [
      {
        icon: "archive",
        title: "あつめる",
        body: "CSS・JavaScript・画像・フォントを収集します。CDN から読み込んでいるものも含めて。",
      },
      {
        icon: "file-code",
        title: "つなぎかえる",
        body: "すべての参照を同梱コピーへ書き換え。同じ内容はハッシュでひとつにまとめます。",
      },
      {
        icon: "shield-check",
        title: "とじこめる",
        body: "開くのは権限ゼロの隔離ビューア。JavaScript は動いても、あなたのファイルや通信には届きません。",
      },
    ],
    treeTitle: "document.velq",
    zip: {
      title: "中身は、ただの ZIP。",
      body: "<code>document.velq</code> を <code>.zip</code> にリネームすれば、manifest と <code>index.html</code> と assets がそのまま見えます。開かれたフォーマットだから、ドキュメントはどのアプリよりも長生きします。Velq 自身よりも。",
    },
    sandbox: {
      title: "オフラインは非常手段ではなく、前提。",
      body: ".velq は隔離された権限ゼロのウィンドウで開きます。通信もファイルアクセスも発生しない — 機内でも、10 年後でも、元のページを知らないマシンでも。",
    },
    illoAlt: "図:CSS・JS・画像・フォントがウェブページから 1 つの .velq ファイルへ流れ込む",
    sandboxAlt: "イラスト:ガラスドームに密閉された文書。Wi-Fi とクラウドに打ち消し線",
  },
  details: {
    title: "そして、静かなこだわり",
    sub: "デモでは目立たないけれど、1 週間使うと効いてくるもの。",
    items: [
      { icon: "moon-star", title: "ダーク & ライト", body: "システム追従も、固定も。" },
      { icon: "puzzle", title: "プラグインは“ただの拡張”", body: "KaTeX と Mermaid を参考実装として同梱。" },
      { icon: "file-down", title: "PDF 書き出し", body: "Markdown・HTML・.velq・PDF へ。" },
      { icon: "square-terminal", title: "Vim モード", body: "トグルひとつで。" },
      { icon: "languages", title: "日本語 & English", body: "UI は完全ローカライズ。" },
      { icon: "refresh-cw", title: "自動アップデート", body: "新しいリリースは自動で届く。" },
      { icon: "laptop-minimal", title: "マルチプラットフォーム", body: "macOS・Windows・Linux。" },
      { icon: "accessibility", title: "WCAG-AA", body: "視差軽減設定にも追従。" },
      { icon: "files", title: "ファイルはプレーンなまま", body: "独自形式に閉じ込めない。" },
      { icon: "keyboard", title: "キーボード第一", body: "すべての操作にショートカット。" },
      { icon: "wifi-off", title: "オフラインファースト", body: "アカウント不要。クラウド不要。" },
      { icon: "badge-check", title: "オープンソース", body: "Apache-2.0(プラグインは例外規定)。" },
    ],
  },
  faq: {
    title: "よくある質問",
    items: [
      {
        q: "Velq は無料ですか?",
        a: "はい。Apache-2.0 の無料・オープンソースです。将来、明確に切り離された有料の AI サービスを提供する可能性はありますが、エディタ本体は無料のままです。",
      },
      {
        q: "ファイルはどこに保存されますか?",
        a: "ディスク上のふつうのフォルダに、プレーンな .md / .html として保存されます。リネームも同期も他アプリで開くのも自由。Velq がインポートや囲い込みをすることはありません。",
      },
      {
        q: "Git の知識は必要ですか?",
        a: "不要です。「コミット」や「ブランチ」という言葉は一度も出てきません。あなたは保存するだけ。Velq がバージョンを覚えていて、必要なときに戻せます。",
      },
      {
        q: "Velq を持っていない人も .velq を開けますか?",
        a: "開けます。実体は ZIP コンテナなので、拡張子を .zip に変えれば中のファイルがそのまま取り出せます。いちばん快適なのは Velq のサンドボックス化されたオフラインビューアですが。",
      },
      {
        q: "対応プラットフォームは?",
        a: "macOS(Apple Silicon & Intel)、Windows 64-bit、Linux(.AppImage / .deb)。いずれも自動アップデート付きです。現在 0.x で、日々開発・常用しているのは macOS 版です。",
      },
      {
        q: "書いた内容が外部に送信されることは?",
        a: "ありません。Velq は完全オフラインで動作し、ドキュメントはあなたが共有しない限りディスクの外に出ません。",
      },
    ],
  },
  download: {
    title: "Velq を入手",
    sub: "ダウンロードは一度だけ。あとは自動で最新になります。",
    cards: [
      { os: "macOS", meta: "Apple Silicon · .dmg", cta: ".dmg をダウンロード", key: "mac" },
      { os: "Windows", meta: "64-bit · .msi / .exe", cta: "ダウンロード", key: "win" },
      { os: "Linux", meta: ".AppImage / .deb", cta: "ダウンロード", key: "linux" },
    ],
    autoCta: "%s 版をダウンロード",
    note: "いまは 0.x。日々使い込んでいるのは macOS 版で、Windows / Linux も同じ CI から出荷しています。",
  },
  cta: {
    line: "静けさは、機能です。",
    button: "Velq をダウンロード",
    secondary: "GitHub でスターする",
  },
  footer: {
    legal: "© 2026 Velq · Apache-2.0(プラグイン例外あり)",
    links: [
      { label: "GitHub", href: GITHUB },
      { label: "リリース一覧", href: `${GITHUB}/releases` },
      { label: "プラグイン API", href: `${GITHUB}/blob/main/docs/plugin-api.md` },
      { label: "ライセンス", href: `${GITHUB}/blob/main/LICENSE` },
    ],
  },
};
