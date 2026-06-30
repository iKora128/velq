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

/// The native app menu (File / Edit / View / Window / Help). Custom items carry
/// the same ids as the frontend command actions; the menu-event handler emits a
/// `menu` event so the webview runs them. Standard Edit/Window items are predefined.
fn build_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "Velq")
        .about(None)
        .separator()
        .text("view-settings", "Settings…")
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .text("new-doc", "New Document")
        .text("new-folder", "New Folder")
        .separator()
        .text("open-folder", "Open Folder…")
        .text("package-html", "Open HTML & Package…")
        .separator()
        .text("save", "Save")
        .separator()
        .text("export-velq", "Export to .velq")
        .text("export-html", "Export to HTML")
        .text("export-pdf", "Export to PDF")
        .separator()
        .close_window()
        .build()?;

    // Custom Undo/Redo (not the predefined ones): they carry ⌘Z but forward to the
    // webview, which routes to the focused surface — the editor (CodeMirror) when the
    // cursor is in it, else the file manager. This is how VSCode et al. behave.
    let undo = MenuItemBuilder::with_id("menu-undo", "Undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id("menu-redo", "Redo")
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .text("view-explorer", "Files")
        .text("view-editor", "Editor")
        .separator()
        .text("view-source", "Source")
        .text("view-split", "Split")
        .text("view-live", "Live Preview")
        .separator()
        .text("toggle-sidebar", "Toggle Sidebar")
        .text("toggle-theme", "Toggle Dark / Light")
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .fullscreen()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .text("help-github", "Velq on GitHub")
        .text("help-plugins", "Plugin API")
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
    // The `.velq` viewer's content is served from the ZIP with a strict CSP. The viewer
    // window is in no capability, so it has no IPC/fs/network beyond what this allows.
    const VELQ_CSP: &str = "default-src 'self' data: blob:; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; base-uri 'none'; form-action 'none'";

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
        .menu(build_menu)
        .on_menu_event(|app, event| on_menu(app, event.id().0.as_str()))
        .manage(commands::watch::WatchState::default())
        .manage(commands::velq::VelqViewers::default())
        .manage(OpenedFilesState::default())
        .register_uri_scheme_protocol("velq", |ctx, request| {
            let id = request.uri().host().unwrap_or("").to_string();
            let mut path = request.uri().path().trim_start_matches('/').to_string();
            if path.is_empty() {
                path = "index.html".into();
            }
            match commands::velq::serve(ctx.app_handle(), &id, &path) {
                Some(bytes) => tauri::http::Response::builder()
                    .header(
                        tauri::http::header::CONTENT_TYPE,
                        commands::velq::content_type(&path),
                    )
                    .header(tauri::http::header::CONTENT_SECURITY_POLICY, VELQ_CSP)
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
            commands::app::get_settings,
            commands::app::set_settings,
            commands::render::render_markdown,
            commands::search::search_filenames,
            commands::vault::open_vault,
            commands::vault::read_dir,
            commands::vault::preview_dir,
            commands::vault::read_file,
            commands::vault::write_file,
            commands::vault::create_file,
            commands::vault::create_folder,
            commands::vault::rename_path,
            commands::vault::move_path,
            commands::vault::delete_path,
            commands::vault::reveal_in_os,
            commands::vault::recent_files,
            commands::watch::watch_vault,
            commands::watch::unwatch_vault,
            commands::vcs::init_history,
            commands::vcs::save_version,
            commands::vcs::list_versions,
            commands::vcs::version_content,
            commands::vcs::restore_version,
            commands::velq::read_velq_manifest,
            commands::velq::unpack_velq,
            commands::velq::open_velq_viewer,
            commands::bundle::bundle_to_velq,
            commands::bundle::bundle_html_to_velq,
            commands::bundle::package_html_file,
        ])
        .setup(|app| {
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
