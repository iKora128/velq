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
    developers: { label: string; href: string };
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
    developers: { label: "Developers", href: "/developers/" },
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
      kicker: "Markdown",
      title: "Watch your Markdown become a beautiful page.",
      body: "Markdown on the left, a finished page on the right. Headings, tables and code — all set properly, and easy to read. Edit the source and the page keeps up instantly. The ease of writing and the beauty of reading, on one screen.",
      points: [
        "Headings, tables, code and task lists render properly",
        "Source and rendered page side by side — edits show at once",
        "Choose how the page looks with a template",
      ],
      shot: "/shots/md-en.webp",
      alt: "Velq editing Markdown: source on the left, a rendered page with headings and a table on the right",
    },
    {
      kicker: "HTML",
      title: "A browser shows HTML. Velq edits it.",
      body: "Open the HTML your AI wrote and it appears as the page it is, not source code — then just edit it. Type into the rendered page, add paragraphs, bold with ⌘B; Velq writes each change back to the right place in the source and leaves every other byte untouched. Saving writes plain .html; it never converts your file to another format.",
      points: [
        "The rendered page is the editor — text, paragraphs, ⌘B/I/U write back to source",
        "Only what you touch changes; every other byte stays put",
        "Prefer code? Source and Split are one toggle away",
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
    sub: "Easy to miss at first, but they feel right the longer you use it.",
    items: [
      { icon: "moon-star", title: "Dark & light", body: "Follows the system, or your pick." },
      { icon: "file-down", title: "Export", body: "Markdown, HTML or .velq." },
      { icon: "languages", title: "English & 日本語", body: "Fully localized, both ways." },
      { icon: "refresh-cw", title: "Auto-updates", body: "New releases, one click away." },
      { icon: "laptop-minimal", title: "Cross-platform", body: "macOS, Windows and Linux." },
      { icon: "wifi-off", title: "Offline-first", body: "No account. No cloud required." },
      { icon: "badge-check", title: "Open source", body: "Apache-2.0. A free, open format." },
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
        a: "macOS (Apple Silicon), Windows 64-bit, and Linux (.AppImage / .deb), all with automatic updates. Velq is early 0.x — macOS is the platform it's developed and used on daily.",
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
    note: "Early 0.x, in active development.",
  },
  cta: {
    line: "Calm is a feature.",
    button: "Download Velq",
    secondary: "Star on GitHub",
  },
  footer: {
    legal: "© 2026 Velq · Apache-2.0",
    links: [
      { label: "GitHub", href: GITHUB },
      { label: "Releases", href: `${GITHUB}/releases` },
      { label: "Developers", href: "/developers/" },
      { label: "License", href: `${GITHUB}/blob/main/LICENSE` },
    ],
  },
};

export const ja: Copy = {
  lang: "ja",
  htmlLang: "ja",
  meta: {
    title: "Velq(ヴェルク)｜AI が書いた HTML / Markdown を、開いてそのまま直せるエディタ",
    description:
      "Velq(ヴェルク)は、AI が書き出す HTML / Markdown をブラウザなしで開いて、そのまま直せる無料のデスクトップアプリ。画像やフォントごと 1 つの .velq にまとめれば、フォルダを移してもオフラインでも同じ見た目で開けます。Git を知らなくても使える保存履歴つき。macOS / Windows / Linux 対応。",
    ogImage: "/og-ja.png",
  },
  nav: {
    features: "機能",
    velq: ".velq とは",
    download: "ダウンロード",
    faq: "よくある質問",
    developers: { label: "開発者向け", href: "/ja/developers/" },
    lang: { label: "English", href: "/", title: "Open the English version" },
    cta: "ダウンロード",
  },
  hero: {
    h1a: "AI が書いた HTML も Markdown も",
    h1b: "かんたんに開いて、見たまま直せる。",
    lede:
      "ブラウザは表示するだけで、書き換えはできません。Velq なら、開いたページをそのまま直せます。保存してもふつうの .html / .md のままです。",
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
        a: "Velq なら .md や .html をドキュメントとして開けます。ファイルマネージャでダブルクリックするだけ。サーバもタブもいりません。",
      },
      {
        icon: "pen-line",
        q: "ブラウザでは、直せない。",
        a: "Velq なら直せます。表示されたページがそのまま編集画面になり、文章を打っても ⌘B で太字にしても、変えた内容だけが HTML の正しい位置へ書き戻されます。",
      },
      {
        icon: "package",
        q: "フォルダを移すと、画像が消える。",
        a: "画像やフォント、CSS やスクリプトごと 1 つの .velq にまとめられます。フォルダを移しても、ネットがなくても、そのまま開けます。",
      },
    ],
  },
  pillars: {
    title: "エディタも、ファイル管理も、保存履歴も。",
    sub: "この 3 つだけを、余計なものを足さずに一つずつ磨きました。",
    items: [
      {
        icon: "pen-line",
        title: "見たまま直せるエディタ",
        body: "ソース表示、分割表示、見たままの 3 つから選べます。見出しも表も打つそばから整い、カーソルのある行だけは元の Markdown のままです。HTML は表示されたページのまま、その場で直せます。",
      },
      {
        icon: "folder-tree",
        title: "Finder の手癖で使えるファイル管理",
        body: "保管庫の正体は、ただのフォルダです。ツリーやリスト、カラム、アイコン表示を切り替えられて、Space でクイックルック、名前もその場で変えられます。",
      },
      {
        icon: "history",
        title: "保存するたび、バージョンが残る",
        body: "保存するたびに、履歴が静かに残ります。いつでも見比べられて、何も失わずに元へ戻せます。コミットのような言葉は出てきません。",
      },
    ],
  },
  features: [
    {
      kicker: "Markdown",
      title: "書いた Markdown が、美しいページになる。",
      body: "左に Markdown、右に整ったページ。見出しも、表も、コードも、きちんと組まれて、読みやすく描画されます。ソースを直せば、隣のページもその場で追いつきます。書く手軽さも、読む美しさも、ひとつの画面で。",
      points: [
        "見出しや表、コード、チェックリストまで、きちんと組まれて描画",
        "ソースと描画を左右に並べて、直したそばから反映",
        "描画の見た目は、テンプレートで選べる",
      ],
      shot: "/shots/md-ja.webp",
      alt: "Velq で Markdown を編集中。左にソース、右に見出しや表が整った描画ページ",
    },
    {
      kicker: "HTML",
      title: "ブラウザは表示するだけ。Velq なら直せます。",
      body: "AI が書いた HTML を開くと、ソースコードではなく、ページそのものが表示されます。あとは画面を見ながら、その場で直すだけ。段落を足すのも ⌘B で太字にするのも思いのままで、変えたところだけがソースに反映され、ほかは元のまま残ります。保存すれば、開いたときと同じ .html のまま、勝手にほかの形式へ変わることはありません。",
      points: [
        "表示されたページがそのまま編集画面。文字も段落も、⌘B / I / U の装飾もソースへ書き戻す",
        "変えるのは触ったところだけ。ほかは 1 バイトも動かさない",
        "コードで直したいときは、ソース表示や分割表示にワンクリックで",
      ],
      shot: "/shots/html-ja.webp",
      alt: "Velq で HTML ファイルを編集中:ハイライトされたソースと、表示されたページを並べた分割ビュー",
    },
    {
      kicker: "ファイル管理",
      title: "ファイルは、ファイルのまま。",
      body: "インポートも独自データベースもありません。Velq が扱うのは、ディスク上のプレーンな .md や .html そのものです。アプリに見えているものが、そのままフォルダの中身です。",
      points: [
        "アイコン、リスト、カラムの 3 表示に、Space でのクイックルック",
        "スプリングローディング対応のドラッグ&amp;ドロップ、その場リネーム、常時表示の検索",
        "同じフォルダを、いつでも他のアプリで開けます",
      ],
      shot: "/shots/files-ja.webp",
      alt: "Velq のアイコングリッド表示。日本語 UI でフォルダとファイルが並ぶ",
    },
    {
      kicker: "保存履歴",
      title: "戻したいときに、戻せます。",
      body: "保存するたびにバージョンが残ります。どこがどう変わったかは単語単位の色分けでひと目で分かり、元に戻してもいまの内容は消えません。Git の言葉を覚える必要はありません。",
      points: [
        "GitHub 級の、何が変わったかが分かる表示(単語単位)",
        "ワンクリックで戻せて、いまの内容は消えません",
        "中身は本物のバージョン管理の仕組みで、その言葉は画面には出ません",
      ],
      shot: "/shots/history.webp",
      alt: "Velq のバージョン履歴パネルと、単語単位で色分けされた差分表示",
    },
    {
      kicker: "コマンドパレット",
      title: "すべては、⌘K から。",
      body: "⌘K でコマンドを呼び出し、⌘P でファイルへジャンプできます。表示の切り替えも、テーマも、Vim モードも、キーボードから手を離さずに操作できます。",
      points: ["あいまい検索のファイルスイッチャ", "全コマンドを検索可能", "ショートカット早見表を内蔵"],
      shot: "/shots/palette.webp",
      alt: "Velq のコマンドパレット。コマンドとショートカットの一覧",
    },
  ],
  velq: {
    kicker: ".velq フォーマット",
    title: "画像もフォントも、ひとつのファイルに。",
    sub: "Markdown も HTML も、画像やフォント、CSS まで 1 つの .velq にまとめられます。フォルダを移しても、ネットがなくても、同じ見た目のまま開けます。",
    steps: [
      {
        icon: "archive",
        title: "あつめる",
        body: "CSS や JavaScript、画像やフォントを集めます。CDN から読み込んでいるものも含めて、まとめて集めます。",
      },
      {
        icon: "file-code",
        title: "つなぎかえる",
        body: "すべての参照を、同梱したコピーへ書き換えます。同じ内容のファイルは、ハッシュで見分けてひとつにまとめます。",
      },
      {
        icon: "shield-check",
        title: "とじこめる",
        body: "開くのは、権限ゼロの隔離されたビューアです。JavaScript は動きますが、あなたのファイルや通信には手が届きません。",
      },
    ],
    treeTitle: "document.velq",
    zip: {
      title: "中身は、ただの ZIP です。",
      body: "<code>document.velq</code> の拡張子を <code>.zip</code> に変えれば、manifest や <code>index.html</code>、assets フォルダがそのまま見えます。仕様が公開されているので、あなたのドキュメントは Velq より長生きします。",
    },
    sandbox: {
      title: "はじめから、オフラインで開けます。",
      body: ".velq は、隔離された権限ゼロのウィンドウで開きます。通信もファイルアクセスも起きません。飛行機の中でも、10 年後でも、元のページを知らないパソコンでも、同じように開けます。",
    },
    illoAlt: "図:CSS や JS、画像、フォントがウェブページから 1 つの .velq ファイルへ流れ込む",
    sandboxAlt: "イラスト:ガラスドームに密閉された文書。Wi-Fi とクラウドに打ち消し線",
  },
  details: {
    title: "そして、静かなこだわり",
    sub: "目立たないけれど、使い続けるとしっくりくるこだわり",
    items: [
      { icon: "moon-star", title: "ダーク & ライト", body: "システム追従も、固定も。" },
      { icon: "file-down", title: "書き出し", body: "Markdown や HTML、.velq に。" },
      { icon: "languages", title: "日本語 & English", body: "日本語でも安心して使えます。" },
      { icon: "refresh-cw", title: "自動アップデート", body: "ワンクリックで更新。" },
      { icon: "laptop-minimal", title: "マルチプラットフォーム", body: "macOS、Windows、Linux に対応。" },
      { icon: "wifi-off", title: "オフラインファースト", body: "アカウント不要。クラウド不要。" },
      { icon: "badge-check", title: "オープンソース", body: "Apache-2.0。自由で開かれた形式。" },
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
        a: "macOS(Apple Silicon)、Windows 64-bit、Linux(.AppImage / .deb)。いずれも自動アップデート付きです。現在 0.x で、日々開発・常用しているのは macOS 版です。",
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
    note: "現在 0.x、活発に開発中です。",
  },
  cta: {
    line: "AI が書いた文書を、開いて、<br />直して、まるごと運ぶ。",
    button: "Velq をダウンロード",
    secondary: "GitHub でスターする",
  },
  footer: {
    legal: "© 2026 Velq · Apache-2.0",
    links: [
      { label: "GitHub", href: GITHUB },
      { label: "リリース一覧", href: `${GITHUB}/releases` },
      { label: "開発者向け", href: "/ja/developers/" },
      { label: "ライセンス", href: `${GITHUB}/blob/main/LICENSE` },
    ],
  },
};
