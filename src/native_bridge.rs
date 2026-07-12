use std::{env, process::Command};

use anyhow::{Context, Result, bail};
#[cfg(target_os = "windows")]
use base64::Engine as _;
use serde::Serialize;
use url::Url;

use crate::{AppRuntime, AppUserEvent, IpcResponse};
#[cfg(target_os = "windows")]
use crate::startup::{get_launch_at_startup_status, set_launch_at_startup_preference};

const IPC_RESPONSE_EVENT_NAME: &str = "ivory:native-response";
const NATIVE_NAVIGATION_SCHEME: &str = "ivory";
const NATIVE_NAVIGATION_HOST: &str = "native";
const NATIVE_QUERY_COMMAND_KEY: &str = "ivoryNativeCommand";
const NATIVE_QUERY_ID_KEY: &str = "ivoryNativeId";
const NATIVE_QUERY_ENABLED_KEY: &str = "ivoryNativeEnabled";

pub fn parse_native_navigation_event(navigation_url: &str) -> Result<Option<AppUserEvent>> {
    let parsed = Url::parse(navigation_url).with_context(|| format!("invalid navigation URL: {navigation_url}"))?;
    let mut command = None::<String>;
    let mut id = None::<String>;
    let mut enabled = None::<bool>;
    let mut session = None::<String>;
    let mut chunk = None::<String>;
    let mut path = None::<String>;
    let mut index = None::<usize>;
    let mut total = None::<usize>;
    let mut level = None::<String>;
    let mut message = None::<String>;
    let mut log_context = None::<String>;

    let is_custom_scheme = parsed.scheme() == NATIVE_NAVIGATION_SCHEME && parsed.host_str() == Some(NATIVE_NAVIGATION_HOST);

    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "command" => command = Some(value.into_owned()),
            "id" => id = Some(value.into_owned()),
            "enabled" => {
                enabled = Some(matches!(value.as_ref(), "1" | "true" | "on" | "yes"));
            }
            "session" => session = Some(value.into_owned()),
            "chunk" => chunk = Some(value.into_owned()),
            "path" => path = Some(value.into_owned()),
            "index" => index = value.parse().ok(),
            "total" => total = value.parse().ok(),
            "level" => level = Some(value.into_owned()),
            "message" => message = Some(value.into_owned()),
            "context" => log_context = Some(value.into_owned()),
            NATIVE_QUERY_COMMAND_KEY => command = Some(value.into_owned()),
            NATIVE_QUERY_ID_KEY => id = Some(value.into_owned()),
            NATIVE_QUERY_ENABLED_KEY => {
                enabled = Some(matches!(value.as_ref(), "1" | "true" | "on" | "yes"));
            }
            "ivoryNativeSession" => session = Some(value.into_owned()),
            "ivoryNativeChunk" => chunk = Some(value.into_owned()),
            "ivoryNativePath" => path = Some(value.into_owned()),
            "ivoryNativeIndex" => index = value.parse().ok(),
            "ivoryNativeTotal" => total = value.parse().ok(),
            _ => {}
        }
    }

    if !is_custom_scheme && command.is_none() && id.is_none() && enabled.is_none() {
        return Ok(None);
    }

    let Some(command) = command else {
        bail!("missing command query parameter");
    };
    let Some(id) = id else {
        bail!("missing id query parameter");
    };

    let event = match command.as_str() {
        "getStartupStatus" => AppUserEvent::GetStartupStatus { id },
        "setStartupEnabled" => AppUserEvent::SetStartupEnabled {
            id,
            enabled: enabled.context("missing enabled query parameter")?,
        },
        "restartApp" => AppUserEvent::RestartApp { id },
        "syncSystemWallpaperChunk" => AppUserEvent::SyncSystemWallpaperChunk {
            id,
            session: session.context("missing session query parameter")?,
            index: index.context("missing index query parameter")?,
            total: total.context("missing total query parameter")?,
            chunk: chunk.context("missing chunk query parameter")?,
        },
        "syncSystemWallpaperCommit" => AppUserEvent::SyncSystemWallpaperCommit {
            id,
            session: session.context("missing session query parameter")?,
        },
        "syncSystemWallpaperFile" => AppUserEvent::SyncSystemWallpaperFile {
            id,
            path: path.context("missing path query parameter")?,
        },
        "getRecoveredData" => AppUserEvent::GetRecoveredData { id },
        "logFrontend" => AppUserEvent::FrontendLog {
            id,
            level: level.unwrap_or_else(|| "info".into()),
            message: message.context("missing message query parameter")?,
            context: log_context.unwrap_or_default(),
        },
        _ => bail!("unknown command: {command}"),
    };

    Ok(Some(event))
}

pub fn handle_user_event(runtime: &mut AppRuntime, event: AppUserEvent) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        match event {
            AppUserEvent::RestartApp { id } => {
                send_ipc_ok(runtime, id, serde_json::json!({ "restarting": true }))?;
                restart_current_process()?;
            }
            AppUserEvent::GetStartupStatus { id } => {
                let result = get_launch_at_startup_status(&runtime.startup_html_path)?;
                send_ipc_ok(runtime, id, result)?;
            }
            AppUserEvent::SetStartupEnabled { id, enabled } => {
                set_launch_at_startup_preference(&runtime.startup_html_path, enabled)?;
                let result = get_launch_at_startup_status(&runtime.startup_html_path)?;
                send_ipc_ok(runtime, id, result)?;
            }
            AppUserEvent::SyncSystemWallpaperChunk {
                id,
                session,
                index,
                total,
                chunk,
            } => {
                if total == 0 || index >= total {
                    bail!("invalid wallpaper sync chunk index {index}/{total}");
                }
                let entry = runtime
                    .wallpaper_syncs
                    .entry(session)
                    .or_insert_with(|| vec![None; total]);
                if entry.len() != total {
                    entry.resize(total, None);
                }
                entry[index] = Some(chunk);
                send_ipc_ok(runtime, id, serde_json::json!({ "received": index }))?;
            }
            AppUserEvent::SyncSystemWallpaperCommit { id, session } => {
                let chunks = runtime
                    .wallpaper_syncs
                    .remove(&session)
                    .context("missing wallpaper sync session")?;
                let mut data_url = String::new();
                for chunk in chunks {
                    data_url.push_str(&chunk.context("wallpaper sync session is incomplete")?);
                }
                let path = sync_system_wallpaper_from_data_url(&data_url)?;
                send_ipc_ok(
                    runtime,
                    id,
                    serde_json::json!({
                        "path": path.display().to_string(),
                    }),
                )?;
            }
            AppUserEvent::SyncSystemWallpaperFile { id, path } => {
                let path = std::path::PathBuf::from(path);
                sync_system_wallpaper_file(&path)?;
                send_ipc_ok(
                    runtime,
                    id,
                    serde_json::json!({
                        "path": path.display().to_string(),
                    }),
                )?;
            }
            AppUserEvent::GetRecoveredData { id } => {
                let Some(program_data) = env::var_os("PROGRAMDATA") else {
                    send_ipc_ok(runtime, id, serde_json::Value::Null)?;
                    return Ok(());
                };
                let recovered_path = std::path::PathBuf::from(program_data)
                    .join("IvoryWallpaper")
                    .join("recovered_data.json");
                if !recovered_path.exists() {
                    send_ipc_ok(runtime, id, serde_json::Value::Null)?;
                    return Ok(());
                }
                match std::fs::read_to_string(&recovered_path) {
                    Ok(raw) => {
                        let _ = std::fs::remove_file(&recovered_path);
                        match serde_json::from_str::<serde_json::Value>(&raw) {
                            Ok(parsed) => {
                                send_ipc_ok(runtime, id, parsed)?;
                            }
                            Err(err) => {
                                tracing::error!(error = %err, "failed to parse recovered data json");
                                send_ipc_ok(runtime, id, serde_json::Value::Null)?;
                            }
                        }
                    }
                    Err(err) => {
                        tracing::error!(error = %err, "failed to read recovered data file");
                        send_ipc_ok(runtime, id, serde_json::Value::Null)?;
                    }
                }
            }
            AppUserEvent::FrontendLog { id, level, message, context } => {
                write_frontend_log(&level, &message, &context);
                send_ipc_ok(runtime, id, serde_json::json!({ "logged": true }))?;
            }
            AppUserEvent::ToggleEditMode | AppUserEvent::CheckLayout => {}
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        match event {
            AppUserEvent::RestartApp { id } => {
                send_ipc_ok(runtime, id, serde_json::json!({ "restarting": true }))?;
                restart_current_process()?;
            }
            AppUserEvent::GetStartupStatus { id } | AppUserEvent::SetStartupEnabled { id, .. } => {
                send_ipc_error(
                    runtime,
                    id,
                    "Startup settings are only available on Windows.",
                )?;
            }
            AppUserEvent::SyncSystemWallpaperChunk { id, .. }
            | AppUserEvent::SyncSystemWallpaperCommit { id, .. }
            | AppUserEvent::SyncSystemWallpaperFile { id, .. } => {
                send_ipc_error(runtime, id, "System wallpaper sync is only available on Windows.")?;
            }
            AppUserEvent::GetRecoveredData { id } => {
                send_ipc_ok(runtime, id, serde_json::Value::Null)?;
            }
            AppUserEvent::FrontendLog { id, level, message, context } => {
                write_frontend_log(&level, &message, &context);
                send_ipc_ok(runtime, id, serde_json::json!({ "logged": true }))?;
            }
            AppUserEvent::ToggleEditMode | AppUserEvent::CheckLayout => {}
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
pub fn sync_system_wallpaper_file(path: &std::path::Path) -> Result<()> {
    set_wallpaper_style_fill()?;
    apply_system_wallpaper(path)
}

#[cfg(target_os = "windows")]
fn sync_system_wallpaper_from_data_url(data_url: &str) -> Result<std::path::PathBuf> {
    let (header, encoded) = data_url
        .split_once(',')
        .context("invalid wallpaper data URL: missing comma separator")?;
    if !header.starts_with("data:image/png;base64") {
        bail!("invalid wallpaper data URL: expected base64 PNG");
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .context("failed to decode wallpaper PNG data")?;
    let path = system_wallpaper_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("failed to create wallpaper sync directory: {}", parent.display()))?;
    }
    std::fs::write(&path, bytes)
        .with_context(|| format!("failed to write synced wallpaper image: {}", path.display()))?;

    set_wallpaper_style_fill()?;
    apply_system_wallpaper(&path)?;
    Ok(path)
}

#[cfg(target_os = "windows")]
fn system_wallpaper_path() -> Result<std::path::PathBuf> {
    if let Some(program_data) = env::var_os("PROGRAMDATA") {
        return Ok(std::path::PathBuf::from(program_data)
            .join("IvoryWallpaper")
            .join("system-wallpaper.png"));
    }
    let local_app_data = env::var_os("LOCALAPPDATA").context("PROGRAMDATA and LOCALAPPDATA are unavailable")?;
    Ok(std::path::PathBuf::from(local_app_data)
        .join("IvoryWallpaper")
        .join("system-wallpaper.png"))
}

#[cfg(target_os = "windows")]
fn set_wallpaper_style_fill() -> Result<()> {
    use winreg::RegKey;
    use winreg::enums::HKEY_CURRENT_USER;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let desktop = hkcu
        .open_subkey_with_flags("Control Panel\\Desktop", winreg::enums::KEY_SET_VALUE)
        .context("failed to open desktop wallpaper registry key")?;
    desktop
        .set_value("WallpaperStyle", &"10")
        .context("failed to set wallpaper fill style")?;
    desktop
        .set_value("TileWallpaper", &"0")
        .context("failed to disable wallpaper tiling")?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn apply_system_wallpaper(path: &std::path::Path) -> Result<()> {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::UI::WindowsAndMessaging::{
        SPIF_SENDCHANGE, SPIF_UPDATEINIFILE, SPI_SETDESKWALLPAPER, SystemParametersInfoW,
    };

    let mut wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    unsafe {
        SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            Some(wide_path.as_mut_ptr() as *mut c_void),
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
        )
        .with_context(|| format!("failed to apply system wallpaper: {}", path.display()))?;
    }
    Ok(())
}

fn send_ipc_ok<T: Serialize>(runtime: &AppRuntime, id: String, result: T) -> Result<()> {
    let response = IpcResponse {
        id,
        ok: true,
        result: Some(result),
        error: None::<String>,
    };
    broadcast_ipc_response(runtime, &response)
}

#[cfg_attr(target_os = "windows", allow(dead_code))]
fn send_ipc_error(runtime: &AppRuntime, id: String, error: impl Into<String>) -> Result<()> {
    let response = IpcResponse::<serde_json::Value> {
        id,
        ok: false,
        result: None,
        error: Some(error.into()),
    };
    broadcast_ipc_response(runtime, &response)
}

fn broadcast_ipc_response<T: Serialize>(runtime: &AppRuntime, response: &IpcResponse<T>) -> Result<()> {
    let payload = serde_json::to_string(response).context("failed to serialize IPC response")?;
    let script = format!(
        "window.dispatchEvent(new CustomEvent({event_name:?}, {{ detail: {payload} }}));",
        event_name = IPC_RESPONSE_EVENT_NAME
    );

    let mut last_error: Option<wry::Error> = None;
    for managed in &runtime.windows {
        if let Err(error) = managed.webview.evaluate_script(&script) {
            last_error = Some(error);
        }
    }

    if let Some(error) = last_error {
        tracing::error!(error = %error, "IPC response delivery had at least one failure");
    }

    Ok(())
}

fn restart_current_process() -> Result<()> {
    let exe = env::current_exe().context("failed to resolve current executable for restart")?;
    let args: Vec<String> = env::args().skip(1).collect();
    let mut command = Command::new(exe);
    command.args(args);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;
        command.creation_flags(CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB);
    }

    command.spawn().context("failed to start replacement process")?;
    std::process::exit(0);
}

fn write_frontend_log(level: &str, message: &str, context: &str) {
    match level {
        "error" => tracing::error!(target: "frontend", context, "{message}"),
        "warn" => tracing::warn!(target: "frontend", context, "{message}"),
        "debug" => tracing::debug!(target: "frontend", context, "{message}"),
        _ => tracing::info!(target: "frontend", context, "{message}"),
    }
}
