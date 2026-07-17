//! Velq desktop backend. `main.rs` calls [`run`]; all builder setup lives here.
//! Commands are split by domain under `commands/` and wired through
//! `tauri::generate_handler!`. Keep this layer thin — real logic lives in the
//! `velq-*` crates.

mod commands;

use std::sync::{Arc, Mutex};
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;

/// Paths handed to Velq by the OS via a file association — double-click, "Open
/// with", or drag-to-dock. On macOS these arrive through `RunEvent::Opened`
/// *before* the webview is ready, so we stash them here and the frontend pulls
/// them via [`get_opened_files`] once it has mounted. On Windows/Linux they come
/// in as CLI args and are captured in `setup`.
#[derive(Default)]
pub struct OpenedFilesState {
    paths: Arc<Mutex<Vec<String>>>,
}

/// True for the document types Velq can open from a file association.
fn is_openable(path: &str) -> bool {
    let p = path.to_lowercase();
    p.ends_with(".velq")
        || p.ends_with(".md")
        || p.ends_with(".markdown")
        || p.ends_with(".html")
        || p.ends_with(".htm")
}

/// Frontend calls this on startup to fetch any files it was launched with.
#[tauri::command]
fn get_opened_files(state: tauri::State<OpenedFilesState>) -> Vec<String> {
    state.paths.lock().unwrap().clone()
}

/// Pick a menu label for the given locale ("ja" → Japanese, anything else →
/// English). Same house rule as the webview: no git vocabulary — "version",
/// "save history", "what changed", not commit/branch/merge.
fn ml(locale: &str, en: &'static str, ja: &'static str) -> &'static str {
    if locale == "ja" {
        ja
    } else {
        en
    }
}

/// Best-effort initial menu language from the saved setting. "system" can't be
/// resolved here (no OS-locale API in this layer), so it starts English and the
/// frontend corrects it on mount via `apply_menu_language` (which resolves the OS
/// language from the webview). Explicit en/ja start correct, avoiding a flash.
fn menu_locale(app: &tauri::AppHandle) -> String {
    match commands::app::get_settings(app.clone()) {
        Ok(s) if s.locale == "ja" => "ja".into(),
        _ => "en".into(),
    }
}

/// The native app menu (File / Edit / View / Window / Help). Custom items carry
/// the same ids as the frontend command actions; the menu-event handler emits a
/// `menu` event so the webview runs them. Standard Edit/Window items are predefined
/// (the OS localizes those automatically). Rebuilt on language change via
/// `apply_menu_language`.
fn build_menu(
    app: &tauri::AppHandle,
    locale: &str,
) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "Velq")
        .about(None)
        .separator()
        .text("view-settings", ml(locale, "Settings…", "設定…"))
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, ml(locale, "File", "ファイル"))
        .text("new-doc", ml(locale, "New Document", "新規ドキュメント"))
        .text("new-folder", ml(locale, "New Folder", "新規フォルダ"))
        .separator()
        .text("open-folder", ml(locale, "Open Folder…", "フォルダを開く…"))
        .text(
            "package-html",
            ml(locale, "Open HTML & Package…", "HTML を開いてパッケージ…"),
        )
        .separator()
        .text("save", ml(locale, "Save", "保存"))
        .separator()
        .text(
            "export-velq",
            ml(locale, "Export to .velq", ".velq に書き出す"),
        )
        .text(
            "export-html",
            ml(locale, "Export to HTML", "HTML に書き出す"),
        )
        .text("export-pdf", ml(locale, "Export to PDF", "PDF に書き出す"))
        .separator()
        .close_window()
        .build()?;

    // Custom Undo/Redo (not the predefined ones): they carry ⌘Z but forward to the
    // webview, which routes to the focused surface — the editor (CodeMirror) when the
    // cursor is in it, else the file manager. This is how VSCode et al. behave.
    let undo = MenuItemBuilder::with_id("menu-undo", ml(locale, "Undo", "元に戻す"))
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id("menu-redo", ml(locale, "Redo", "やり直す"))
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;
    let edit_menu = SubmenuBuilder::new(app, ml(locale, "Edit", "編集"))
        .item(&undo)
        .item(&redo)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, ml(locale, "View", "表示"))
        .text("view-explorer", ml(locale, "Files", "ファイル"))
        .text("view-editor", ml(locale, "Editor", "エディタ"))
        .separator()
        .text("view-source", ml(locale, "Source", "ソース"))
        .text("view-split", ml(locale, "Split", "分割"))
        .text("view-live", ml(locale, "Live Preview", "ライブプレビュー"))
        .separator()
        .text(
            "toggle-sidebar",
            ml(locale, "Toggle Sidebar", "サイドバーを切り替え"),
        )
        .text(
            "toggle-theme",
            ml(locale, "Toggle Dark / Light", "ダーク / ライトを切り替え"),
        )
        .build()?;

    let window_menu = SubmenuBuilder::new(app, ml(locale, "Window", "ウインドウ"))
        .minimize()
        .separator()
        .fullscreen()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, ml(locale, "Help", "ヘルプ"))
        .text(
            "help-github",
            ml(locale, "Velq on GitHub", "GitHub で Velq を見る"),
        )
        .text("help-plugins", ml(locale, "Plugin API", "プラグイン API"))
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()
}

/// Rebuild the native menu in a new language. Called by the frontend on startup
/// (once it has resolved the OS/user language) and whenever the language setting
/// changes — so the menu switches live, no restart needed.
#[tauri::command]
fn apply_menu_language(app: tauri::AppHandle, locale: String) -> Result<(), String> {
    let menu = build_menu(&app, &locale).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

/// Route a menu click: open links in Rust, forward everything else to the webview.
fn on_menu(app: &tauri::AppHandle, id: &str) {
    match id {
        "help-github" => {
            let _ = app
                .opener()
                .open_url("https://github.com/iKora128/velq", None::<&str>);
        }
        "help-plugins" => {
            let _ = app.opener().open_url(
                "https://github.com/iKora128/velq/blob/main/docs/plugin-api.md",
                None::<&str>,
            );
        }
        other => {
            let _ = app.emit("menu", other.to_string());
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    // The auto-updater (and the relaunch it triggers) are desktop-only.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        // Build a safe default (English) menu here: the path resolver that
        // `menu_locale` needs to read the saved language isn't managed yet at
        // `.menu()` time, so reading settings here panics. The real language is
        // applied in `.setup()` below (and live-switched via apply_menu_language).
        .menu(|app| build_menu(app, "en"))
        .on_menu_event(|app, event| on_menu(app, event.id().0.as_str()))
        .manage(commands::watch::WatchState::default())
        .manage(commands::velq::VelqViewers::default())
        .manage(OpenedFilesState::default())
        .register_uri_scheme_protocol("velq", |ctx, request| {
            let id = request.uri().host().unwrap_or("").to_string();
            // An empty path (`velq://<id>/`) is resolved to the package's index
            // path inside `serve`, which returns the name it actually read so the
            // content-type matches the served entry (not the empty request path).
            let path = request.uri().path().trim_start_matches('/').to_string();
            match commands::velq::serve(ctx.app_handle(), &id, &path) {
                Some((bytes, name)) => tauri::http::Response::builder()
                    .header(
                        tauri::http::header::CONTENT_TYPE,
                        commands::velq::content_type(&name),
                    )
                    .header(
                        tauri::http::header::CONTENT_SECURITY_POLICY,
                        commands::velq::velq_csp(&id),
                    )
                    .body(bytes)
                    .unwrap(),
                None => tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .unwrap(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_opened_files,
            apply_menu_language,
            commands::app::get_settings,
            commands::app::set_settings,
            commands::render::render_markdown,
            commands::export::export_pdf,
            commands::search::search_filenames,
            commands::vault::open_vault,
            commands::vault::read_dir,
            commands::vault::preview_dir,
            commands::vault::read_file,
            commands::vault::write_file,
            commands::vault::write_file_binary,
            commands::vault::create_file,
            commands::vault::create_folder,
            commands::vault::rename_path,
            commands::vault::move_path,
            commands::vault::delete_path,
            commands::vault::reveal_in_os,
            commands::vault::recent_files,
            commands::vault::ensure_default_vault,
            commands::vault::import_file,
            commands::watch::watch_vault,
            commands::watch::unwatch_vault,
            commands::vcs::init_history,
            commands::vcs::save_version,
            commands::vcs::list_versions,
            commands::vcs::version_content,
            commands::vcs::restore_version,
            commands::velq::read_velq_manifest,
            commands::velq::unpack_velq,
            commands::velq::read_velq_index,
            commands::velq::save_velq_index,
            commands::velq::read_velq_doc,
            commands::velq::save_velq_md,
            commands::velq::new_velq,
            commands::velq::save_new_velq,
            commands::velq::open_velq_viewer,
            commands::velq::stage_velq,
            commands::bundle::bundle_to_velq,
            commands::bundle::bundle_html_to_velq,
            commands::bundle::package_html_file,
            commands::bundle::package_md_file,
            commands::bundle::fetch_ogp,
            commands::bundle::bundle_md_doc,
        ])
        .setup(|app| {
            // Now that the path resolver is available, localize the menu from the
            // saved setting (an explicit "ja" starts correct; "system" is resolved
            // by the frontend on mount via apply_menu_language).
            let handle = app.handle();
            let locale = menu_locale(handle);
            if locale != "en" {
                if let Ok(menu) = build_menu(handle, &locale) {
                    let _ = handle.set_menu(menu);
                }
            }
            // Test seam: open a .velq viewer on startup when VELQ_OPEN_VELQ is set.
            if let Ok(p) = std::env::var("VELQ_OPEN_VELQ") {
                if !p.is_empty() {
                    let _ = commands::velq::spawn_viewer(app.handle(), &p);
                }
            }
            // Windows/Linux deliver associated files as CLI args at launch.
            #[cfg(not(target_os = "macos"))]
            {
                let args: Vec<String> = std::env::args()
                    .skip(1)
                    .filter(|a| is_openable(a))
                    .collect();
                if !args.is_empty() {
                    *app.state::<OpenedFilesState>().paths.lock().unwrap() = args;
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Velq")
        .run(|_app, _event| {
            // macOS delivers associated files (double-click / "Open with" / drag-to-dock)
            // through Opened, which can fire before the webview exists.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &_event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter(|u| u.scheme() == "file")
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().to_string())
                    .filter(|p| is_openable(p))
                    .collect();
                if !paths.is_empty() {
                    *_app.state::<OpenedFilesState>().paths.lock().unwrap() = paths.clone();
                    // If the webview is already up, nudge it; otherwise it'll pull on mount.
                    let _ = _app.emit("files-opened", paths);
                }
            }
        });
}
