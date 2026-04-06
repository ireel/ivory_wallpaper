use std::env;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use wry::WebContext;

#[cfg(target_os = "windows")]
const APP_SETTINGS_DIR_NAME: &str = "IvoryWallpaper";
#[cfg(target_os = "windows")]
const SHARED_WEBVIEW_DATA_DIR_NAME: &str = "WebView2";

pub fn build_shared_web_context() -> Result<WebContext> {
    #[cfg(target_os = "windows")]
    {
        let data_dir = resolve_shared_webview_data_dir()?;
        migrate_webview_data_if_needed(&data_dir)?;
        std::fs::create_dir_all(&data_dir)
            .with_context(|| format!("failed to create shared webview data directory: {}", data_dir.display()))?;
        return Ok(WebContext::new(Some(data_dir)));
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(WebContext::default())
    }
}

#[cfg(target_os = "windows")]
fn resolve_shared_webview_data_dir() -> Result<PathBuf> {
    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        return Ok(PathBuf::from(local_app_data)
            .join(APP_SETTINGS_DIR_NAME)
            .join(SHARED_WEBVIEW_DATA_DIR_NAME));
    }

    let fallback_base = env::current_exe()
        .context("failed to resolve current executable path for shared webview data")?
        .parent()
        .map(Path::to_path_buf)
        .context("executable path has no parent directory")?;

    Ok(fallback_base
        .join(format!(".{}", APP_SETTINGS_DIR_NAME))
        .join(SHARED_WEBVIEW_DATA_DIR_NAME))
}

#[cfg(target_os = "windows")]
fn migrate_webview_data_if_needed(target_dir: &Path) -> Result<()> {
    if directory_has_entries(target_dir)? {
        return Ok(());
    }

    for source_dir in legacy_webview_data_candidates()? {
        if source_dir == target_dir || !directory_has_entries(&source_dir)? {
            continue;
        }

        eprintln!(
            "migrating existing WebView2 data from {} to {}",
            source_dir.display(),
            target_dir.display()
        );
        copy_directory_recursively(&source_dir, target_dir)?;
        return Ok(());
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn legacy_webview_data_candidates() -> Result<Vec<PathBuf>> {
    let exe_path = env::current_exe().context("failed to resolve current executable path for WebView2 migration")?;
    let exe_dir = exe_path
        .parent()
        .map(Path::to_path_buf)
        .context("executable path has no parent directory")?;
    let exe_name = exe_path
        .file_name()
        .context("executable path has no file name")?
        .to_string_lossy()
        .into_owned();

    let adjacent = exe_dir.join(format!("{exe_name}.WebView2"));
    let sibling_root = exe_dir.parent().map(Path::to_path_buf);
    let is_debug = exe_dir.file_name().is_some_and(|name| name.eq_ignore_ascii_case("debug"));
    let is_release = exe_dir.file_name().is_some_and(|name| name.eq_ignore_ascii_case("release"));
    let mut candidates = Vec::new();

    if is_debug {
        if let Some(root) = &sibling_root {
            candidates.push(root.join("release").join(format!("{exe_name}.WebView2")));
        }
        candidates.push(adjacent);
    } else {
        candidates.push(adjacent);
        if is_release {
            if let Some(root) = &sibling_root {
                candidates.push(root.join("debug").join(format!("{exe_name}.WebView2")));
            }
        }
    }

    let mut unique = Vec::new();
    for candidate in candidates {
        if !unique.iter().any(|existing: &PathBuf| existing == &candidate) {
            unique.push(candidate);
        }
    }

    Ok(unique)
}

#[cfg(target_os = "windows")]
fn directory_has_entries(path: &Path) -> Result<bool> {
    if !path.exists() {
        return Ok(false);
    }

    let mut entries = std::fs::read_dir(path)
        .with_context(|| format!("failed to read directory: {}", path.display()))?;
    Ok(entries.next().transpose()?.is_some())
}

#[cfg(target_os = "windows")]
fn copy_directory_recursively(source_dir: &Path, target_dir: &Path) -> Result<()> {
    std::fs::create_dir_all(target_dir)
        .with_context(|| format!("failed to create directory: {}", target_dir.display()))?;

    for entry in std::fs::read_dir(source_dir)
        .with_context(|| format!("failed to read directory: {}", source_dir.display()))?
    {
        let entry = entry.with_context(|| format!("failed to read entry under {}", source_dir.display()))?;
        let source_path = entry.path();
        let target_path = target_dir.join(entry.file_name());
        let file_type = entry
            .file_type()
            .with_context(|| format!("failed to read file type for {}", source_path.display()))?;

        if file_type.is_dir() {
            copy_directory_recursively(&source_path, &target_path)?;
        } else if file_type.is_file() {
            std::fs::copy(&source_path, &target_path).with_context(|| {
                format!(
                    "failed to copy WebView2 data from {} to {}",
                    source_path.display(),
                    target_path.display()
                )
            })?;
        }
    }

    Ok(())
}
