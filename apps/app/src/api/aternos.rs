//! Shows aternos.org inside the app, as a native webview laid over the area
//! that the Aternos page of the app reserves for it.
//!
//! The webview is a separate browser view, not part of the app's own page, so
//! it is moved off screen whenever that page is left or a modal opens over it.
//! It gets no access to the app's commands.

use serde::Deserialize;
use std::sync::Mutex;
use tauri::plugin::TauriPlugin;
use tauri::webview::{Color, NewWindowResponse, PageLoadEvent, WebviewBuilder};
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Runtime, WebviewUrl,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

#[cfg(target_os = "linux")]
use linux::place;

const WEBVIEW_LABEL: &str = "aternos";
const START_URL: &str = "https://aternos.org/server/";
/// Aternos's list of servers, which its own logo does not lead back to
const HOME_URL: &str = "https://aternos.org/servers/";
/// Far enough away that no window is large enough to reveal it
const HIDDEN_POSITION: LogicalPosition<f64> = LogicalPosition {
    x: -100_000.0,
    y: -100_000.0,
};
/// Starts a page title that carries a notification from the page, see
/// aternos/notifications.js
const NOTIFICATION_MARKER: &str = "\u{2063}modrinth-notification:";
/// Aternos refuses its live connection (server status, console, stats) to
/// WebKitGTK as it identifies itself, but accepts it as Firefox
#[cfg(target_os = "linux")]
const LINUX_USER_AGENT: &str =
    "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";
/// Sign-in pages Aternos may open in a popup
const SIGN_IN_HOSTS: &[&str] = &[
    "accounts.google.com",
    "appleid.apple.com",
    "login.microsoftonline.com",
    "login.live.com",
];

#[derive(Default)]
struct AternosState {
    bounds: Option<Bounds>,
    holds: usize,
    theme: Option<serde_json::Value>,
    /// Shown while a page is loading, instead of white
    background: Option<Color>,
    /// Whether the existing webview was made with the ad blocker
    adblock: bool,
}

/// Where the panel goes, in logical pixels from the top left of the window.
#[derive(Clone, Copy, Deserialize)]
pub struct Bounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("aternos")
        .setup(|app, _api| {
            app.manage(Mutex::new(AternosState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            aternos_show,
            aternos_hide,
            aternos_update_hold,
            aternos_set_theme,
            aternos_go_home,
            aternos_reload,
        ])
        .build()
}

/// Shows the panel at `bounds`, creating it the first time. `adblock` turns
/// on the ad blocker, which has to be in place before the page loads, so the
/// webview is made again when it changes.
#[tauri::command]
pub async fn aternos_show<R: Runtime>(
    app: AppHandle<R>,
    bounds: Bounds,
    adblock: bool,
) -> crate::api::Result<()> {
    let state = app.state::<Mutex<AternosState>>();
    let mut state = state.lock().unwrap();
    state.bounds = Some(bounds);

    let existing = app.webviews().get(WEBVIEW_LABEL).cloned();
    let outdated = existing.is_some() && state.adblock != adblock;
    if outdated && let Some(webview) = existing.as_ref() {
        webview.close()?;
    }
    if existing.is_none() || outdated {
        state.adblock = adblock;
        create_webview(&app, &state)?;
    }
    sync_webview(&app, &state)
}

/// Hides the panel. Its page stays loaded, so coming back is instant.
#[tauri::command]
pub async fn aternos_hide<R: Runtime>(
    app: AppHandle<R>,
) -> crate::api::Result<()> {
    let state = app.state::<Mutex<AternosState>>();
    let mut state = state.lock().unwrap();
    state.bounds = None;
    sync_webview(&app, &state)
}

/// Hides the panel while something is drawn over it, such as a modal.
#[tauri::command]
pub async fn aternos_update_hold<R: Runtime>(
    app: AppHandle<R>,
    acquire: bool,
) -> crate::api::Result<()> {
    let state = app.state::<Mutex<AternosState>>();
    let mut state = state.lock().unwrap();
    if acquire {
        state.holds += 1;
    } else {
        state.holds = state.holds.saturating_sub(1);
    }
    sync_webview(&app, &state)
}

/// Colors the Aternos page with the app's theme. `theme` holds the app's
/// colors by name, and the injected script maps them onto Aternos's own.
/// `background` is the app's background as red, green and blue.
#[tauri::command]
pub async fn aternos_set_theme<R: Runtime>(
    app: AppHandle<R>,
    theme: serde_json::Value,
    background: (u8, u8, u8),
) -> crate::api::Result<()> {
    let state = app.state::<Mutex<AternosState>>();
    let mut state = state.lock().unwrap();
    let (red, green, blue) = background;
    let background = Color(red, green, blue, 255);
    if let Some(webview) = app.webviews().get(WEBVIEW_LABEL) {
        webview.eval(apply_theme_script(&theme))?;
        webview.set_background_color(Some(background))?;
    }
    state.theme = Some(theme);
    state.background = Some(background);
    Ok(())
}

/// Goes back to Aternos's list of servers.
#[tauri::command]
pub async fn aternos_go_home<R: Runtime>(
    app: AppHandle<R>,
) -> crate::api::Result<()> {
    if let Some(webview) = app.webviews().get(WEBVIEW_LABEL) {
        webview.navigate(HOME_URL.parse().unwrap())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn aternos_reload<R: Runtime>(
    app: AppHandle<R>,
) -> crate::api::Result<()> {
    if let Some(webview) = app.webviews().get(WEBVIEW_LABEL) {
        webview.reload()?;
    }
    Ok(())
}

fn create_webview<R: Runtime>(
    app: &AppHandle<R>,
    state: &AternosState,
) -> crate::api::Result<()> {
    let Some(window) = app.get_window("main") else {
        return Ok(());
    };

    let mut script = String::new();
    if state.adblock {
        script.push_str(include_str!("aternos/adblock.js"));
        script.push('\n');
    }
    script.push_str(include_str!("aternos/notifications.js"));
    script.push('\n');
    script.push_str(include_str!("aternos/theme.js"));
    if let Some(theme) = &state.theme {
        script.push('\n');
        script.push_str(&apply_theme_script(theme));
    }

    let mut builder = WebviewBuilder::new(
        WEBVIEW_LABEL,
        WebviewUrl::External(START_URL.parse().unwrap()),
    );
    if let Some(background) = state.background {
        builder = builder.background_color(background);
    }
    #[cfg(target_os = "linux")]
    {
        builder = builder.user_agent(LINUX_USER_AGENT);
    }

    let new_window_app = app.clone();
    let webview = window.add_child(
        builder
            .initialization_script(script)
            .on_document_title_changed(|webview, title| {
                if let Some(message) = title.strip_prefix(NOTIFICATION_MARKER) {
                    show_notification(&webview, message);
                }
            })
            .on_page_load(|webview, payload| {
                if payload.event() != PageLoadEvent::Finished {
                    return;
                }
                // Runs on the main thread, which a command holding the lock may be
                // waiting on, so never block here
                let state = webview.state::<Mutex<AternosState>>();
                if let Ok(state) = state.try_lock()
                    && let Some(theme) = &state.theme
                {
                    webview.eval(apply_theme_script(theme)).ok();
                }
            })
            .on_new_window(move |url, _features| {
                let host = url.host_str().unwrap_or_default();
                if host == "aternos.org" || host.ends_with(".aternos.org") {
                    let app = new_window_app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(webview) = app.webviews().get(WEBVIEW_LABEL)
                        {
                            webview.navigate(url).ok();
                        }
                    });
                    NewWindowResponse::Deny
                } else if SIGN_IN_HOSTS.contains(&host) {
                    NewWindowResponse::Allow
                } else {
                    new_window_app
                        .opener()
                        .open_url(url.as_str(), None::<&str>)
                        .ok();
                    NewWindowResponse::Deny
                }
            }),
        HIDDEN_POSITION,
        LogicalSize::new(800.0, 600.0),
    )?;

    #[cfg(target_os = "linux")]
    linux::attach(&webview)?;
    #[cfg(not(target_os = "linux"))]
    let _ = webview;

    Ok(())
}

fn sync_webview<R: Runtime>(
    app: &AppHandle<R>,
    state: &AternosState,
) -> crate::api::Result<()> {
    place(app, state.bounds.filter(|_| state.holds == 0))
}

#[cfg(not(target_os = "linux"))]
fn place<R: Runtime>(
    app: &AppHandle<R>,
    bounds: Option<Bounds>,
) -> crate::api::Result<()> {
    let Some(webview) = app.webviews().get(WEBVIEW_LABEL).cloned() else {
        return Ok(());
    };

    match bounds {
        Some(bounds) => {
            webview.set_position(LogicalPosition::new(bounds.x, bounds.y))?;
            webview.set_size(LogicalSize::new(bounds.width, bounds.height))?;
            webview.show()?;
        }
        None => {
            webview.hide()?;
            webview.set_position(HIDDEN_POSITION)?;
        }
    }
    Ok(())
}

#[derive(Deserialize)]
struct PageNotification {
    title: String,
    body: String,
}

fn show_notification<R: Runtime>(webview: &tauri::Webview<R>, message: &str) {
    let Ok(notification) = serde_json::from_str::<PageNotification>(message)
    else {
        return;
    };
    let result = webview
        .notification()
        .builder()
        .title(notification.title)
        .body(notification.body)
        .show();
    if let Err(err) = result {
        tracing::warn!("Failed to show an Aternos notification: {err}");
    }
}

fn apply_theme_script(theme: &serde_json::Value) -> String {
    format!("window.__modrinthAternosTheme?.({theme});")
}

/// On Linux, Tauri stacks child webviews below the app in a vertical box and
/// ignores their position, so the panel is moved into a layer laid over the
/// app instead, where it can be placed freely.
#[cfg(target_os = "linux")]
mod linux {
    use super::Bounds;
    use gtk::prelude::*;
    use std::cell::RefCell;
    use tauri::{AppHandle, Runtime, Webview};

    struct Layer {
        fixed: gtk::Fixed,
        panel: gtk::Widget,
    }

    thread_local! {
        static LAYER: RefCell<Option<Layer>> = const { RefCell::new(None) };
        /// Where the panel should be, kept for when the layer is not built yet
        static WANTED: RefCell<Option<Bounds>> = const { RefCell::new(None) };
    }

    pub fn attach<R: Runtime>(webview: &Webview<R>) -> crate::api::Result<()> {
        webview.with_webview(|platform| {
            let panel = platform.inner().upcast::<gtk::Widget>();
            let Some(vbox) = panel
                .parent()
                .and_then(|p| p.downcast::<gtk::Container>().ok())
            else {
                return;
            };

            let reused = LAYER.with_borrow_mut(|layer| {
                let layer = layer.as_mut()?;
                vbox.remove(&panel);
                layer.fixed.put(&panel, 0, 0);
                layer.panel = panel.clone();
                apply(layer, WANTED.with_borrow(|wanted| *wanted));
                Some(())
            });
            if reused.is_some() {
                return;
            }

            let Some(window) = vbox
                .parent()
                .and_then(|p| p.downcast::<gtk::Container>().ok())
            else {
                return;
            };

            vbox.remove(&panel);
            window.remove(&vbox);

            let overlay = gtk::Overlay::new();
            overlay.add(&vbox);
            let fixed = gtk::Fixed::new();
            overlay.add_overlay(&fixed);
            overlay.set_overlay_pass_through(&fixed, true);
            fixed.put(&panel, 0, 0);
            window.add(&overlay);
            overlay.show();
            fixed.show();

            let layer = Layer { fixed, panel };
            apply(&layer, WANTED.with_borrow(|wanted| *wanted));
            LAYER.set(Some(layer));
        })?;
        Ok(())
    }

    pub fn place<R: Runtime>(
        app: &AppHandle<R>,
        bounds: Option<Bounds>,
    ) -> crate::api::Result<()> {
        app.run_on_main_thread(move || {
            WANTED.set(bounds);
            LAYER.with_borrow(|layer| {
                if let Some(layer) = layer {
                    apply(layer, bounds);
                }
            });
        })?;
        Ok(())
    }

    fn apply(layer: &Layer, bounds: Option<Bounds>) {
        match bounds {
            Some(bounds) => {
                layer.fixed.move_(
                    &layer.panel,
                    bounds.x.round() as i32,
                    bounds.y.round() as i32,
                );
                layer.panel.set_size_request(
                    bounds.width.round() as i32,
                    bounds.height.round() as i32,
                );
                layer.panel.show();
            }
            None => layer.panel.hide(),
        }
    }
}
