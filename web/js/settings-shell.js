(function initSettingsShell() {
  const modal = document.querySelector("#settingsModal");
  const openButton = document.querySelector("#openSettingsModal");
  const closeButton = document.querySelector("#closeSettingsModal");
  const navItems = Array.from(document.querySelectorAll("[data-settings-pane]"));
  const panes = Array.from(document.querySelectorAll("[data-settings-pane-panel]"));

  if (!modal || !openButton || !closeButton) {
    return;
  }

  function setPane(name) {
    navItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.settingsPane === name);
    });

    panes.forEach((pane) => {
      const active = pane.dataset.settingsPanePanel === name;
      pane.classList.toggle("is-active", active);
    });

    if (name === "weather") {
      document.querySelector("#weatherPanel")?.classList.remove("is-hidden");
    }
    if (name === "grid") {
      document.querySelector("#gridPanel")?.classList.remove("is-hidden");
    }
  }

  function openSettings() {
    modal.classList.remove("is-hidden");
    setPane(document.querySelector(".settings-nav-item.is-active")?.dataset.settingsPane || "background");
  }

  function closeSettings() {
    modal.classList.add("is-hidden");
  }

  openButton.addEventListener("click", openSettings);
  closeButton.addEventListener("click", closeSettings);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeSettings();
    }
  });

  navItems.forEach((item) => {
    item.addEventListener("click", () => setPane(item.dataset.settingsPane));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettings();
    }
  });
})();
