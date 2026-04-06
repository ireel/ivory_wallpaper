#![cfg_attr(all(target_os = "windows", not(debug_assertions)), windows_subsystem = "windows")]

use std::env;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoop, EventLoopBuilder, EventLoopProxy};
use tao::window::WindowBuilder;
use url::Url;
use wry::{WebContext, WebViewBuilder};

mod native_bridge;
mod startup;
mod webview_store;
#[cfg(target_os = "windows")]
mod workerw;

use native_bridge::{handle_user_event, parse_native_navigation_event};
use startup::{hide_console_window_for_workerw, sync_launch_at_startup_preference};
use webview_store::build_shared_web_context;
#[cfg(target_os = "windows")]
use workerw::{WorkerWRuntime, build_workerw_windows, poll_workerw_hotkey};

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
}

fn main() {
    if let Err(error) = run() {
        eprintln!("ivory_wallpaper_runtime error: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let options = parse_args()?;
    let html_url = to_file_url(&options.html_path)?;

    #[cfg(target_os = "windows")]
    hide_console_window_for_workerw(options.mode);

    #[cfg(target_os = "windows")]
    if let Err(error) = sync_launch_at_startup_preference(&options.html_path) {
        eprintln!("launch-at-startup sync failed: {error:#}");
    }

    let event_loop = EventLoopBuilder::<AppUserEvent>::with_user_event().build();
    let event_loop_proxy = event_loop.create_proxy();
    let mut runtime = build_runtime(&event_loop, &event_loop_proxy, options.mode, &options.html_path, &html_url)?;

    event_loop.run(move |event, _, control_flow| {
        let _keep_windows_alive = &runtime.windows;

        *control_flow = if options.mode == RunMode::WorkerW {
            ControlFlow::WaitUntil(Instant::now() + Duration::from_millis(50))
        } else {
            ControlFlow::Wait
        };

        match event {
            Event::UserEvent(event) => {
                if let Err(error) = handle_user_event(&mut runtime, event) {
                    eprintln!("native event failed: {error:#}");
                }
            }
            Event::MainEventsCleared => {
                #[cfg(target_os = "windows")]
                if let Err(error) = poll_workerw_hotkey(&mut runtime) {
                    eprintln!("workerw interaction toggle failed: {error:#}");
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
        "Usage: ivory_wallpaper_runtime [--mode lively|workerw|fullscreen] [--html <index.html>] [index.html]"
    );
}

fn build_window(event_loop: &EventLoop<AppUserEvent>, mode: RunMode) -> Result<tao::window::Window> {
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
) -> Result<wry::WebView> {
    let proxy = event_loop_proxy.clone();
    WebViewBuilder::new_with_web_context(web_context)
        .with_initialization_script("window.__IVORY_NATIVE_BRIDGE__ = 'navigation';")
        .with_url(url.as_str())
        .with_navigation_handler(move |navigation_url| {
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
        })
        .build(window)
        .context("failed to build webview")
}

fn build_runtime(
    event_loop: &EventLoop<AppUserEvent>,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    mode: RunMode,
    html_path: &Path,
    html_url: &Url,
) -> Result<AppRuntime> {
    let mut web_context = build_shared_web_context()?;

    match mode {
        RunMode::Lively | RunMode::Fullscreen => {
            let window = build_window(event_loop, mode)?;
            let webview = build_webview(&mut web_context, &window, event_loop_proxy, html_url)?;

            if mode == RunMode::Fullscreen {
                window.set_fullscreen(Some(tao::window::Fullscreen::Borderless(window.current_monitor())));
            }

            Ok(AppRuntime {
                _web_context: web_context,
                windows: vec![ManagedWindow {
                    window,
                    webview,
                }],
                #[cfg(target_os = "windows")]
                workerw: None,
                #[cfg(target_os = "windows")]
                startup_html_path: html_path.to_path_buf(),
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
                )?;
                Ok(AppRuntime {
                    _web_context: web_context,
                    windows,
                    workerw: Some(workerw),
                    startup_html_path: html_path.to_path_buf(),
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
            candidates.push(dir.join("index.html"));
        }
    }

    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd.join("index.html"));
    }

    for path in candidates {
        if path.exists() {
            return path
                .canonicalize()
                .with_context(|| format!("failed to normalize html path: {}", path.display()));
        }
    }

    bail!("cannot locate index.html. pass --html <path> or place index.html near executable");
}

fn to_file_url(path: &Path) -> Result<Url> {
    Url::from_file_path(path).map_err(|_| anyhow::anyhow!("invalid file path for URL: {}", path.display()))
}


