use anyhow::{Context, Result, bail};
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

    let is_custom_scheme = parsed.scheme() == NATIVE_NAVIGATION_SCHEME && parsed.host_str() == Some(NATIVE_NAVIGATION_HOST);

    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "command" => command = Some(value.into_owned()),
            "id" => id = Some(value.into_owned()),
            "enabled" => {
                enabled = Some(matches!(value.as_ref(), "1" | "true" | "on" | "yes"));
            }
            NATIVE_QUERY_COMMAND_KEY => command = Some(value.into_owned()),
            NATIVE_QUERY_ID_KEY => id = Some(value.into_owned()),
            NATIVE_QUERY_ENABLED_KEY => {
                enabled = Some(matches!(value.as_ref(), "1" | "true" | "on" | "yes"));
            }
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
        _ => bail!("unknown command: {command}"),
    };

    Ok(Some(event))
}

pub fn handle_user_event(runtime: &mut AppRuntime, event: AppUserEvent) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        match event {
            AppUserEvent::GetStartupStatus { id } => {
                let result = get_launch_at_startup_status(&runtime.startup_html_path)?;
                send_ipc_ok(runtime, id, result)?;
            }
            AppUserEvent::SetStartupEnabled { id, enabled } => {
                set_launch_at_startup_preference(&runtime.startup_html_path, enabled)?;
                let result = get_launch_at_startup_status(&runtime.startup_html_path)?;
                send_ipc_ok(runtime, id, result)?;
            }
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        match event {
            AppUserEvent::GetStartupStatus { id } | AppUserEvent::SetStartupEnabled { id, .. } => {
                send_ipc_error(
                    runtime,
                    id,
                    "Startup settings are only available on Windows.",
                )?;
            }
        }
        Ok(())
    }
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
        eprintln!("IPC response delivery had at least one failure: {error}");
    }

    Ok(())
}
