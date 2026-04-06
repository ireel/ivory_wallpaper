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

    return {
      available,
      invoke(command, payload = {}) {
        if (!available) {
          return Promise.reject(new Error("当前预览环境不支持应用内启动设置。"));
        }

        const id = `native_${Date.now()}_${sequence++}`;
        const message = buildNativeNavigationUrl(command, payload, id);

        return new Promise((resolve, reject) => {
          const timer = global.setTimeout(() => {
            pending.delete(id);
            reject(new Error("读取应用启动设置超时，请重试。"));
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
      },
    };
  }

  function buildNativeNavigationUrl(command, payload, id) {
    const url = new URL(global.location.href);
    url.searchParams.set(NATIVE_QUERY_KEYS.command, command);
    url.searchParams.set(NATIVE_QUERY_KEYS.id, id);

    Object.entries(payload).forEach(([key, value]) => {
      const queryKey = NATIVE_QUERY_KEYS[key];
      if (!queryKey) {
        return;
      }
      url.searchParams.set(queryKey, typeof value === "boolean" ? String(value) : String(value ?? ""));
    });

    return url.toString();
  }

  global.IvoryNativeBridge = {
    create: createNativeBridge,
  };
})(window);
