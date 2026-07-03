import type { Dict } from "./en";

/**
 * Japanese message catalog. Typed as `Dict`, so it must mirror every key in
 * `en.ts` — the compiler flags any that are missing or extra.
 *
 * 禁止語ルール（英語 UI と同じ）: 「コミット / ブランチ / リポジトリ / マージ / diff」は
 * 訳語にも出さない。代わりに「版 / 保存履歴 / 変更点 / 元に戻す」。
 */
export const ja: Dict = {
  "app.name": "Velq",
  "brand.name": "Velq",

  // ---- 共通 ----
  "common.open": "開く",
  "common.close": "閉じる",
  "common.undo": "元に戻す",
  "common.loading": "読み込み中…",
  "common.files": "ファイル",
  "common.folders": "フォルダ",
  "common.newDoc": "新規ドキュメント",
  "common.newFolder": "新規フォルダ",
  "common.openFolder": "フォルダを開く",
  "common.clearSearch": "検索をクリア",
  "common.toggleTheme": "テーマを切り替え",
  "common.toggleDensity": "表示密度を切り替え",
  "common.toggleSidebar": "サイドバーを切り替え",
  "common.versionHistory": "保存履歴",
  "common.settings": "設定",

  // ---- 設定画面 ----
  "settings.title": "設定",
  "settings.general": "全般",
  "settings.general.desc": "言語と基本の設定。",
  "settings.language": "言語",
  "settings.language.desc": "Velq のメニューやボタンで使う言語。",
  "settings.language.system": "システムに合わせる",
  "settings.language.en": "English",
  "settings.language.ja": "日本語",
  "settings.appearance": "外観",
  "settings.appearance.desc": "書いている間の Velq の見た目。",
  "settings.theme": "テーマ",
  "settings.theme.light": "ライト",
  "settings.theme.dark": "ダーク",
  "settings.theme.system": "システム",
  "settings.density": "表示密度",
  "settings.density.hint": "ファイル一覧やツリーの行間。",
  "settings.density.comfortable": "ゆったり",
  "settings.density.compact": "コンパクト",
  "settings.readingFont": "読みやすいフォント",
  "settings.readingFont.hint": "本文をセリフ体で表示する。",
  "settings.editor": "エディタ",
  "settings.editor.desc": "書くときの初期設定。",
  "settings.editor.defaultView": "初期表示",
  "settings.editor.source": "ソース",
  "settings.editor.split": "分割",
  "settings.editor.live": "ライブ",
  "settings.lineNumbers": "行番号",
  "settings.vim": "Vim モード",
  "settings.vim.hint": "vim キーマップでのモード編集。",
  "settings.files": "ファイル",
  "settings.files.desc": "ファイルブラウザでのフォルダの見せ方。",
  "settings.files.defaultView": "初期表示",
  "settings.files.defaultView.hint":
    "「アイコン」が最も見やすく、「カラム」はフォルダを1階層ずつたどります。",
  "settings.files.icons": "アイコン",
  "settings.files.list": "リスト",
  "settings.files.columns": "カラム",
  "settings.packaging": "パッケージ",
  "settings.packaging.desc": "HTML を持ち運べる .velq にする方法。",
  "settings.autoPackage": "開いたときに HTML を自動パッケージ",
  "settings.autoPackage.hint":
    "HTML ファイルを開くと、依存関係をたどって .velq を Documents/Velq に保存します（編集はしません）。",

  // ---- コマンド / メニューの操作名 ----
  "action.newDoc": "新規ドキュメント",
  "action.newFolder": "新規フォルダ",
  "action.openFolder": "フォルダを開く…",
  "action.save": "保存",
  "action.undoFile": "ファイルの変更を元に戻す",
  "action.redoFile": "ファイルの変更をやり直す",
  "action.viewSource": "表示: ソース",
  "action.viewSplit": "表示: 分割",
  "action.viewLive": "表示: ライブプレビュー",
  "action.toggleTheme": "ダーク / ライトを切り替え",
  "action.toggleSidebar": "サイドバーを切り替え",
  "action.toggleVim": "Vim モードを切り替え",
  "action.toggleDensity": "表示密度を切り替え（ゆったり / コンパクト）",
  "action.reveal": "Finder で表示",
  "action.searchAll": "すべてのファイルを検索…",
  "action.packageHtml": "HTML を開いて .velq にパッケージ…",
  "action.exportVelq": ".velq に書き出す",
  "action.exportHtml": "HTML に書き出す",
  "action.exportMd": "Markdown に書き出す",
  "action.exportPdf": "PDF に書き出す",
  "action.plugins": "プラグイン…",
  "action.checkUpdates": "アップデートを確認…",

  // ---- コマンドパレット ----
  "palette.placeholder.file": "ファイルを検索…（ > コマンド · @ 見出し · : 行 ）",
  "palette.placeholder.cmd": "コマンドを実行…",
  "palette.placeholder.head": "見出しへ移動…",
  "palette.placeholder.line": "行へ移動…",
  "palette.mode.file": "ファイル",
  "palette.mode.cmd": "コマンド",
  "palette.mode.head": "見出し",
  "palette.mode.line": "行",
  "palette.unsaved": "未保存",
  "palette.goToLine": "{line} 行目へ移動",
  "palette.aria": "コマンドパレット",
  "palette.noResults": "該当なし",

  // ---- キーボードショートカット一覧 ----
  "cheatsheet.title": "キーボードショートカット",
  "cheatsheet.commandPalette": "コマンドパレット",
  "cheatsheet.quickOpen": "ファイルをすばやく開く",
  "cheatsheet.runCommand": "コマンドを実行",
  "cheatsheet.newDoc": "新規ドキュメント",
  "cheatsheet.newFolder": "新規フォルダ",
  "cheatsheet.save": "保存",
  "cheatsheet.openFolder": "フォルダを開く",
  "cheatsheet.toggleSidebar": "サイドバーを切り替え",
  "cheatsheet.quickLook": "クイックルック",
  "cheatsheet.rename": "名前を変更",
  "cheatsheet.shortcuts": "ショートカット",

  // ---- ようこそ画面 ----
  "welcome.title": "Velq へようこそ",
  "welcome.subtitlePre":
    "Markdown と HTML を静かに書ける場所。ドキュメントを依存関係ごと、オフラインで動く1つの ",
  "welcome.subtitlePost": " にまとめられます。",
  "welcome.newDoc": "新規ドキュメント",
  "welcome.openFolder": "フォルダを開く",
  "welcome.packageHtml": "HTML ファイルをパッケージ",
  "welcome.hint.palette": "コマンドパレット",
  "welcome.hint.quickOpen": "ファイルをすばやく開く",
  "welcome.hint.preview": "選択中のファイルをプレビュー",

  // ---- ステータスバー ----
  "statusbar.noVault": "フォルダ未選択",
  "statusbar.editing": "編集中",
  "statusbar.saved": "保存済み",

  // ---- アクティビティバー ----
  "activitybar.viewsAria": "ビュー",
  "activitybar.files": "ファイル",
  "activitybar.editor": "エディタ",
  "activitybar.packageHtmlTitle": "HTML ファイルを開いてパッケージ",
  "activitybar.packageHtmlAria": "HTML ファイルを開いてパッケージ",
  "activitybar.settings": "設定",

  // ---- サイドバー ----
  "sidebar.emptyTitle": "フォルダが開かれていません",
  "sidebar.emptyHint":
    "書き物のためのフォルダを選んでください。あなたのパソコンの、ただのフォルダです。",

  // ---- ツールバー ----
  "toolbar.locationAria": "場所",
  "toolbar.viewModeAria": "エディタの表示モード",

  // ---- パンくず ----
  "breadcrumb.unsaved": "未保存の変更",

  // ---- タブ ----
  "tab.close": "{name} を閉じる",

  // ---- ファイルブラウザ（アイコン / カラム / リスト）----
  "explorer.defaultName": "ファイル",
  "explorer.view.grid": "アイコン",
  "explorer.view.list": "リスト",
  "explorer.view.columns": "カラム",
  "grid.back": "戻る",
  "grid.location": "場所",
  "grid.emptyNoFolder": "フォルダを開くと、ここで中身を見られます。",
  "grid.emptyTitle": "このフォルダは空です",
  "grid.emptyHint": "上の＋ボタンで、ドキュメントやフォルダを追加できます。",
  "grid.recentlyOpened": "最近開いた項目",
  "grid.recentlyAdded": "最近追加した項目",
  "miller.empty": "空",
  "filelist.searchPlaceholder": "このフォルダ内を検索",
  "filelist.showFolders": "フォルダを表示",
  "filelist.hideFolders": "フォルダを隠す",
  "filelist.emptyNoRoot": "ここにドキュメントが表示されます。",
  "filelist.noMatch": "「{query}」に一致するファイルはありません。",
  "filelist.emptyTitle": "まだ何もありません",
  "filelist.emptyHint": "＋を押すか、入力を始めると最初のドキュメントを作成できます。",

  // ---- コンテキストメニュー（右クリック）----
  "contextmenu.aria": "コンテキストメニュー",
  "contextmenu.open": "開く",
  "contextmenu.rename": "名前を変更",
  "contextmenu.duplicate": "複製",
  "contextmenu.revealMac": "Finder で表示",
  "contextmenu.revealOther": "エクスプローラーで表示",
  "contextmenu.trash": "ゴミ箱に入れる",

  // ---- クイックルック ----
  "quicklook.close": "プレビューを閉じる",
  "quicklook.frameTitle": "クイックルックプレビュー",
  "quicklook.position": "{total} 件中 {index} 件目",
  "quicklook.footer": "← → で移動 · Enter で開く · Esc で閉じる",

  // ---- 競合バナー ----
  "conflict.message": "編集中に、このファイルがディスク上で変更されました。",
  "conflict.reload": "ディスクから読み込み直す",
  "conflict.keepMine": "自分の版を保持",

  // ---- ドロップゾーン ----
  "dropzone.hint": "ドロップして Velq フォルダに追加",
  "panedivider.label": "ペインの幅を変更",

  // ---- 保存履歴 ----
  "history.title": "保存履歴",
  "history.close": "履歴を閉じる",
  "history.emptyNoDoc": "保存したドキュメントを開くと、履歴が見られます。",
  "history.emptyNoVersions": "書き進めると、ここに保存ポイントが表示されます。",
  "history.sessionSaves": "このセッションで {count} 回保存",
  "diff.whatChanged": "{time}（{ago}）からの変更点",
  "diff.backToEditing": "編集に戻る",
  "diff.restore": "この版に戻す",

  // ---- 相対時刻・日付ラベル ----
  "time.justNow": "たった今",
  "time.minutesAgo": "{n}分前",
  "time.hoursAgo": "{n}時間前",
  "time.today": "今日",
  "time.yesterday": "昨日",

  // ---- プラグインパネル ----
  "plugins.title": "プラグイン",
  "plugins.footerPre": "プラグインは CodeMirror の拡張です。",
  "plugins.footerLive": "ライブ",
  "plugins.footerPost": "モードで表示されます。",

  // ---- プレビュー / エディタ ----
  "preview.frameTitle": "プレビュー",
  "editor.toggleTask": "タスクを切り替え",
  "toast.dismiss": "閉じる",

  // ---- トースト・ユーザー向けエラー ----
  "error.macPermission":
    "macOS がそのフォルダへのアクセスをブロックしています。システム設定 →「プライバシーとセキュリティ」→「ファイルとフォルダ」で Velq にアクセスを許可するか、デスクトップ / 書類 / ダウンロード以外のフォルダを選んでください。",
  "toast.openedInViewer": "{name} を安全なビューアで開きました。",
  "toast.cantOpen": "{name} を開けませんでした: {error}",
  "toast.cantOpenFolder": "そのフォルダを開けませんでした: {error}",
  "toast.cantOpenHome": "Velq フォルダを開けませんでした: {error}",
  "toast.cantReadFolder": "そのフォルダを読み込めませんでした: {error}",
  "toast.restored": "以前の版に戻しました。",
  "toast.nothingToUndo": "元に戻す操作はありません",
  "toast.undid": "元に戻しました: {label}",
  "toast.redid": "やり直しました: {label}",
  "toast.cantUndo": "元に戻せませんでした: {error}",
  "toast.cantRedo": "やり直せませんでした: {error}",
  "toast.cantRename": "名前を変更できませんでした: {error}",
  "toast.cantDelete": "削除できませんでした: {error}",
  "toast.cantMove": "移動できませんでした: {error}",
  "toast.dropOpenFolderFirst": "先にフォルダを開いてから、ファイルをドロップしてください。",
  "toast.cantAdd": "{name} を追加できませんでした: {error}",
  "toast.addedOne": "1 件を {vault} に追加しました",
  "toast.addedMany": "{count} 件を {vault} に追加しました",
  "toast.exportedMd": "{name}.md を書き出しました",
  "toast.exportedHtml": "{name}.html を書き出しました",
  "toast.packaged": "{name}.velq をパッケージしました{note}",
  "toast.cantPackageVelq": ".velq をパッケージできませんでした。",
  "toast.packaging": "{name} をパッケージ中…",
  "toast.savedToVelq": "Documents/Velq に保存 · {count} ファイル{skipped}",
  "toast.cantPackageNamed": "{name} をパッケージできませんでした: {error}",
  "toast.linksSkippedOne": "（{count} 件のリンクをスキップ）",
  "toast.linksSkippedMany": "（{count} 件のリンクをスキップ）",
  "toast.updateDesktopOnly": "アップデートはデスクトップアプリでのみ利用できます。",
  "toast.upToDate": "Velq は最新です。",
  "toast.updateAvailable": "Velq {version} が利用可能です。",
  "toast.installRestart": "インストールして再起動",
  "toast.cantCheckUpdates": "アップデートを確認できませんでした。",
  "toast.downloading": "Velq {version} をダウンロード中…",
  "toast.cantInstall": "アップデートをインストールできませんでした。",

  // ---- 元に戻すラベル（「元に戻しました: {label}」の中身）----
  "undo.newFile": "ファイルの作成",
  "undo.newFolder": "フォルダの作成",
  "undo.rename": "{name} への名前変更",
  "undo.delete": "{name} の削除",
  "undo.duplicate": "複製",
  "undo.move": "移動",

  // ---- ネイティブダイアログのタイトル ----
  "dialog.chooseHtml": "パッケージする HTML ファイルを選択",
  "dialog.openVault": "Velq のフォルダとして開く",
};
