//! PDF export via each platform's native "render webview to PDF" API — a real PDF
//! file, no print dialog. Shared flow: spin up a hidden webview holding the
//! standalone HTML, wait for it to finish loading, then capture it to `out_path`.
//! All native webview work runs on the main thread (via `with_webview`); the
//! command runs on a blocking thread so the waits never stall the UI.
//!
//! Per platform:
//!   • macOS   — `WKWebView.createPDF` (objc2). Verified end-to-end.
//!   • Windows — WebView2 `ICoreWebView2_7::PrintToPdf` (writes the file directly).
//!   • Linux   — WebKitGTK `PrintOperation` printing to a `file://` output URI.
//!
//! NOTE: the Windows and Linux paths can only be compiled on their own OS (they
//! need the WebView2 / WebKitGTK system stacks), so CI is their first real build.

use tauri::AppHandle;

#[tauri::command]
pub async fn export_pdf(app: AppHandle, html: String, out_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || render_pdf(&app, &html, &out_path))
        .await
        .map_err(|e| format!("PDF export task failed: {e}"))?
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
fn render_pdf(app: &AppHandle, html: &str, out_path: &str) -> Result<(), String> {
    use base64::Engine;
    use std::sync::{mpsc, Arc, Mutex};
    use std::time::Duration;
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    const LABEL: &str = "velq-pdf-export";

    let data_url = format!(
        "data:text/html;charset=utf-8;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(html.as_bytes())
    );
    let url = tauri::Url::parse(&data_url).map_err(|e| e.to_string())?;

    // A stale hidden window from an interrupted export would steal the label.
    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.close();
    }

    // Signal (main thread → us) that the document finished loading.
    let (ready_tx, ready_rx) = mpsc::channel::<()>();
    let ready_tx = Arc::new(Mutex::new(Some(ready_tx)));

    let win = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::External(url))
        .visible(false)
        .title("")
        .inner_size(816.0, 1056.0)
        .on_page_load(move |_w, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                if let Some(tx) = ready_tx.lock().unwrap().take() {
                    let _ = tx.send(());
                }
            }
        })
        .build()
        .map_err(|e| e.to_string())?;

    ready_rx
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| "PDF export: page load timed out".to_string())?;
    // Let web fonts and final layout settle before capturing.
    std::thread::sleep(Duration::from_millis(350));

    let result = capture_to_pdf(&win, out_path);
    let _ = win.close();
    result
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn render_pdf(_app: &AppHandle, _html: &str, _out_path: &str) -> Result<(), String> {
    Err("PDF export is not available on this platform".to_string())
}

// ---- macOS: WKWebView.createPDF -> PDF bytes -> file (verified) ----
#[cfg(target_os = "macos")]
fn capture_to_pdf(win: &tauri::WebviewWindow, out_path: &str) -> Result<(), String> {
    use std::sync::mpsc;
    use std::time::Duration;

    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, String>>();
    win.with_webview(move |pw| {
        use block2::RcBlock;
        use objc2::MainThreadMarker;
        use objc2_foundation::{NSData, NSError};
        use objc2_web_kit::{WKPDFConfiguration, WKWebView};

        // `with_webview` runs on the main thread, so the marker is always available.
        let mtm = MainThreadMarker::new().expect("with_webview runs on the main thread");
        let wk: &WKWebView = unsafe { &*(pw.inner() as *mut WKWebView) };
        let cfg = unsafe { WKPDFConfiguration::new(mtm) }; // default rect => full content
        let tx = tx.clone();
        let handler = RcBlock::new(move |data: *mut NSData, _err: *mut NSError| {
            let out = if data.is_null() {
                Err("PDF export: createPDF returned no data".to_string())
            } else {
                Ok(unsafe { &*data }.to_vec())
            };
            let _ = tx.send(out);
        });
        unsafe { wk.createPDFWithConfiguration_completionHandler(Some(&cfg), &handler) };
    })
    .map_err(|e| e.to_string())?;

    let bytes = rx
        .recv_timeout(Duration::from_secs(30))
        .map_err(|_| "PDF export: render timed out".to_string())??;
    std::fs::write(out_path, &bytes).map_err(|e| e.to_string())
}

// ---- Windows: WebView2 PrintToPdf writes the file directly ----
#[cfg(target_os = "windows")]
fn capture_to_pdf(win: &tauri::WebviewWindow, out_path: &str) -> Result<(), String> {
    use std::sync::mpsc;
    use std::time::Duration;

    let (tx, rx) = mpsc::channel::<Result<(), String>>();
    let out = out_path.to_string();
    win.with_webview(move |pw| {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_7;
        use webview2_com::PrintToPdfCompletedHandler;
        use windows::core::{Interface, HSTRING};

        let tx_setup = tx.clone();
        let setup = || -> windows::core::Result<()> {
            let webview = unsafe { pw.controller().CoreWebView2()? };
            let webview7: ICoreWebView2_7 = webview.cast()?;
            let tx_done = tx.clone();
            let handler = PrintToPdfCompletedHandler::create(Box::new(move |_hr, is_success| {
                let _ = tx_done.send(if is_success {
                    Ok(())
                } else {
                    Err("PDF export: PrintToPdf reported failure".to_string())
                });
                Ok(())
            }));
            unsafe { webview7.PrintToPdf(&HSTRING::from(out.as_str()), None, &handler)? };
            Ok(())
        };
        if let Err(e) = setup() {
            let _ = tx_setup.send(Err(format!("PDF export: PrintToPdf setup failed: {e}")));
        }
    })
    .map_err(|e| e.to_string())?;

    rx.recv_timeout(Duration::from_secs(45))
        .map_err(|_| "PDF export: render timed out".to_string())?
}

// ---- Linux: WebKitGTK PrintOperation -> file:// output URI ----
#[cfg(target_os = "linux")]
fn capture_to_pdf(win: &tauri::WebviewWindow, out_path: &str) -> Result<(), String> {
    use std::sync::mpsc;
    use std::time::Duration;

    let (tx, rx) = mpsc::channel::<Result<(), String>>();
    let out = out_path.to_string();
    win.with_webview(move |pw| {
        use webkit2gtk::{PrintOperation, PrintOperationExt};

        let webview = pw.inner();
        let settings = gtk::PrintSettings::new();
        let uri = format!("file://{out}");
        settings.set("output-uri", Some(uri.as_str()));
        settings.set("output-file-format", Some("pdf"));

        let op = PrintOperation::new(&webview);
        op.set_print_settings(&settings);
        let tx_ok = tx.clone();
        op.connect_finished(move |_| {
            let _ = tx_ok.send(Ok(()));
        });
        let tx_err = tx.clone();
        op.connect_failed(move |_, err| {
            let _ = tx_err.send(Err(format!("PDF export: print failed: {err}")));
        });
        op.print();
        // The print is async; keep the operation alive until ::finished fires.
        std::mem::forget(op);
    })
    .map_err(|e| e.to_string())?;

    rx.recv_timeout(Duration::from_secs(45))
        .map_err(|_| "PDF export: render timed out".to_string())?
}
