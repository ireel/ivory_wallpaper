(function initIvoryStartupSettings(global) {
  function createStartupSettingsController(options) {
    const { state, elements, viewContext, nativeBridge } = options;

    function setStatusMessage(message) {
      if (!elements.launchAtStartupStatus) {
        return;
      }
      elements.launchAtStartupStatus.textContent = message;
    }

    function applySettings(status) {
      state.startup.supported = Boolean(status?.supported);
      state.startup.enabled = Boolean(status?.enabled);
      state.startup.defaultEnabled = status?.defaultEnabled !== false;

      if (!elements.launchAtStartupToggle || !elements.launchAtStartupStatus) {
        return;
      }

      elements.launchAtStartupToggle.checked = state.startup.enabled;
      elements.launchAtStartupToggle.disabled = !state.startup.supported;

      if (!state.startup.supported) {
        setStatusMessage("当前平台暂不支持应用内开机自启设置。");
        return;
      }

      setStatusMessage(
        state.startup.enabled
          ? "已开启：登录 Windows 后会以壁纸模式自动启动。"
          : "已关闭：登录 Windows 后不会自动启动本程序。"
      );
    }

    async function refresh() {
      if (!elements.launchAtStartupToggle || !elements.launchAtStartupStatus || !viewContext.isEditor) {
        return;
      }

      if (!nativeBridge.available) {
        state.startup.supported = false;
        elements.launchAtStartupToggle.checked = false;
        elements.launchAtStartupToggle.disabled = true;
        setStatusMessage("当前仅桌面应用内可配置开机自启。浏览器预览不支持此设置。");
        return;
      }

      state.startup.pending = true;
      elements.launchAtStartupToggle.disabled = true;
      setStatusMessage("正在读取当前状态...");

      try {
        const status = await nativeBridge.invoke("getStartupStatus");
        applySettings(status);
      } catch (error) {
        setStatusMessage(error.message || "读取开机自启状态失败，请重试。");
      } finally {
        state.startup.pending = false;
      }
    }

    async function handleToggle(event) {
      if (!nativeBridge.available) {
        event.target.checked = false;
        event.target.disabled = true;
        setStatusMessage("当前环境不支持开机自启设置。");
        return;
      }

      const nextEnabled = Boolean(event.target.checked);
      event.target.disabled = true;
      setStatusMessage(nextEnabled ? "正在开启开机自启..." : "正在关闭开机自启...");

      try {
        const status = await nativeBridge.invoke("setStartupEnabled", { enabled: nextEnabled });
        applySettings(status);
        setStatusMessage(
          status.enabled
            ? "已开启：登录 Windows 后会以壁纸模式自动启动。"
            : "已关闭：登录 Windows 后不会自动启动本程序。"
        );
      } catch (error) {
        event.target.checked = state.startup.enabled;
        event.target.disabled = false;
        throw error;
      }
    }

    return {
      refresh,
      handleToggle,
      setStatusMessage,
    };
  }

  global.IvoryStartupSettings = {
    create: createStartupSettingsController,
  };
})(window);
