#![cfg_attr(all(target_os = "windows", not(debug_assertions)), windows_subsystem = "windows")]

use std::env;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, bail};
use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoop};
use tao::window::WindowBuilder;
use url::Url;
use wry::WebViewBuilder;

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

struct ManagedWindow {
    window: tao::window::Window,
    _webview: wry::WebView,
}

struct AppRuntime {
    windows: Vec<ManagedWindow>,
    #[cfg(target_os = "windows")]
    workerw: Option<WorkerWRuntime>,
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

    let event_loop = EventLoop::new();
    let mut runtime = build_runtime(&event_loop, options.mode, &html_url)?;

    event_loop.run(move |event, _, control_flow| {
        let _keep_windows_alive = &runtime.windows;

        *control_flow = if options.mode == RunMode::WorkerW {
            ControlFlow::WaitUntil(Instant::now() + Duration::from_millis(50))
        } else {
            ControlFlow::Wait
        };

        match event {
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

fn build_window(event_loop: &EventLoop<()>, mode: RunMode) -> Result<tao::window::Window> {
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

fn build_runtime(event_loop: &EventLoop<()>, mode: RunMode, html_url: &Url) -> Result<AppRuntime> {
    match mode {
        RunMode::Lively | RunMode::Fullscreen => {
            let window = build_window(event_loop, mode)?;
            let webview = WebViewBuilder::new()
                .with_url(html_url.as_str())
                .build(&window)
                .context("failed to build webview")?;

            if mode == RunMode::Fullscreen {
                window.set_fullscreen(Some(tao::window::Fullscreen::Borderless(window.current_monitor())));
            }

            Ok(AppRuntime {
                windows: vec![ManagedWindow {
                    window,
                    _webview: webview,
                }],
                #[cfg(target_os = "windows")]
                workerw: None,
            })
        }
        RunMode::WorkerW => {
            #[cfg(target_os = "windows")]
            {
                build_workerw_windows(event_loop, html_url)
            }

            #[cfg(not(target_os = "windows"))]
            {
                let _ = event_loop;
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

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Debug)]
struct DesktopHost {
    hwnd: windows::Win32::Foundation::HWND,
    left: i32,
    top: i32,
    width: i32,
    height: i32,
}

#[cfg(target_os = "windows")]
#[derive(Debug)]
struct WorkerWRuntime {
    overlay_indices: Vec<usize>,
    edit_mode: bool,
    hotkey_pressed: bool,
}

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Debug)]
struct MonitorTarget {
    host: DesktopHost,
    left: i32,
    top: i32,
    width: i32,
    height: i32,
    index: usize,
    is_primary: bool,
}

#[cfg(target_os = "windows")]
#[derive(Debug)]
struct DesktopState {
    hosts: Vec<DesktopHost>,
}

#[cfg(target_os = "windows")]
fn build_workerw_windows(event_loop: &EventLoop<()>, html_url: &Url) -> Result<AppRuntime> {
    use tao::dpi::{PhysicalPosition, PhysicalSize};

    let desktop = find_desktop_state()?;
    let monitor_targets = build_monitor_targets(event_loop, &desktop.hosts)?;
    let mut windows = Vec::with_capacity(monitor_targets.len() * 2);
    let mut overlay_indices = Vec::with_capacity(monitor_targets.len());

    for target in &monitor_targets {
        let window = build_window(event_loop, RunMode::WorkerW)?;
        window.set_outer_position(PhysicalPosition::new(target.left, target.top));
        window.set_inner_size(PhysicalSize::new(target.width as u32, target.height as u32));

        let target_url = with_monitor_query(html_url, target.index, target.is_primary, "wallpaper")?;
        let webview = WebViewBuilder::new()
            .with_url(target_url.as_str())
            .build(&window)
            .context("failed to build webview")?;

        attach_window_to_desktop_host(
            &window,
            target.host,
            target.left - target.host.left,
            target.top - target.host.top,
            target.width,
            target.height,
        )?;

        windows.push(ManagedWindow {
            window,
            _webview: webview,
        });
    }

    for target in &monitor_targets {
        let window = build_overlay_window(event_loop, *target)?;
        let target_url = with_monitor_query(html_url, target.index, target.is_primary, "editor")?;
        let webview = WebViewBuilder::new()
            .with_url(target_url.as_str())
            .build(&window)
            .context("failed to build editor webview")?;

        overlay_indices.push(windows.len());
        windows.push(ManagedWindow {
            window,
            _webview: webview,
        });
    }

    Ok(AppRuntime {
        windows,
        workerw: Some(WorkerWRuntime {
            overlay_indices,
            edit_mode: false,
            hotkey_pressed: false,
        }),
    })
}

#[cfg(target_os = "windows")]
fn build_overlay_window(event_loop: &EventLoop<()>, target: MonitorTarget) -> Result<tao::window::Window> {
    use tao::dpi::{PhysicalPosition, PhysicalSize};

    WindowBuilder::new()
        .with_title(format!("Ivory Wallpaper Editor {}", target.index + 1))
        .with_decorations(false)
        .with_resizable(false)
        .with_transparent(false)
        .with_always_on_top(true)
        .with_visible(false)
        .with_position(PhysicalPosition::new(target.left, target.top))
        .with_inner_size(PhysicalSize::new(target.width as u32, target.height as u32))
        .build(event_loop)
        .context("failed to create overlay editor window")
}

#[cfg(target_os = "windows")]
fn build_monitor_targets(event_loop: &EventLoop<()>, hosts: &[DesktopHost]) -> Result<Vec<MonitorTarget>> {
    let monitors: Vec<_> = event_loop.available_monitors().collect();
    if monitors.is_empty() {
        bail!("cannot enumerate display monitors");
    }

    let mut targets = Vec::with_capacity(monitors.len());
    for (index, monitor) in monitors.into_iter().enumerate() {
        let position = monitor.position();
        let size = monitor.size();
        let host = pick_host_for_rect(
            hosts,
            position.x,
            position.y,
            size.width as i32,
            size.height as i32,
        )
        .context("cannot map monitor to desktop host")?;

        targets.push(MonitorTarget {
            host,
            left: position.x,
            top: position.y,
            width: size.width as i32,
            height: size.height as i32,
            index,
            is_primary: position.x == 0 && position.y == 0,
        });
    }

    Ok(targets)
}

#[cfg(target_os = "windows")]
fn pick_host_for_rect(
    hosts: &[DesktopHost],
    left: i32,
    top: i32,
    width: i32,
    height: i32,
) -> Option<DesktopHost> {
    fn intersection_area(a: DesktopHost, left: i32, top: i32, width: i32, height: i32) -> i64 {
        let a_right = a.left + a.width;
        let a_bottom = a.top + a.height;
        let b_right = left + width;
        let b_bottom = top + height;
        let intersect_w = (a_right.min(b_right) - a.left.max(left)).max(0) as i64;
        let intersect_h = (a_bottom.min(b_bottom) - a.top.max(top)).max(0) as i64;
        intersect_w * intersect_h
    }

    let best = hosts
        .iter()
        .copied()
        .max_by_key(|host| intersection_area(*host, left, top, width, height));

    match best {
        Some(host) if intersection_area(host, left, top, width, height) > 0 => Some(host),
        Some(host) if hosts.len() == 1 => Some(host),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
fn with_monitor_query(html_url: &Url, index: usize, is_primary: bool, role: &str) -> Result<Url> {
    let mut url = html_url.clone();
    {
        let mut pairs = url.query_pairs_mut();
        pairs.append_pair("ivoryMonitorIndex", &index.to_string());
        pairs.append_pair("ivoryMonitorPrimary", if is_primary { "1" } else { "0" });
        pairs.append_pair("ivoryWindowRole", role);
    }
    Ok(url)
}

#[cfg(target_os = "windows")]
fn find_desktop_state() -> Result<DesktopState> {
    use windows::Win32::Foundation::{HWND, LPARAM, RECT, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumChildWindows, EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetWindowRect,
        SMTO_NORMAL, SendMessageTimeoutW,
    };
    use windows::core::{BOOL, w};

    #[derive(Default)]
    struct WorkerWSearch {
        preferred: HWND,
        alternates: Vec<HWND>,
    }

    unsafe extern "system" fn enum_windows_proc(top: HWND, lparam: LPARAM) -> BOOL {
        let search = unsafe { &mut *(lparam.0 as *mut WorkerWSearch) };
        let shell_view = unsafe {
            FindWindowExW(Some(top), Some(HWND::default()), w!("SHELLDLL_DefView"), None)
                .unwrap_or_default()
        };

        if !shell_view.0.is_null() {
            let workerw = unsafe {
                FindWindowExW(Some(HWND::default()), Some(top), w!("WorkerW"), None)
                    .unwrap_or_default()
            };
            if !workerw.0.is_null() {
                search.preferred = workerw;
            }
        }

        if window_class_is(top, "WorkerW") && shell_view.0.is_null() && !contains_hwnd(&search.alternates, top) {
            search.alternates.push(top);
        }

        BOOL(1)
    }

    fn window_class_is(hwnd: HWND, expected: &str) -> bool {
        let mut class_name = [0u16; 256];
        let written = unsafe { GetClassNameW(hwnd, &mut class_name) };
        if written <= 0 {
            return false;
        }
        String::from_utf16_lossy(&class_name[..written as usize]).eq_ignore_ascii_case(expected)
    }

    fn contains_hwnd(candidates: &[HWND], hwnd: HWND) -> bool {
        candidates.iter().any(|candidate| candidate.0 == hwnd.0)
    }

    fn to_host(hwnd: HWND) -> Option<DesktopHost> {
        let mut rect = RECT::default();
        if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
            return None;
        }

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;
        if width <= 0 || height <= 0 {
            return None;
        }

        Some(DesktopHost {
            hwnd,
            left: rect.left,
            top: rect.top,
            width,
            height,
        })
    }

    let progman = unsafe { FindWindowW(w!("Progman"), None) }.context("cannot locate Progman window")?;
    if progman.0.is_null() {
        bail!("cannot find Progman window");
    }

    let mut _result = 0usize;
    unsafe {
        let _ = SendMessageTimeoutW(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut _result),
        );
    }

    let mut search = WorkerWSearch::default();
    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM((&mut search as *mut WorkerWSearch) as isize),
        );
    }

    let mut hosts = Vec::new();
    if !search.preferred.0.is_null() {
        if let Some(host) = to_host(search.preferred) {
            hosts.push(host);
        }
    }

    for hwnd in search.alternates {
        if hosts.iter().any(|host| host.hwnd.0 == hwnd.0) {
            continue;
        }
        if let Some(host) = to_host(hwnd) {
            hosts.push(host);
        }
    }

    #[derive(Default)]
    struct ChildWorkerWSearch {
        candidates: Vec<HWND>,
    }

    unsafe extern "system" fn enum_progman_children_proc(child: HWND, lparam: LPARAM) -> BOOL {
        let search = unsafe { &mut *(lparam.0 as *mut ChildWorkerWSearch) };
        if window_class_is(child, "WorkerW") && !contains_hwnd(&search.candidates, child) {
            search.candidates.push(child);
        }
        BOOL(1)
    }

    let mut child_search = ChildWorkerWSearch::default();
    unsafe {
        let _ = EnumChildWindows(
            Some(progman),
            Some(enum_progman_children_proc),
            LPARAM((&mut child_search as *mut ChildWorkerWSearch) as isize),
        );
    }

    for hwnd in child_search.candidates {
        if hosts.iter().any(|host| host.hwnd.0 == hwnd.0) {
            continue;
        }
        if let Some(host) = to_host(hwnd) {
            hosts.push(host);
        }
    }

    if hosts.is_empty() {
        bail!("cannot find a desktop WorkerW host suitable for wallpaper rendering");
    }

    hosts.sort_by_key(|host| -(i64::from(host.width) * i64::from(host.height)));
    Ok(DesktopState { hosts })
}

#[cfg(target_os = "windows")]
fn attach_window_to_desktop_host(
    window: &tao::window::Window,
    host: DesktopHost,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<()> {
    use tao::platform::windows::WindowExtWindows;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GWL_STYLE, GetWindowLongW, SWP_NOZORDER, SWP_SHOWWINDOW, SetParent,
        SetWindowLongW, SetWindowPos, WS_CHILD, WS_EX_APPWINDOW, WS_EX_CLIENTEDGE,
        WS_EX_STATICEDGE, WS_EX_WINDOWEDGE, WS_VISIBLE,
    };

    let hwnd = HWND(window.hwnd() as *mut core::ffi::c_void);
    // Scale with the current monitor DPI so high-scaling displays don't expose a 1px desktop seam.
    let overscan = (window.scale_factor().ceil() as i32 + 1).clamp(2, 6);

    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let next_style = WS_CHILD.0 | WS_VISIBLE.0;
        let next_ex_style =
            ex_style & !(WS_EX_APPWINDOW.0 | WS_EX_WINDOWEDGE.0 | WS_EX_CLIENTEDGE.0 | WS_EX_STATICEDGE.0);
        let _ = SetWindowLongW(hwnd, GWL_STYLE, next_style as i32);
        let _ = SetWindowLongW(hwnd, GWL_EXSTYLE, next_ex_style as i32);

        SetParent(hwnd, Some(host.hwnd)).context("SetParent failed for WorkerW host")?;

        SetWindowPos(
            hwnd,
            Some(HWND::default()),
            x - overscan,
            y - overscan,
            width + overscan * 2,
            height + overscan * 2,
            SWP_NOZORDER | SWP_SHOWWINDOW,
        )
        .context("SetWindowPos in WorkerW failed")?;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn poll_workerw_hotkey(app: &mut AppRuntime) -> Result<()> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_F8};

    let Some(runtime) = app.workerw.as_ref() else {
        return Ok(());
    };

    let is_pressed = unsafe { GetAsyncKeyState(VK_F8.0.into()) } < 0;
    let was_pressed = runtime.hotkey_pressed;

    if let Some(runtime) = app.workerw.as_mut() {
        runtime.hotkey_pressed = is_pressed;
    }

    if is_pressed && !was_pressed {
        if let Some(runtime) = app.workerw.as_mut() {
            runtime.edit_mode = !runtime.edit_mode;
        }
        set_workerw_edit_mode(app)?;
        let is_edit_mode = app.workerw.as_ref().map(|runtime| runtime.edit_mode).unwrap_or(false);
        eprintln!(
            "workerw edit mode: {} (F8 切换；编辑模式会显示可交互的覆盖编辑窗口)",
            if is_edit_mode { "ON" } else { "OFF" }
        );
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn set_workerw_edit_mode(app: &AppRuntime) -> Result<()> {
    let Some(runtime) = app.workerw.as_ref() else {
        return Ok(());
    };

    for &index in &runtime.overlay_indices {
        if let Some(managed) = app.windows.get(index) {
            managed.window.set_visible(runtime.edit_mode);
            managed.window.set_always_on_top(runtime.edit_mode);
        }
    }

    if runtime.edit_mode {
        if let Some(&first_index) = runtime.overlay_indices.first() {
            if let Some(managed) = app.windows.get(first_index) {
                managed.window.set_focus();
            }
        }
    }

    Ok(())
}
