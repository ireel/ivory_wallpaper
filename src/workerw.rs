use std::time::Duration;

use anyhow::{Context, Result, bail};
use tao::event_loop::{EventLoopProxy, EventLoopWindowTarget};
use tao::window::WindowBuilder;
use tao::platform::windows::WindowExtWindows;
use url::Url;
use wry::Rect;
use wry::WebContext;

use crate::{AppRuntime, AppUserEvent, ManagedWindow, RunMode, build_webview, build_window};

const WORKERW_STARTUP_RETRY_ATTEMPTS: usize = 45;
const WORKERW_STARTUP_RETRY_DELAY: Duration = Duration::from_secs(1);

#[derive(Clone, Copy, Debug)]
struct DesktopHost {
    hwnd: windows::Win32::Foundation::HWND,
    left: i32,
    top: i32,
    width: i32,
    height: i32,
}

#[derive(Clone, Debug)]
pub struct WorkerWRuntime {
    overlay_indices: Vec<usize>,
    edit_mode: bool,
    monitor_signature: String,
}

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

#[derive(Debug)]
struct DesktopState {
    hosts: Vec<DesktopHost>,
}

pub fn build_workerw_windows(
    web_context: &mut WebContext,
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    html_url: &Url,
) -> Result<(Vec<ManagedWindow>, WorkerWRuntime)> {
    let mut last_error = None;

    for attempt in 1..=WORKERW_STARTUP_RETRY_ATTEMPTS {
        match try_build_workerw_windows(web_context, event_loop, event_loop_proxy, html_url) {
            Ok(result) => {
                if attempt > 1 {
                    eprintln!("WorkerW desktop host became available on attempt {attempt}");
                }
                return Ok(result);
            }
            Err(error) => {
                if attempt == WORKERW_STARTUP_RETRY_ATTEMPTS {
                    last_error = Some(error);
                    break;
                }

                eprintln!(
                    "WorkerW startup attempt {attempt}/{total} failed: {error:#}; retrying in {delay:?}",
                    total = WORKERW_STARTUP_RETRY_ATTEMPTS,
                    delay = WORKERW_STARTUP_RETRY_DELAY
                );
                last_error = Some(error);
                std::thread::sleep(WORKERW_STARTUP_RETRY_DELAY);
            }
        }
    }

    let error = last_error.context("WorkerW startup failed before the first attempt ran")?;
    Err(error).context("desktop shell was not ready before WorkerW startup timed out")
}

fn try_build_workerw_windows(
    web_context: &mut WebContext,
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    html_url: &Url,
) -> Result<(Vec<ManagedWindow>, WorkerWRuntime)> {
    use tao::dpi::{PhysicalPosition, PhysicalSize};

    let desktop = find_desktop_state()?;
    let monitor_targets = build_monitor_targets(event_loop, &desktop.hosts)?;
    let monitor_signature = monitor_signature(&monitor_targets);
    let mut windows = Vec::with_capacity(monitor_targets.len() * 2);
    let mut overlay_indices = Vec::with_capacity(monitor_targets.len());

    for target in &monitor_targets {
        let window = build_window(event_loop, RunMode::WorkerW)?;
        let overscan = window_overscan(&window);
        let window_width = target.width + overscan * 2;
        let window_height = target.height + overscan * 2;
        window.set_outer_position(PhysicalPosition::new(
            target.left - overscan,
            target.top - overscan,
        ));
        window.set_inner_size(PhysicalSize::new(window_width as u32, window_height as u32));

        let target_url =
            with_monitor_query(html_url, target.index, target.is_primary, "wallpaper")?;
        let webview = build_webview(web_context, &window, event_loop_proxy, &target_url)?;
        set_webview_physical_bounds(&webview, window_width, window_height)?;

        attach_window_to_desktop_host(
            &window,
            target.host,
            target.left - target.host.left,
            target.top - target.host.top,
            target.width,
            target.height,
            overscan,
        )?;
        window.set_visible(true);
        windows.push(ManagedWindow { window, webview });
    }

    for target in &monitor_targets {
        let window = build_overlay_window(event_loop, *target)?;
        let target_url = with_monitor_query(html_url, target.index, target.is_primary, "editor")?;
        let webview = build_webview(web_context, &window, event_loop_proxy, &target_url)?;
        set_webview_physical_bounds(&webview, target.width, target.height)?;
        window.set_visible(false);

        overlay_indices.push(windows.len());
        windows.push(ManagedWindow { window, webview });
    }

    Ok((
        windows,
        WorkerWRuntime {
            overlay_indices,
            edit_mode: false,
            monitor_signature,
        },
    ))
}

pub fn ensure_workerw_layout(
    app: &mut AppRuntime,
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    event_loop_proxy: &EventLoopProxy<AppUserEvent>,
    html_url: &Url,
) -> Result<()> {
    let Some(runtime) = app.workerw.as_mut() else {
        return Ok(());
    };

    let next_signature = current_monitor_signature(event_loop)?;
    if next_signature == runtime.monitor_signature {
        return Ok(());
    }

    eprintln!(
        "WorkerW monitor layout changed: {} -> {}; rebuilding wallpaper windows",
        runtime.monitor_signature, next_signature
    );

    // 优雅释放并卸载旧窗口，避免被平铺管理器（如 GlazeWM）或操作系统缓存干扰
    for managed in &app.windows {
        let hwnd = windows::Win32::Foundation::HWND(managed.window.hwnd() as *mut core::ffi::c_void);
        unsafe {
            let _ = windows::Win32::UI::WindowsAndMessaging::ShowWindow(hwnd, windows::Win32::UI::WindowsAndMessaging::SW_HIDE);
            let _ = windows::Win32::UI::WindowsAndMessaging::SetParent(hwnd, None);
        }
    }

    let (windows, workerw) = build_workerw_windows(
        &mut app._web_context,
        event_loop,
        event_loop_proxy,
        html_url,
    )?;
    app.windows = windows;
    app.workerw = Some(workerw);
    Ok(())
}

fn build_overlay_window(
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    target: MonitorTarget,
) -> Result<tao::window::Window> {
    use tao::dpi::{PhysicalPosition, PhysicalSize};
    use tao::platform::windows::{WindowBuilderExtWindows, WindowExtWindows};

    let window = WindowBuilder::new()
        .with_title(format!("Ivory Wallpaper Editor {}", target.index + 1))
        .with_window_classname("IvoryWallpaperEditor")
        .with_skip_taskbar(true)
        .with_decorations(false)
        .with_resizable(false)
        .with_transparent(false)
        .with_always_on_top(true)
        .with_visible(false)
        .with_position(PhysicalPosition::new(target.left, target.top))
        .with_inner_size(PhysicalSize::new(target.width as u32, target.height as u32))
        .build(event_loop)
        .context("failed to create overlay editor window")?;

    let _ = window.set_skip_taskbar(true);
    mark_overlay_as_tool_window(&window);
    Ok(window)
}

fn build_monitor_targets(
    event_loop: &EventLoopWindowTarget<AppUserEvent>,
    hosts: &[DesktopHost],
) -> Result<Vec<MonitorTarget>> {
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

fn current_monitor_signature(event_loop: &EventLoopWindowTarget<AppUserEvent>) -> Result<String> {
    let desktop = find_desktop_state()?;
    let monitor_targets = build_monitor_targets(event_loop, &desktop.hosts)?;
    Ok(monitor_signature(&monitor_targets))
}

fn monitor_signature(targets: &[MonitorTarget]) -> String {
    let mut parts = Vec::with_capacity(targets.len());
    for target in targets {
        parts.push(format!(
            "{}:{}:{}:{}:{}:{}:{}:{}:{}:{}",
            target.index,
            if target.is_primary { 1 } else { 0 },
            target.left,
            target.top,
            target.width,
            target.height,
            target.host.left,
            target.host.top,
            target.host.width,
            target.host.height
        ));
    }
    parts.join("|")
}

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
            FindWindowExW(
                Some(top),
                Some(HWND::default()),
                w!("SHELLDLL_DefView"),
                None,
            )
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

        if window_class_is(top, "WorkerW")
            && shell_view.0.is_null()
            && !contains_hwnd(&search.alternates, top)
        {
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

    let progman =
        unsafe { FindWindowW(w!("Progman"), None) }.context("cannot locate Progman window")?;
    if progman.0.is_null() {
        bail!("cannot find Progman window");
    }

    let mut result = 0usize;
    unsafe {
        let _ = SendMessageTimeoutW(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut result),
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

    // 如果找到首选的桌面 WorkerW 容器，则直接使用它。
    // 只有在未找到首选容器时才去搜索备用及子容器，避免双屏切换时 pick_host_for_rect 因匹配到多个无效窗口而返回 None。
    if hosts.is_empty() {
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
    }

    if hosts.is_empty() {
        bail!("cannot find a desktop WorkerW host suitable for wallpaper rendering");
    }

    hosts.sort_by_key(|host| -(i64::from(host.width) * i64::from(host.height)));
    Ok(DesktopState { hosts })
}

fn attach_window_to_desktop_host(
    window: &tao::window::Window,
    host: DesktopHost,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    overscan: i32,
) -> Result<()> {
    use tao::platform::windows::WindowExtWindows;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GWL_STYLE, GetWindowLongW, SWP_NOZORDER, SWP_SHOWWINDOW, SetParent,
        SetWindowLongW, SetWindowPos, WS_CHILD, WS_EX_APPWINDOW, WS_EX_CLIENTEDGE,
        WS_EX_STATICEDGE, WS_EX_WINDOWEDGE, WS_VISIBLE,
    };

    let hwnd = HWND(window.hwnd() as *mut core::ffi::c_void);
    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let next_style = WS_CHILD.0 | WS_VISIBLE.0;
        let next_ex_style = ex_style
            & !(WS_EX_APPWINDOW.0 | WS_EX_WINDOWEDGE.0 | WS_EX_CLIENTEDGE.0 | WS_EX_STATICEDGE.0);
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

fn window_overscan(window: &tao::window::Window) -> i32 {
    (window.scale_factor().ceil() as i32 + 2).clamp(3, 8)
}

fn set_webview_physical_bounds(webview: &wry::WebView, width: i32, height: i32) -> Result<()> {
    let width = width.max(1) as u32;
    let height = height.max(1) as u32;
    webview
        .set_bounds(Rect {
            position: wry::dpi::PhysicalPosition::new(0, 0).into(),
            size: wry::dpi::PhysicalSize::new(width, height).into(),
        })
        .context("failed to resize WebView to wallpaper window bounds")
}

fn mark_overlay_as_tool_window(window: &tao::window::Window) {
    use tao::platform::windows::WindowExtWindows;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GetWindowLongW, SetWindowLongW, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    };

    let hwnd = HWND(window.hwnd() as *mut core::ffi::c_void);
    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let next_ex_style = (ex_style | WS_EX_TOOLWINDOW.0) & !WS_EX_APPWINDOW.0;
        let _ = SetWindowLongW(hwnd, GWL_EXSTYLE, next_ex_style as i32);
    }
}

pub fn toggle_workerw_edit_mode(app: &mut AppRuntime) -> Result<()> {
    let Some(runtime) = app.workerw.as_mut() else {
        return Ok(());
    };

    runtime.edit_mode = !runtime.edit_mode;
    let edit_mode = runtime.edit_mode;

    for &index in &runtime.overlay_indices {
        if let Some(managed) = app.windows.get(index) {
            managed.window.set_visible(edit_mode);
            managed.window.set_always_on_top(edit_mode);
        }
    }

    if edit_mode {
        if let Some(&first_index) = runtime.overlay_indices.first() {
            if let Some(managed) = app.windows.get(first_index) {
                managed.window.set_focus();
            }
        }
    }

    eprintln!(
        "workerw edit mode: {} (press F8 to toggle the interactive editor overlay)",
        if edit_mode { "ON" } else { "OFF" }
    );

    Ok(())
}
