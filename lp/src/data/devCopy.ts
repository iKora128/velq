/**
 * Copy for the /developers page (the public .velq spec), EN and JA.
 * Same rule as copy.ts: the JA text is written as Japanese copy, not
 * translated English. Strings may contain inline HTML (<code>, <strong>, <a>).
 */

export interface DevCopy {
  lang: "en" | "ja";
  meta: { title: string; description: string; ogImage: string };
  nav: {
    format: string;
    spec: string;
    conformance: string;
    library: string;
    plugins: string;
    naming: string;
    home: string;
    lang: { label: string; href: string; title: string };
    cta: string;
  };
  hero: {
    kicker: string;
    title: string;
    lede: string;
    chips: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  glance: {
    kicker: string;
    title: string;
    sub: string;
    treeTitle: string;
    roles: { file: string; role: string }[];
    tryIt: string;
  };
  spec: {
    kicker: string;
    title: string;
    status: string;
    rfcNote: string;
    sections: { id: string; title: string; rules: string[] }[];
    manifestTitle: string;
    manifestNote: string;
    manifestCols: { field: string; type: string; default: string; meaning: string };
    manifestRows: { field: string; type: string; default: string; meaning: string }[];
    exampleTitle: string;
  };
  conformance: {
    kicker: string;
    title: string;
    sub: string;
    readers: { title: string; items: string[] };
    writers: { title: string; items: string[] };
    fixture: string;
    badgeLine: string;
  };
  library: {
    kicker: string;
    title: string;
    body: string;
    installTitle: string;
    exampleTitle: string;
    apiTitle: string;
    apiItems: { sig: string; what: string }[];
    portNote: string;
  };
  plugins: {
    kicker: string;
    title: string;
    body: string;
    rules: string[];
    link: string;
  };
  naming: {
    kicker: string;
    title: string;
    sub: string;
    cards: { icon: string; title: string; body: string }[];
  };
  cta: { line: string; button: string; secondary: string };
}

const GITHUB = "https://github.com/iKora128/velq";
const FIXTURE = `${GITHUB}/blob/main/apps/desktop/src-tauri/tests/fixtures/demo.velq`;
const CORE_SRC = `${GITHUB}/blob/main/crates/velq-core/src/lib.rs`;
const PLUGIN_DOC = `${GITHUB}/blob/main/docs/plugin-api.md`;

export const devEn: DevCopy = {
  lang: "en",
  meta: {
    title: "Velq for developers — the .velq format, specified",
    description:
      "The .velq container specification: a plain ZIP with manifest.json, index.html and bundled assets that keeps rendering offline, indefinitely. Plus the velq-core reference crate, a conformance checklist, the plugin API, and the naming policy.",
    ogImage: "/og-en.png",
  },
  nav: {
    format: "At a glance",
    spec: "Specification",
    conformance: "Conformance",
    library: "velq-core",
    plugins: "Plugins",
    naming: "Name & policy",
    home: "Velq",
    lang: { label: "日本語", href: "/ja/developers/", title: "日本語版を開く" },
    cta: "Download",
  },
  hero: {
    kicker: "For developers",
    title: "Build on the .velq format.",
    lede:
      "A <code>.velq</code> is an open, ZIP-based container for documents that must keep rendering offline — on any machine, at any later date. This page is the format's specification, and everything you need to read, write or extend it: the reference Rust crate, a conformance checklist, the plugin API, and the rules around the name.",
    chips: ["ZIP container", "Spec version 1", "Apache-2.0", "application/velq+zip"],
    ctaPrimary: "Read the source",
    ctaSecondary: "Open the spec",
  },
  glance: {
    kicker: "At a glance",
    title: "Four kinds of entry. That's the format.",
    sub: "No custom encoding, no framing tricks. If you can write a ZIP and a JSON object, you can write a .velq.",
    treeTitle: "report.velq",
    roles: [
      { file: "manifest.json", role: "Package metadata — title, timestamps, tags, and a single extension point. Required." },
      { file: "index.html", role: "The document itself, the canonical view. Every reference in it points inside the archive. Required." },
      { file: "index.md", role: "The Markdown source, present only when the package was authored from Markdown. Editors edit this; viewers never need it." },
      { file: "assets/", role: "Everything the document uses: CSS, scripts, images, fonts — deduplicated and referenced by relative path." },
    ],
    tryIt:
      "See for yourself: rename any <code>.velq</code> to <code>.zip</code>, or run <code>unzip -l report.velq</code>. Nothing is hidden — that is the point.",
  },
  spec: {
    kicker: "Specification",
    title: "The .velq container, version 1",
    status: "Stable · shipped by Velq since 0.1 · reference implementation: velq-core",
    rfcNote:
      "“Must” and “should” below are meant the RFC 2119 way: must is what conformance requires, should is what a good implementation does.",
    sections: [
      {
        id: "container",
        title: "1 · Container",
        rules: [
          "A .velq <strong>is a ZIP archive</strong> — magic bytes <code>PK\\x03\\x04</code>, UTF-8 entry names. Writers <strong>must</strong> use only the Stored or Deflate compression methods, so every ZIP tool ever written can open one.",
          "The file extension is <code>.velq</code>. The suggested media type is <code>application/velq+zip</code> (unregistered); in practice the extension is the identifier.",
          "Renaming a .velq to .zip and opening it anywhere is a supported operation, forever. A revision of this format that breaks it will not be called .velq.",
        ],
      },
      {
        id: "entries",
        title: "2 · Entries",
        rules: [
          "A ZIP is a valid .velq <strong>if and only if</strong> its root contains both <code>manifest.json</code> and <code>index.html</code>. There is no other precondition.",
          "<code>index.md</code> is optional. When present, the package is a Markdown package: <code>index.md</code> is the editable source and <code>index.html</code> <strong>must</strong> be a rendering of it.",
          "Every other entry is an asset. Velq's bundler stores them under <code>assets/css|js|img|fonts/</code>, named by a SHA-256 content-hash prefix — that layout is a convention, not a rule. Readers <strong>must not</strong> depend on asset paths beyond “relative, inside the archive”.",
          "Tools that edit an existing package <strong>must</strong> carry over every entry they don't recognize, byte for byte. Unknown files belong to someone else's feature, not to the garbage collector.",
          "When extracting to disk, sanitize entry paths (no absolute paths, no <code>..</code>) — standard ZIP hygiene.",
        ],
      },
      {
        id: "manifest",
        title: "3 · manifest.json",
        rules: [
          "One JSON object, camelCase keys. Every field is optional: missing fields take the defaults below, and readers <strong>must</strong> ignore top-level fields they don't recognize.",
          "Editors <strong>may</strong> drop unknown top-level fields when rewriting — so tool-specific data does <strong>not</strong> go there. It goes under <code>custom</code>, keyed by a name you own (<code>\"com.example.mytool\"</code>), and editors <strong>must</strong> preserve <code>custom</code> untouched.",
        ],
      },
      {
        id: "offline",
        title: "4 · The offline contract",
        rules: [
          "<code>index.html</code> together with the bundled assets <strong>must</strong> render completely with the network unplugged. A conforming writer rewrites every subresource reference — stylesheets, scripts, images, fonts — to a bundled relative path.",
          "Scripts may be included and may run. A viewer <strong>should</strong> open packages in a sandbox that blocks network and file access; Velq's own viewer is an isolated zero-permission WebView with CSP <code>connect-src 'none'</code>.",
        ],
      },
      {
        id: "versioning",
        title: "5 · Versioning & stability",
        rules: [
          "This page specifies <strong>version 1</strong>. Version-1 packages declare no version field.",
          "Changes within version 1 are additive and backward-compatible: a version-1 reader opens every version-1 file, today and in ten years.",
          "If a future revision ever needs to break that promise, it will declare itself in <code>manifest.json</code> (a <code>formatVersion</code> field) and be announced on this page first. There are no silent changes.",
        ],
      },
    ],
    manifestTitle: "Fields",
    manifestNote:
      "Exactly the schema velq-core reads and writes — nothing here is aspirational.",
    manifestCols: { field: "Field", type: "Type", default: "Default", meaning: "Meaning" },
    manifestRows: [
      { field: "title", type: "string", default: "\"Untitled\"", meaning: "Document title, shown by viewers and file managers." },
      { field: "created", type: "number", default: "0", meaning: "Creation time, Unix epoch seconds." },
      { field: "updated", type: "number", default: "0", meaning: "Last-modified time, Unix epoch seconds." },
      { field: "sourceUrl", type: "string · null", default: "null", meaning: "Where the document was packaged from, if it came from a URL." },
      { field: "generator", type: "string", default: "\"velq-core x.y.z\"", meaning: "The tool that wrote the package. Put your own name here." },
      { field: "tags", type: "string[]", default: "[]", meaning: "Free-form labels." },
      { field: "custom", type: "any JSON", default: "null", meaning: "The extension point. Namespace your data by a key you own; editors preserve it verbatim." },
    ],
    exampleTitle: "A complete, valid manifest",
  },
  conformance: {
    kicker: "Conformance",
    title: "“Works with .velq”, defined",
    sub: "Two short checklists. Meet the one that applies to your tool and the claim is yours to make.",
    readers: {
      title: "A conforming reader",
      items: [
        "Opens any ZIP whose root contains manifest.json and index.html — nothing else required.",
        "Displays index.html with every reference resolved from inside the archive, network off.",
        "Ignores manifest fields it doesn't recognize, and survives a manifest of just {}.",
        "Sanitizes entry paths if it extracts to disk.",
      ],
    },
    writers: {
      title: "A conforming writer / editor",
      items: [
        "Writes a plain ZIP (Stored or Deflate) containing manifest.json and index.html.",
        "Rewrites every subresource reference to a bundled, relative path — the file renders offline.",
        "Keeps index.md and index.html in sync when both exist.",
        "Preserves custom and every entry it doesn't understand when editing an existing package.",
        "Adds its own metadata under custom, never as new top-level manifest fields.",
      ],
    },
    fixture: `A known-good sample ships in the repository — <a href="${FIXTURE}">demo.velq</a>, the same fixture Velq's own tests open to prove that scripts run and the sandbox holds. The <a href="${CORE_SRC}">velq-core test suite</a> is the executable form of this checklist: pack → validate → read → edit → re-validate.`,
    badgeLine:
      "Meet the list that applies to you, and you're welcome — encouraged — to say your product <strong>works with .velq</strong>.",
  },
  library: {
    kicker: "Reference implementation",
    title: "velq-core: the format, in ~350 lines of Rust",
    body:
      "The crate Velq itself builds on. Apache-2.0, <code>#![forbid(unsafe_code)]</code>, no Tauri dependency — it links into any Rust program. It is deliberately small: a .velq is a ZIP and a JSON object, and the library refuses to be cleverer than that.",
    installTitle: "Use it",
    exampleTitle: "Write, validate, read",
    apiTitle: "The whole API",
    apiItems: [
      { sig: "pack / pack_md", what: "Write a package — HTML-only, or Markdown source plus its rendered HTML." },
      { sig: "validate", what: "The two-entry check: is this ZIP a .velq?" },
      { sig: "read_manifest / read_index_md / read_file_bytes / read_assets", what: "Read metadata, the Markdown source, or any entry." },
      { sig: "update_index / update_md", what: "Replace the document, keep manifest and assets — written atomically, so a crash never corrupts the package." },
      { sig: "unpack", what: "Extract everything to a folder (the .zip escape hatch, as a function)." },
    ],
    portNote:
      "No Rust in your stack? The format needs none: ZIP plus JSON is a standard library away in JavaScript, Python, Go or Swift. If you port it, tell us — we'll link it here.",
  },
  plugins: {
    kicker: "Extending the editor",
    title: "Plugins are CodeMirror 6 extensions",
    body:
      "Velq's rendering plugins use the same machinery as the built-in live preview. The core knows nothing about any specific plugin: KaTeX and Mermaid ship as reference plugins written only against the public API, and toggling them off leaves plain Markdown behind. If you can write a CM6 extension, you can write a Velq plugin.",
    rules: [
      "Registration is one call: usePlugins.register({ id, name, extension }) — idempotent, enabled by default.",
      "Enabled plugins live in a single CodeMirror compartment, so toggling never tears down the editor: cursor, undo history and scroll all survive.",
      "House rules: block widgets need a StateField (not a ViewPlugin); skip decorating the active line so the source shows under the cursor; watch data-theme if you render your own colors.",
      "Plugins are their authors' own works — license yours however you choose. Apache-2.0 governs the core, not your extension.",
    ],
    link: `The full guide, with both reference plugins dissected: <a href="${PLUGIN_DOC}">docs/plugin-api.md</a>.`,
  },
  naming: {
    kicker: "Name & policy",
    title: "Fork the code. Not the meaning of “.velq”.",
    sub: "The format only stays useful if a .velq opens everywhere. Here is exactly what's free and what's reserved.",
    cards: [
      {
        icon: "badge-check",
        title: "The code is Apache-2.0",
        body: "Use it, embed it, modify it, sell what you build — commercially, without asking, patent grant included. This applies to velq-core, the bundler, and the app.",
      },
      {
        icon: "lock-keyhole",
        title: "The name identifies this project",
        body: "Apache-2.0 §6 licenses no trademarks: “Velq” — the word and the mark — stays with the project. Say “works with .velq” or “built on velq-core” freely and truthfully; don't call a product or fork “Velq”, or anything confusingly close.",
      },
      {
        icon: "shield-check",
        title: "The format is stewarded here",
        body: "Spec changes land on this page before they land in code, additively within version 1. Extensions belong in custom. A dialect that breaks the checklist isn't a .velq — call it something else.",
      },
    ],
  },
  cta: {
    line: "Ship something that speaks .velq.",
    button: "Read the source",
    secondary: "Tell us what you built",
  },
};

export const devJa: DevCopy = {
  lang: "ja",
  meta: {
    title: "開発者向け — .velq フォーマット仕様 | Velq",
    description:
      ".velq コンテナの公開仕様。実体は manifest.json と index.html とアセットを収めたただの ZIP で、ネットワークなしで描画され続けます。リファレンス実装 velq-core、準拠チェックリスト、プラグイン API、名称ポリシーもこのページに。",
    ogImage: "/og-ja.png",
  },
  nav: {
    format: "全体像",
    spec: "仕様",
    conformance: "準拠",
    library: "velq-core",
    plugins: "プラグイン",
    naming: "名称と方針",
    home: "Velq",
    lang: { label: "English", href: "/developers/", title: "Open the English version" },
    cta: "ダウンロード",
  },
  hero: {
    kicker: "開発者向け",
    title: ".velq を、あなたのツールにも。",
    lede:
      "<code>.velq</code> は ZIP ベースのオープンなコンテナです。約束はひとつ、どのマシンでも、何年後でも、ネットワークなしで描画され続けること。このページはその仕様書であり、読む・書く・拡張するための道具一式です。リファレンス実装の Rust クレート、準拠チェックリスト、プラグイン API、そして名前にまつわるルール。",
    chips: ["ZIP コンテナ", "仕様バージョン 1", "Apache-2.0", "application/velq+zip"],
    ctaPrimary: "ソースを読む",
    ctaSecondary: "仕様へ",
  },
  glance: {
    kicker: "全体像",
    title: "エントリは、4 種類だけ。",
    sub: "独自エンコードも隠しヘッダもありません。ZIP と JSON が書ければ、.velq は書けます。",
    treeTitle: "report.velq",
    roles: [
      { file: "manifest.json", role: "パッケージのメタデータ。タイトル、日時、タグ、それと拡張ポイントがひとつ。必須。" },
      { file: "index.html", role: "ドキュメント本体であり、正となる表示。中の参照はすべてアーカイブ内を指します。必須。" },
      { file: "index.md", role: "Markdown から作られたパッケージだけが持つ、編集用の原稿。ビューアはこれを読む必要がありません。" },
      { file: "assets/", role: "ドキュメントが使うすべて。CSS・スクリプト・画像・フォントを重複なく収め、相対パスで参照します。" },
    ],
    tryIt:
      "確かめるのは簡単です。<code>.velq</code> を <code>.zip</code> にリネームするか、<code>unzip -l report.velq</code> を実行してください。何も隠れていないことが、この形式の要点です。",
  },
  spec: {
    kicker: "仕様",
    title: ".velq コンテナ 仕様バージョン 1",
    status: "Stable · Velq 0.1 から出荷 · リファレンス実装: velq-core",
    rfcNote:
      "以下の「しなければならない(MUST)」「すべき(SHOULD)」は RFC 2119 の意味で使います。MUST は準拠の条件、SHOULD は良い実装の作法です。",
    sections: [
      {
        id: "container",
        title: "1 · コンテナ",
        rules: [
          ".velq は <strong>ZIP アーカイブそのもの</strong>です。マジックナンバーは <code>PK\\x03\\x04</code>、エントリ名は UTF-8。圧縮方式は Stored か Deflate だけを使わなければなりません(MUST)。世の中のあらゆる ZIP ツールで開けることを守るためです。",
          "拡張子は <code>.velq</code>。メディアタイプは <code>application/velq+zip</code> を推奨します(未登録)。実務上の識別子は拡張子です。",
          "「.zip にリネームすればどこでも開ける」は正式にサポートされた操作で、この先も変わりません。これを壊す改訂は .velq を名乗りません。",
        ],
      },
      {
        id: "entries",
        title: "2 · エントリ",
        rules: [
          "ルートに <code>manifest.json</code> と <code>index.html</code> の両方を含む ZIP だけが、有効な .velq です。条件はそれ以外にありません。",
          "<code>index.md</code> は任意です。存在する場合は Markdown パッケージで、<code>index.md</code> が編集用の原稿、<code>index.html</code> はその描画結果でなければなりません(MUST)。",
          "それ以外のエントリはすべてアセットです。Velq のバンドラは <code>assets/css|js|img|fonts/</code> 配下に SHA-256 のハッシュ名で置きますが、これは慣習であって規則ではありません。リーダーが当てにしてよいのは「相対パスで、アーカイブの中」までです。",
          "既存パッケージを編集するツールは、自分が知らないエントリを 1 バイトも変えずに持ち越さなければなりません(MUST)。知らないファイルは他のツールの機能であって、ゴミではありません。",
          "ディスクへ展開するときはエントリのパスを検査してください(絶対パスと <code>..</code> を拒否する、いつもの ZIP の作法です)。",
        ],
      },
      {
        id: "manifest",
        title: "3 · manifest.json",
        rules: [
          "camelCase キーの JSON オブジェクト 1 つです。フィールドはすべて省略可能で、欠けていれば下表のデフォルトが立ちます。リーダーは知らないトップレベルフィールドを無視しなければなりません(MUST)。",
          "エディタは書き戻し時に知らないトップレベルフィールドを落としても構いません(MAY)。つまりツール固有のデータをトップレベルに置いてはいけません。置き場所は <code>custom</code> の下、あなたが所有する名前(<code>\"com.example.mytool\"</code> など)をキーにして。エディタは <code>custom</code> をそのまま保持しなければなりません(MUST)。",
        ],
      },
      {
        id: "offline",
        title: "4 · オフラインの契約",
        rules: [
          "<code>index.html</code> は同梱アセットだけで完全に描画されなければなりません(MUST)。ネットワークを抜いた状態が基準です。準拠ライターはスタイルシート・スクリプト・画像・フォントへの参照をすべて同梱の相対パスに書き換えます。",
          "スクリプトは同梱してよく、実行されて構いません。ビューアは通信とファイルアクセスを遮断したサンドボックスで開くべきです(SHOULD)。Velq 自身のビューアは権限ゼロの隔離 WebView で、CSP は <code>connect-src 'none'</code> です。",
        ],
      },
      {
        id: "versioning",
        title: "5 · バージョニングと安定性",
        rules: [
          "このページが定めるのは<strong>バージョン 1</strong> です。バージョン 1 のパッケージは、バージョンを宣言しません。",
          "バージョン 1 の中での変更は追加のみで、後方互換です。バージョン 1 のリーダーは、今日の .velq も 10 年後の .velq も開けます。",
          "この約束を破る必要が生じたときは、<code>manifest.json</code> に <code>formatVersion</code> フィールドとして宣言され、先にこのページで告知されます。黙って変わることはありません。",
        ],
      },
    ],
    manifestTitle: "フィールド",
    manifestNote: "velq-core が実際に読み書きしているスキーマそのままです。願望は書いていません。",
    manifestCols: { field: "フィールド", type: "型", default: "デフォルト", meaning: "意味" },
    manifestRows: [
      { field: "title", type: "string", default: "\"Untitled\"", meaning: "ドキュメントのタイトル。ビューアやファイルマネージャが表示します。" },
      { field: "created", type: "number", default: "0", meaning: "作成日時。Unix エポック秒。" },
      { field: "updated", type: "number", default: "0", meaning: "最終更新日時。Unix エポック秒。" },
      { field: "sourceUrl", type: "string · null", default: "null", meaning: "URL から梱包した場合の取得元。" },
      { field: "generator", type: "string", default: "\"velq-core x.y.z\"", meaning: "パッケージを書いたツール名。あなたのツール名を入れてください。" },
      { field: "tags", type: "string[]", default: "[]", meaning: "自由なラベル。" },
      { field: "custom", type: "任意の JSON", default: "null", meaning: "唯一の拡張ポイント。所有する名前で名前空間を切ること。エディタはここを変更せず保持します。" },
    ],
    exampleTitle: "完全かつ有効な manifest の例",
  },
  conformance: {
    kicker: "準拠",
    title: "「.velq 対応」の定義",
    sub: "短いチェックリストが 2 つ。あなたのツールに当てはまる側を満たせば、対応を名乗れます。",
    readers: {
      title: "準拠リーダー",
      items: [
        "ルートに manifest.json と index.html を含む ZIP なら開ける。前提条件はそれだけ。",
        "index.html を、参照をすべてアーカイブ内から解決して、ネットワークなしで表示できる。",
        "知らない manifest フィールドを無視し、中身が {} だけの manifest でも動く。",
        "ディスクへ展開するなら、エントリのパスを検査している。",
      ],
    },
    writers: {
      title: "準拠ライター / エディタ",
      items: [
        "manifest.json と index.html を含むプレーンな ZIP(Stored / Deflate)を書き出す。",
        "サブリソースへの参照をすべて同梱の相対パスへ書き換え、オフラインで描画されるファイルにする。",
        "index.md と index.html が両方あるときは、必ず揃えて更新する。",
        "既存パッケージの編集では、custom と、自分が知らないすべてのエントリを保持する。",
        "自分のメタデータは custom の下に置く。トップレベルには増やさない。",
      ],
    },
    fixture: `既知の正しいサンプルがリポジトリに入っています — <a href="${FIXTURE}">demo.velq</a>。Velq 自身のテストが「スクリプトは動き、サンドボックスは破れない」ことの確認に開いているのと同じフィクスチャです。<a href="${CORE_SRC}">velq-core のテストスイート</a>は、このチェックリストの実行可能版です(pack → validate → read → edit → 再 validate)。`,
    badgeLine:
      "当てはまるリストを満たしたら、どうぞ堂々と<strong>「.velq 対応」</strong>を名乗ってください。歓迎します。",
  },
  library: {
    kicker: "リファレンス実装",
    title: "velq-core: この仕様の実装、Rust で約 350 行",
    body:
      "Velq 本体が土台にしているクレートです。Apache-2.0、<code>#![forbid(unsafe_code)]</code>、Tauri 非依存なので、どんな Rust プログラムにもリンクできます。小ささは意図的なものです。.velq は ZIP と JSON オブジェクトであり、ライブラリはそれ以上に賢くなろうとしません。",
    installTitle: "使う",
    exampleTitle: "書く・検証する・読む",
    apiTitle: "API はこれで全部",
    apiItems: [
      { sig: "pack / pack_md", what: "パッケージを書き出す。HTML のみ、または Markdown 原稿と描画済み HTML のペア。" },
      { sig: "validate", what: "必須 2 エントリの検査。「この ZIP は .velq か?」" },
      { sig: "read_manifest / read_index_md / read_file_bytes / read_assets", what: "メタデータ、Markdown 原稿、任意のエントリを読む。" },
      { sig: "update_index / update_md", what: "ドキュメントだけ差し替えて manifest とアセットは保持。アトミックに書くので、途中で落ちてもパッケージは壊れません。" },
      { sig: "unpack", what: "フォルダへ全展開(「.zip リネーム」の関数版)。" },
    ],
    portNote:
      "スタックに Rust がなくても大丈夫です。このフォーマットは Rust を要求しません。ZIP と JSON は JavaScript でも Python でも Go でも Swift でも標準ライブラリの距離にあります。移植したらぜひ教えてください。ここからリンクします。",
  },
  plugins: {
    kicker: "エディタの拡張",
    title: "プラグイン = CodeMirror 6 拡張",
    body:
      "Velq の描画プラグインは、内蔵のライブプレビューと同じ仕組みで動きます。コアは個々のプラグインを一切知りません。KaTeX と Mermaid は公開 API だけで書かれた参考実装として同梱されていて、オフにすればただの Markdown に戻ります。CM6 拡張が書けるなら、Velq プラグインは書けます。",
    rules: [
      "登録は 1 回の呼び出し: usePlugins.register({ id, name, extension })。id で冪等、登録直後は有効。",
      "有効なプラグインはひとつの CodeMirror compartment に束ねられ、切り替えでエディタは作り直されません。カーソルも取り消し履歴もスクロール位置も生き残ります。",
      "作法は 3 つ。行を丸ごと置き換えるブロックウィジェットは StateField で(ViewPlugin では不可)。選択行の装飾はスキップしてカーソル下ではソースを見せる。自前の色を描くなら data-theme を監視する。",
      "プラグインは作者自身の著作物です。ライセンスは自由に選んでください。Apache-2.0 が縛るのはコアであって、あなたの拡張ではありません。",
    ],
    link: `参考実装 2 つの解剖つきの完全版ガイド: <a href="${PLUGIN_DOC}">docs/plugin-api.md</a>`,
  },
  naming: {
    kicker: "名称と方針",
    title: "コードはフォークしていい。「.velq」の意味は守る。",
    sub: "どこで開いても同じに開ける限りにおいて、この形式には価値があります。自由な範囲と、予約されている範囲を正確に。",
    cards: [
      {
        icon: "badge-check",
        title: "コードは Apache-2.0",
        body: "利用・組み込み・改変・販売、すべて許可不要です。商用も、特許グラント込みで。velq-core にもバンドラにもアプリ本体にも適用されます。",
      },
      {
        icon: "lock-keyhole",
        title: "名前はこのプロジェクトのもの",
        body: "Apache-2.0 §6 は商標を許諾しません。「Velq」の語とロゴはプロジェクトに帰属します。「.velq 対応」「velq-core 製」は事実である限り自由に名乗ってください。製品やフォークに「Velq」や紛らわしい名前を付けるのは不可です。",
      },
      {
        icon: "shield-check",
        title: "フォーマットの管理はここで",
        body: "仕様の変更はコードより先にこのページに載り、バージョン 1 の中では追加だけが行われます。拡張は custom へ。チェックリストを破る方言は .velq ではありません。別の名前でどうぞ。",
      },
    ],
  },
  cta: {
    line: ".velq を話すものを、作ってください。",
    button: "ソースを読む",
    secondary: "作ったものを教える",
  },
};
