#![cfg_attr(
    all(target_os = "windows", not(debug_assertions)),
    windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::env;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy, EventLoopWindowTarget};
use tao::window::WindowBuilder;
use url::Url;
use wry::{WebContext, WebViewBuilder};

mod native_bridge;
mod startup;
mod webview_store;
#[cfg(target_os = "windows")]
mod workerw;

use native_bridge::{handle_user_event, parse_native_navigation_event};
#[cfg(target_os = "windows")]
use native_bridge::sync_system_wallpaper_file;
use startup::{hide_console_window_for_workerw, sync_launch_at_startup_preference};
use webview_store::build_shared_web_context;
#[cfg(target_os = "windows")]
use workerw::{WorkerWRuntime, build_workerw_windows, ensure_workerw_layout};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RunMode {
    // App window mode for Lively Application Wallpaper.
    Lively,
    // Direct desktop wallpaper mode, attach window to WorkerW.
    WorkerW,
    // Legacy fullscreen debug mode.
    Fullscreen,
}

#[derive(Debug)]
struct AppOptions {
    html_path: PathBuf,
    mode: RunMode,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "camelCase")]
enum AppUserEvent {
    GetStartupStatus { id: String },
    SetStartupEnabled { id: String, enabled: bool },
    RestartApp { id: String },
    SyncSystemWallpaperChunk {
        id: String,
        session: String,
        index: usize,
        total: usize,
        chunk: String,
    },
    SyncSystemWallpaperCommit {
        id: String,
        session: String,
    },
    SyncSystemWallpaperFile {
        id: String,
        path: String,
    },
    GetRecoveredData { id: String },
    #[serde(skip)]
    ToggleEditMode,
    #[serde(skip)]
    CheckLayout,
}

#[derive(Debug, Serialize)]
struct StartupStatusPayload {
    supported: bool,
    enabled: bool,
    default_enabled: bool,
    mode: &'static str,
}

#[derive(Debug, Serialize)]
struct IpcResponse<T: Serialize> {
    id: String,
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

struct ManagedWindow {
    window: tao::window::Window,
    webview: wry::WebView,
}

struct AppRuntime {
    _web_context: WebContext,
    windows: Vec<ManagedWindow>,
    #[cfg(target_os = "windows")]
    workerw: Option<WorkerWRuntime>,
    #[cfg(target_os = "windows")]
    startup_html_path: PathBuf,
    #[cfg(target_os = "windows")]
    wallpaper_syncs: HashMap<String, Vec<Option<String>>>,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("ivory_wallpaper_runtime error: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let options = parse_args()?;
    let html_url = Url::parse("ivory-app://localhost/index.html").context("failed to parse app URL")?;

    #[cfg(target_os = "windows")]
    hide_console_window_for_workerw(options.mode);

    #[cfg(target_os = "windows")]
    if let Err(error) = sync_launch_at_startup_preference(&options.html_path) {
        eprintln!("launch-at-startup sync failed: {error:#}");
    }

    #[cfg(target_os = "windows")]
    if let Err(error) = sync_fixed_config_system_wallpaper() {
        eprintln!("fixed-config system wallpaper sync failed: {error:#}");
    }

    let event_loop = EventLoopBuilder::<AppUserEvent>::with_user_event().build();
    let event_loop_proxy = event_loop.create_proxy();

    // 1. 创建后台 F8 热键监听线程，使用 Windows 原生 RegisterHotKey，避免 CPU 忙轮询
    #[cfg(target_os = "windows")]
    if options.mode == RunMode::WorkerW {
        let proxy_clone = event_loop_proxy.clone();
        std::thread::spawn(move || {
            use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_NOREPEAT, VK_F8};
            use windows::Win32::UI::WindowsAndMessaging::{GetMessageW, MSG, WM_HOTKEY};
            unsafe {
                if RegisterHotKey(
                    None,
                    1, // 热键 ID
                    MOD_NOREPEAT,
                    VK_F8.0 as u32,
                ).is_err() {
                    eprintln!("Failed to register F8 hotkey thread");
                    return;
                }

                let mut msg = MSG::default();
                while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                    if msg.message == WM_HOTKEY {
                        let _ = proxy_clone.send_event(AppUserEvent::ToggleEditMode);
                    }
                }
            }
        });
    }

    // 2. 创建后台显示器布局改变定时检测线程，每 2 秒唤醒事件循环检测一次
    #[cfg(target_os = "windows")]
    if options.mode == RunMode::WorkerW {
        let proxy_clone = event_loop_proxy.clone();
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_secs(2));
                let _ = proxy_clone.send_event(AppUserEvent::CheckLayout);
            }
        });
    }

    let mut runtime = build_runtime(
        &event_loop,
        &event_loop_proxy,
        options.mode,
        &options.html_path,
        &html_url,
    )?;

    event_loop.run(move |event, event_loop, control_flow| {
        let _keep_windows_alive = &runtime.windows;

        // 完全进入阻塞等待状态，零 CPU 占用
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(event) => {
                match event {
                    AppUserEvent::ToggleEditMode => {
                        #[cfg(target_os = "windows")]
                        if let Err(error) = workerw::toggle_workerw_edit_mode(&mut runtime) {
                            eprintln!("failed to toggle edit mode: {error:#}");
                        }
                    }
                    AppUserEvent::CheckLayout => {
                        #[cfg(target_os = "windows")]
                        if let Err(error) = ensure_workerw_layout(&mut runtime, event_loop, &event_loop_proxy, &html_url) {
                            eprintln!("workerw layout refresh failed: {error:#}");
                        }
                    }
                    _ => {
                        if let Err(error) = handle_user_event(&mut runtime, event) {
                            eprintln!("native event failed: {error:#}");
                        }
                    }
                }
            }
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}

fn parse_args() -> Result<AppOptions> {
    let mut mode = RunMode::Lively;
    let mut html_arg: Option<PathBuf> = None;

    let mut args = env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--mode" => {
                let value = args.next().context("missing value for --mode")?;
                mode = parse_mode(&value)?;
            }
            "--html" => {
                let value = args.next().context("missing value for --html")?;
                html_arg = Some(PathBuf::from(value));
            }
            "-h" | "--help" => {
                print_help();
                std::process::exit(0);
            }
            _ if arg.starts_with("--") => {
                bail!("unknown flag: {arg}");
            }
            _ => {
                if html_arg.is_none() {
                    html_arg = Some(PathBuf::from(arg));
                } else {
                    bail!("multiple html paths provided; use only one");
                }
            }
        }
    }

    Ok(AppOptions {
        html_path: resolve_html_path(html_arg)?,
        mode,
    })
}

fn parse_mode(value: &str) -> Result<RunMode> {
    match value.trim().to_ascii_lowercase().as_str() {
        "lively" => Ok(RunMode::Lively),
        "workerw" => Ok(RunMode::WorkerW),
        "fullscreen" => Ok(RunMode::Fullscreen),
        _ => bail!("invalid mode: {value}. expected one of lively|workerw|fullscreen"),
    }
}

fn print_help() {
    println!(
        "Usage: ivory_wallpaper_runtime [--mode lively|workerw|fullscreen] [--html <web/index.html>] [web/index.html]"
    );
}

fn build_window(
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    mode: RunMode,
) -> Result<tao::window::Window> {
    let mut builder = WindowBuilder::new().with_title("Ivory Wallpaper Runtime");

    match mode {
        RunMode::Lively => {
            builder = builder
                .with_decorations(true)
                .with_resizable(true)
                .with_inner_size(LogicalSize::new(1280.0, 800.0));
        }
        RunMode::WorkerW | RunMode::Fullscreen => {
            builder = builder
                .with_decorations(false)
                .with_resizable(false)
                .with_transparent(false)
                .with_visible(mode != RunMode::WorkerW) // WorkerW 窗口初始不可见以防止被 GlazeWM 捕获
                .with_inner_size(LogicalSize::new(1280.0, 800.0));
        }
    }

    builder.build(event_loop).context("failed to create window")
}

fn build_webview(
    web_context: &mut WebContext,
    window: &tao::window::Window,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    url: &Url,
    html_path: &Path,
) -> Result<wry::WebView> {
    let proxy = event_loop_proxy.clone();
    let mut attempts = 0;
    let web_dir = html_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf();
    loop {
        let web_dir_clone = web_dir.clone();
        let builder = WebViewBuilder::new_with_web_context(web_context)
            .with_custom_protocol("ivory-app".into(), move |_webview_id, request| {
                let path = request.uri().path();
                let relative_path = path.strip_prefix('/').unwrap_or(path);
                let file_path = if relative_path.is_empty() {
                    web_dir_clone.join("index.html")
                } else {
                    web_dir_clone.join(relative_path)
                };

                match std::fs::read(&file_path) {
                    Ok(content) => {
                        let mime_type = match file_path.extension().and_then(|ext| ext.to_str()) {
                            Some("html") => "text/html; charset=utf-8",
                            Some("css") => "text/css; charset=utf-8",
                            Some("js") => "application/javascript; charset=utf-8",
                            Some("svg") => "image/svg+xml",
                            Some("png") => "image/png",
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            Some("json") => "application/json; charset=utf-8",
                            _ => "application/octet-stream",
                        };
                        wry::http::Response::builder()
                            .header(wry::http::header::CONTENT_TYPE, mime_type)
                            .body(content)
                            .unwrap()
                            .map(Into::into)
                    }
                    Err(err) => {
                        wry::http::Response::builder()
                            .status(404)
                            .header(wry::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
                            .body(format!("File not found: {err}").into_bytes())
                            .unwrap()
                            .map(Into::into)
                    }
                }
            })
            .with_initialization_script(&build_initialization_script())
            .with_url(url.as_str())
            .with_navigation_handler({
                let proxy = proxy.clone();
                move |navigation_url| {
                    match parse_native_navigation_event(&navigation_url) {
                        Ok(Some(event)) => {
                            if let Err(error) = proxy.send_event(event) {
                                  eprintln!("failed to forward native navigation event: {error}");
                            }
                            false
                        }
                        Ok(None) => true,
                        Err(error) => {
                            eprintln!("invalid native navigation `{navigation_url}`: {error:#}");
                            false
                        }
                    }
                }
            });

        match builder.build(window) {
            Ok(webview) => return Ok(webview),
            Err(error) => {
                attempts += 1;
                if attempts >= 15 {
                    return Err(error).context("failed to build webview after 15 attempts");
                }
                eprintln!("WebView2 build attempt {attempts} failed: {error:?}; retrying in 200ms...");
                std::thread::sleep(Duration::from_millis(200));
            }
        }
    }
}

fn build_initialization_script() -> String {
    let mut script = String::from("window.__IVORY_NATIVE_BRIDGE__ = 'navigation';\n");

    #[cfg(target_os = "windows")]
    if let Ok(Some(restore_script)) = build_fixed_config_restore_script() {
        script.push_str(&restore_script);
    }

    script
}

#[cfg(target_os = "windows")]
fn build_fixed_config_restore_script() -> Result<Option<String>> {
    let Some(program_data) = env::var_os("PROGRAMDATA") else {
        return Ok(None);
    };
    let config_path = PathBuf::from(program_data)
        .join("IvoryWallpaper")
        .join("config.json");
    if !config_path.exists() {
        return Ok(None);
    }

    let raw = std::fs::read_to_string(&config_path).with_context(|| {
        format!(
            "failed to read fixed config file: {}",
            config_path.display()
        )
    })?;
    let config: serde_json::Value = serde_json::from_str(raw.trim_start_matches('\u{feff}'))
        .with_context(|| {
            format!(
                "failed to parse fixed config file: {}",
                config_path.display()
            )
        })?;
    let restore_id = config
        .get("restoreId")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("fixed-config-v1");
    let background_id = config
        .get("backgroundId")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("custom");
    let custom_background_file = config
        .get("customBackgroundFile")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");

    if custom_background_file.trim().is_empty() {
        return Ok(None);
    }

    Ok(Some(format!(
        r#"(function restoreIvoryFixedConfig() {{
  try {{
    var restoreId = {restore_id:?};
    var markerKey = "ivory.fixedConfig.restoreId";
    if (localStorage.getItem(markerKey) === restoreId) {{
      return;
    }}
    localStorage.setItem("ivory.background", JSON.stringify({background_id:?}));
    localStorage.setItem("ivory.background.customFile", JSON.stringify({custom_background_file:?}));
    localStorage.setItem("ivory.background.custom", JSON.stringify(""));
    localStorage.setItem(markerKey, restoreId);
  }} catch (error) {{
    console.warn("Ivory fixed config restore skipped:", error);
  }}
}})();
"#,
    )))
}

fn build_runtime(
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    mode: RunMode,
    html_path: &Path,
    html_url: &Url,
) -> Result<AppRuntime> {
    let mut web_context = build_shared_web_context()?;

    match mode {
        RunMode::Lively | RunMode::Fullscreen => {
            let window = build_window(event_loop, mode)?;
            let webview = build_webview(&mut web_context, &window, event_loop_proxy, html_url, html_path)?;

            if mode == RunMode::Fullscreen {
                window.set_fullscreen(Some(tao::window::Fullscreen::Borderless(
                    window.current_monitor(),
                )));
            }

            Ok(AppRuntime {
                _web_context: web_context,
                windows: vec![ManagedWindow { window, webview }],
                #[cfg(target_os = "windows")]
                workerw: None,
                #[cfg(target_os = "windows")]
                startup_html_path: html_path.to_path_buf(),
                #[cfg(target_os = "windows")]
                wallpaper_syncs: HashMap::new(),
            })
        }
        RunMode::WorkerW => {
            #[cfg(target_os = "windows")]
            {
                let (windows, workerw) = build_workerw_windows(
                    &mut web_context,
                    event_loop,
                    event_loop_proxy,
                    html_url,
                    html_path,
                )?;
                Ok(AppRuntime {
                    _web_context: web_context,
                    windows,
                    workerw: Some(workerw),
                    startup_html_path: html_path.to_path_buf(),
                    wallpaper_syncs: HashMap::new(),
                })
            }

            #[cfg(not(target_os = "windows"))]
            {
                let _ = web_context;
                let _ = event_loop;
                let _ = event_loop_proxy;
                let _ = html_path;
                let _ = html_url;
                bail!("workerw mode is only available on Windows");
            }
        }
    }
}

fn resolve_html_path(input_path: Option<PathBuf>) -> Result<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(path) = input_path {
        candidates.push(path);
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("web").join("index.html"));
            candidates.push(dir.join("index.html"));
        }
    }

    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd.join("web").join("index.html"));
        candidates.push(cwd.join("index.html"));
    }

    for path in candidates {
        if path.exists() {
            let canonical = path
                .canonicalize()
                .with_context(|| format!("failed to normalize html path: {}", path.display()))?;
            return Ok(normalize_canonical_path(canonical));
        }
    }

    bail!(
        "cannot locate web/index.html. pass --html <path> or place web/index.html near executable"
    );
}

#[allow(dead_code)]
fn to_file_url(path: &Path) -> Result<Url> {
    Url::from_file_path(path)
        .map_err(|_| anyhow::anyhow!("invalid file path for URL: {}", path.display()))
}

#[cfg(target_os = "windows")]
fn sync_fixed_config_system_wallpaper() -> Result<()> {
    let Some(program_data) = env::var_os("PROGRAMDATA") else {
        return Ok(());
    };
    let config_path = PathBuf::from(program_data)
        .join("IvoryWallpaper")
        .join("config.json");
    if !config_path.exists() {
        return Ok(());
    }

    let raw = std::fs::read_to_string(&config_path)
        .with_context(|| format!("failed to read fixed config file: {}", config_path.display()))?;
    let config: serde_json::Value = serde_json::from_str(raw.trim_start_matches('\u{feff}'))
        .with_context(|| format!("failed to parse fixed config file: {}", config_path.display()))?;
    let custom_background_file = config
        .get("customBackgroundFile")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .trim();
    if custom_background_file.is_empty() {
        return Ok(());
    }

    sync_system_wallpaper_file(Path::new(custom_background_file))
}

#[cfg(target_os = "windows")]
fn normalize_canonical_path(path: PathBuf) -> PathBuf {
    let raw = path.display().to_string();
    if let Some(stripped) = raw.strip_prefix(r"\\?\UNC\") {
        return PathBuf::from(format!(r"\\{stripped}"));
    }
    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        return PathBuf::from(stripped);
    }
    path
}

#[cfg(not(target_os = "windows"))]
fn normalize_canonical_path(path: PathBuf) -> PathBuf {
    path
}
