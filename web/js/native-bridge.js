(function initIvoryNativeBridge(global) {
  const NATIVE_RESPONSE_EVENT = "ivory:native-response";
  const NATIVE_QUERY_KEYS = {
    command: "ivoryNativeCommand",
    id: "ivoryNativeId",
    enabled: "ivoryNativeEnabled",
  };

  function createNativeBridge() {
    const available = global.__IVORY_NATIVE_BRIDGE__ === "navigation";
    const pending = new Map();
    let sequence = 0;

    if (available) {
      global.addEventListener(NATIVE_RESPONSE_EVENT, (event) => {
        const detail = event.detail || {};
        const entry = pending.get(detail.id);
        if (!entry) {
          return;
        }

        pending.delete(detail.id);
        global.clearTimeout(entry.timer);
        if (detail.ok) {
          entry.resolve(detail.result || {});
        } else {
          entry.reject(new Error(detail.error || "Native request failed."));
        }
      });
    }

    function invokeNavigation(command, payload = {}) {
      const id = `native_${Date.now()}_${sequence++}`;
      const message = buildNativeNavigationUrl(command, payload, id);

      return new Promise((resolve, reject) => {
        const timer = global.setTimeout(() => {
          pending.delete(id);
          reject(new Error("Native request timed out."));
        }, 8000);

        pending.set(id, { resolve, reject, timer });

        try {
          global.location.replace(message);
        } catch (error) {
          pending.delete(id);
          global.clearTimeout(timer);
          reject(error);
        }
      });
    }

    return {
      available,
      invoke(command, payload = {}) {
        if (!available) {
          return Promise.reject(new Error("Native bridge is not available."));
        }

        if (command === "syncSystemWallpaper" && typeof payload.dataUrl === "string") {
          return syncSystemWallpaperInChunks(payload.dataUrl, invokeNavigation);
        }

        return invokeNavigation(command, payload);
      },
    };
  }

  async function syncSystemWallpaperInChunks(dataUrl, invokeNavigation) {
    const session = `wallpaper_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const chunkSize = 12000;
    const total = Math.max(1, Math.ceil(dataUrl.length / chunkSize));

    for (let index = 0; index < total; index += 1) {
      await invokeNavigation("syncSystemWallpaperChunk", {
        session,
        index,
        total,
        chunk: dataUrl.slice(index * chunkSize, (index + 1) * chunkSize),
      });
    }

    return invokeNavigation("syncSystemWallpaperCommit", { session });
  }

  function buildNativeNavigationUrl(command, payload, id) {
    const url = new URL(global.location.href);
    [
      "command",
      "id",
      "enabled",
      "session",
      "index",
      "total",
      "chunk",
      "path",
      "ivoryNativeCommand",
      "ivoryNativeId",
      "ivoryNativeEnabled",
      "ivoryNativeSession",
      "ivoryNativeIndex",
      "ivoryNativeTotal",
      "ivoryNativeChunk",
      "ivoryNativePath",
    ].forEach((key) => url.searchParams.delete(key));

    url.searchParams.set(NATIVE_QUERY_KEYS.command, command);
    url.searchParams.set(NATIVE_QUERY_KEYS.id, id);

    Object.entries(payload).forEach(([key, value]) => {
      const queryKey = NATIVE_QUERY_KEYS[key] || key;
      url.searchParams.set(queryKey, typeof value === "boolean" ? String(value) : String(value ?? ""));
    });

    return url.toString();
  }

  global.IvoryNativeBridge = {
    create: createNativeBridge,
  };
})(window);
