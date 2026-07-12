use std::{env, path::PathBuf};

use anyhow::{Context, Result};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::EnvFilter;

pub struct LoggingGuard {
    _writer_guard: WorkerGuard,
    pub directory: PathBuf,
}

pub fn init_logging() -> Result<LoggingGuard> {
    let directory = resolve_log_directory();
    std::fs::create_dir_all(&directory)
        .with_context(|| format!("failed to create log directory: {}", directory.display()))?;
    build_logging(directory)
}

fn build_logging(directory: PathBuf) -> Result<LoggingGuard> {
    let appender = tracing_appender::rolling::daily(&directory, "ivory-wallpaper.log");
    let (writer, writer_guard) = tracing_appender::non_blocking(appender);
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    install_subscriber(filter, writer)?;
    Ok(LoggingGuard {
        _writer_guard: writer_guard,
        directory,
    })
}

fn install_subscriber(
    filter: EnvFilter,
    writer: tracing_appender::non_blocking::NonBlocking,
) -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_ansi(false)
        .with_target(true)
        .with_writer(writer)
        .try_init()
        .map_err(|error| anyhow::anyhow!("failed to initialize logging subscriber: {error}"))?;
    std::panic::set_hook(Box::new(
        |info| tracing::error!(panic = %info, "application panic"),
    ));
    Ok(())
}

fn resolve_log_directory() -> PathBuf {
    if let Some(path) = env::var_os("PROGRAMDATA") {
        return PathBuf::from(path).join("IvoryWallpaper").join("logs");
    }
    if let Some(path) = env::var_os("LOCALAPPDATA") {
        return PathBuf::from(path).join("IvoryWallpaper").join("logs");
    }
    env::temp_dir().join("IvoryWallpaper").join("logs")
}
