use std::env;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};

use crate::{RunMode, StartupStatusPayload};

#[cfg(target_os = "windows")]
const STARTUP_ENTRY_NAME: &str = "ivory_wallpaper";
#[cfg(target_os = "windows")]
const STARTUP_RUN_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";
#[cfg(target_os = "windows")]
const STARTUP_APPROVED_RUN_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";
#[cfg(target_os = "windows")]
const STARTUP_SETTINGS_KEY: &str = "SOFTWARE\\IvoryWallpaper";
#[cfg(target_os = "windows")]
const STARTUP_PREFERENCE_VALUE: &str = "LaunchAtStartup";
#[cfg(target_os = "windows")]
const STARTUP_DEFAULT_ENABLED: bool = true;
#[cfg(target_os = "windows")]
const STARTUP_APPROVED_ENABLED_VALUE: [u8; 12] = [
    0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

#[cfg(target_os = "windows")]
pub fn sync_launch_at_startup_preference(html_path: &Path) -> Result<()> {
    let enabled = read_launch_at_startup_preference()?.unwrap_or(STARTUP_DEFAULT_ENABLED);
    write_launch_at_startup_preference(enabled)?;

    if enabled {
        enable_launch_at_startup(html_path)?;
    } else {
        disable_launch_at_startup()?;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn set_launch_at_startup_preference(html_path: &Path, enabled: bool) -> Result<()> {
    write_launch_at_startup_preference(enabled)?;
    if enabled {
        enable_launch_at_startup(html_path)?;
    } else {
        disable_launch_at_startup()?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn get_launch_at_startup_status(html_path: &Path) -> Result<StartupStatusPayload> {
    Ok(StartupStatusPayload {
        supported: true,
        enabled: launch_at_startup_matches_current_registration(html_path)?,
        default_enabled: STARTUP_DEFAULT_ENABLED,
        mode: "registry-run-workerw",
    })
}

#[cfg(target_os = "windows")]
pub fn hide_console_window_for_workerw(mode: RunMode) {
    use windows::Win32::System::Console::{FreeConsole, GetConsoleWindow};
    use windows::Win32::UI::WindowsAndMessaging::{SW_HIDE, ShowWindow};

    if mode != RunMode::WorkerW {
        return;
    }

    unsafe {
        let console = GetConsoleWindow();
        if !console.0.is_null() {
            let _ = ShowWindow(console, SW_HIDE);
            let _ = FreeConsole();
        }
    }
}

#[cfg(target_os = "windows")]
fn enable_launch_at_startup(html_path: &Path) -> Result<()> {
    use winreg::RegKey;
    use winreg::enums::HKEY_CURRENT_USER;

    let command = build_launch_at_startup_command(html_path)?;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let (run_key, _) = hkcu
        .create_subkey(STARTUP_RUN_KEY)
        .context("failed to open HKCU Run key")?;
    run_key
        .set_value(STARTUP_ENTRY_NAME, &command)
        .context("failed to write startup Run entry")?;

    let (approved_key, _) = hkcu
        .create_subkey(STARTUP_APPROVED_RUN_KEY)
        .context("failed to open StartupApproved Run key")?;
    approved_key
        .set_raw_value(
            STARTUP_ENTRY_NAME,
            &winreg::RegValue {
                bytes: STARTUP_APPROVED_ENABLED_VALUE.to_vec(),
                vtype: winreg::enums::RegType::REG_BINARY,
            },
        )
        .context("failed to mark startup entry as enabled in StartupApproved")?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn disable_launch_at_startup() -> Result<()> {
    use winreg::RegKey;
    use winreg::enums::HKEY_CURRENT_USER;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(STARTUP_RUN_KEY, winreg::enums::KEY_SET_VALUE) {
        let _ = run_key.delete_value(STARTUP_ENTRY_NAME);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn build_launch_at_startup_command(html_path: &Path) -> Result<String> {
    let exe_path = resolve_startup_executable_path()?;
    Ok(format!(
        "{} --mode workerw --html {}",
        quote_windows_command_arg(&exe_path),
        quote_windows_command_arg(html_path),
    ))
}

#[cfg(target_os = "windows")]
fn resolve_startup_executable_path() -> Result<PathBuf> {
    let exe_path = env::current_exe().context("failed to resolve current executable path for startup registration")?;
    let exe_dir = exe_path
        .parent()
        .map(Path::to_path_buf)
        .context("current executable path has no parent directory")?;

    let is_debug_build = exe_dir.file_name().is_some_and(|name| name.eq_ignore_ascii_case("debug"));
    if !is_debug_build {
        return Ok(exe_path);
    }

    let Some(file_name) = exe_path.file_name() else {
        return Ok(exe_path);
    };

    let Some(target_dir) = exe_dir.parent() else {
        return Ok(exe_path);
    };

    let release_exe_path = target_dir.join("release").join(file_name);
    if release_exe_path.exists() {
        return Ok(release_exe_path);
    }

    Ok(exe_path)
}

#[cfg(target_os = "windows")]
fn launch_at_startup_matches_current_registration(html_path: &Path) -> Result<bool> {
    use winreg::RegKey;
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};

    let expected = build_launch_at_startup_command(html_path)?;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let configured = hkcu
        .open_subkey_with_flags(STARTUP_RUN_KEY, KEY_READ)
        .ok()
        .and_then(|key| key.get_value::<String, _>(STARTUP_ENTRY_NAME).ok());

    let Some(actual) = configured else {
        return Ok(false);
    };

    if normalize_windows_command(&actual) != normalize_windows_command(&expected) {
        return Ok(false);
    }

    Ok(task_manager_startup_entry_enabled(hkcu))
}

#[cfg(target_os = "windows")]
fn task_manager_startup_entry_enabled(hkcu: winreg::RegKey) -> bool {
    use winreg::enums::KEY_READ;

    let Some(raw_value) = hkcu
        .open_subkey_with_flags(STARTUP_APPROVED_RUN_KEY, KEY_READ)
        .ok()
        .and_then(|key| key.get_raw_value(STARTUP_ENTRY_NAME).ok())
    else {
        return true;
    };

    let bytes = raw_value.bytes;
    if bytes.len() < 8 {
        return true;
    }

    bytes.iter().rev().take(8).all(|value| *value == 0)
}

#[cfg(target_os = "windows")]
fn read_launch_at_startup_preference() -> Result<Option<bool>> {
    use winreg::RegKey;
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = match hkcu.open_subkey_with_flags(STARTUP_SETTINGS_KEY, KEY_READ) {
        Ok(key) => key,
        Err(_) => return Ok(None),
    };

    match key.get_value::<u32, _>(STARTUP_PREFERENCE_VALUE) {
        Ok(value) => Ok(Some(value != 0)),
        Err(_) => Ok(None),
    }
}

#[cfg(target_os = "windows")]
fn write_launch_at_startup_preference(enabled: bool) -> Result<()> {
    use winreg::RegKey;
    use winreg::enums::HKEY_CURRENT_USER;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey(STARTUP_SETTINGS_KEY)
        .context("failed to open startup settings key")?;
    key.set_value(STARTUP_PREFERENCE_VALUE, &(enabled as u32))
        .context("failed to write startup preference")?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn quote_windows_command_arg(value: &Path) -> String {
    format!("\"{}\"", value.display())
}

#[cfg(target_os = "windows")]
fn normalize_windows_command(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}
