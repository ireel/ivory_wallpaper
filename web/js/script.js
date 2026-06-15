const STORAGE_KEYS = {
  background: "ivory.background",
  customBackground: "ivory.background.custom",
  customBackgroundFile: "ivory.background.customFile",
  weather: "ivory.weather",
  memo: "ivory.memo",
  todos: "ivory.todos",
  grid: "ivory.grid",
  snapshot: "ivory.snapshot",
  dailyRecords: "ivory.dailyRecords",
  selectedDateKey: "ivory.selectedDateKey",
  calendarMonthKey: "ivory.calendarMonthKey",
  lastLaunchDate: "ivory.lastLaunchDate",
};

const ASSET_DB = {
  name: "ivory_wallpaper_assets",
  version: 1,
  store: "files",
  customBackgroundKey: "custom-background",
};


const DEFAULT_MEMO = `# 今日备忘

- [ ] 记录今天最重要的事情
- [ ] 用 Markdown 整理想法、会议纪要或灵感
- [ ] 打开日历查看不同日期的记录`;

const DEFAULT_TODO_TEXTS = ["检查今天的优先任务", "整理桌面上的临时文件"];

// Tuned baseline from user: 2560x1600 @ 150% scale -> 77 / 98 / 72 / -7.
const DEFAULT_GRID = {
  baseWidth: 2560,
  baseHeight: 1600,
  cellW: 77,
  cellH: 98,
  offsetX: 72,
  offsetY: -7,
  opacity: 0.24,
};

const DEFAULT_WEATHER = {
  effect: "rain",
  enabled: true,
  intensity: 0.56,
  wind: 0.35,
  opacity: 0.72,
  coverage: 0.58,
};

const PRESET_BACKGROUNDS = [
  {
    id: "coastline",
    label: "Coastline",
    image:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%230b1d3a'/%3E%3Cstop offset='55%' stop-color='%23143b57'/%3E%3Cstop offset='100%' stop-color='%23285f79'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.75' cy='0.15' r='0.55'%3E%3Cstop offset='0%' stop-color='%234ecdc4' stop-opacity='0.42'/%3E%3Cstop offset='100%' stop-color='%234ecdc4' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 650 Q250 560 540 640 T1100 630 T1600 680 L1600 900 L0 900 Z' fill='%23061121' fill-opacity='0.66'/%3E%3C/svg%3E\")",
  },
  {
    id: "sunset",
    label: "Sunset",
    image:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23231a3a'/%3E%3Cstop offset='45%' stop-color='%233f2f58'/%3E%3Cstop offset='100%' stop-color='%235f4d66'/%3E%3C/linearGradient%3E%3CradialGradient id='sun' cx='0.75' cy='0.34' r='0.30'%3E%3Cstop offset='0%' stop-color='%23f7d580' stop-opacity='0.95'/%3E%3Cstop offset='100%' stop-color='%23f7d580' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23sun)'/%3E%3Cpath d='M0 700 C260 590 520 740 800 670 C1060 600 1320 760 1600 700 L1600 900 L0 900 Z' fill='%23130f22' fill-opacity='0.72'/%3E%3C/svg%3E\")",
  },
  {
    id: "forest",
    label: "Forest",
    image:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%23081617'/%3E%3Cstop offset='58%' stop-color='%23113b31'/%3E%3Cstop offset='100%' stop-color='%232a574b'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.22' cy='0.22' r='0.5'%3E%3Cstop offset='0%' stop-color='%23f2c14e' stop-opacity='0.22'/%3E%3Cstop offset='100%' stop-color='%23f2c14e' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 710 L170 520 L280 710 ZM210 710 L380 470 L550 710 ZM510 710 L720 430 L920 710 ZM860 710 L1060 500 L1260 710 ZM1180 710 L1380 470 L1600 710 Z' fill='%23061313' fill-opacity='0.42'/%3E%3C/svg%3E\")",
  },
];

const savedSnapshot = readStorageMaybe(STORAGE_KEYS.snapshot);
const initialDailyState = buildInitialDailyState(savedSnapshot);
const VIEW_CONTEXT = readViewContext();

const state = {
  backgroundId: savedSnapshot?.backgroundId ?? readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id),
  backgroundCustom: savedSnapshot?.backgroundCustom ?? readStorage(STORAGE_KEYS.customBackground, ""),
  backgroundCustomFile: savedSnapshot?.backgroundCustomFile || readStorage(STORAGE_KEYS.customBackgroundFile, ""),
  backgroundCustomUrl: "",
  weather: normalizeWeather(savedSnapshot?.weather ?? readStorage(STORAGE_KEYS.weather, DEFAULT_WEATHER)),
  memo: "",
  todos: [],
  grid: normalizeGrid(savedSnapshot?.grid ?? readStorage(STORAGE_KEYS.grid, DEFAULT_GRID)),
  dailyRecords: initialDailyState.dailyRecords,
  selectedDateKey: initialDailyState.selectedDateKey,
  calendarMonthKey: initialDailyState.calendarMonthKey,
  todayKeyCache: getTodayKey(),
  startup: {
    supported: false,
    enabled: false,
    defaultEnabled: true,
    pending: false,
  },
};

const el = {
  backgroundLayer: document.querySelector("#backgroundLayer"),
  weatherLayer: document.querySelector("#weatherLayer"),
  weatherCanvas: document.querySelector("#weatherCanvas"),
  weatherGlow: document.querySelector("#weatherGlow"),
  weatherClouds: document.querySelector("#weatherClouds"),
  weatherFog: document.querySelector("#weatherFog"),
  openBackgroundModal: document.querySelector("#openBackgroundModal"),
  closeBackgroundModal: document.querySelector("#closeBackgroundModal"),
  backgroundModal: document.querySelector("#backgroundModal"),
  openCalendarModal: document.querySelector("#openCalendarModal"),
  closeCalendarModal: document.querySelector("#closeCalendarModal"),
  calendarModal: document.querySelector("#calendarModal"),
  toggleWeatherPanel: document.querySelector("#toggleWeatherPanel"),
  weatherPanel: document.querySelector("#weatherPanel"),
  weatherModeGroup: document.querySelector("#weatherModeGroup"),
  weatherIntensity: document.querySelector("#weatherIntensity"),
  weatherIntensityValue: document.querySelector("#weatherIntensityValue"),
  weatherWind: document.querySelector("#weatherWind"),
  weatherWindValue: document.querySelector("#weatherWindValue"),
  weatherOpacity: document.querySelector("#weatherOpacity"),
  weatherOpacityValue: document.querySelector("#weatherOpacityValue"),
  weatherCoverage: document.querySelector("#weatherCoverage"),
  weatherCoverageValue: document.querySelector("#weatherCoverageValue"),
  weatherRuntimeHint: document.querySelector("#weatherRuntimeHint"),
  resetWeatherBtn: document.querySelector("#resetWeatherBtn"),
  openStartupModal: document.querySelector("#openStartupModal"),
  restartAppBtn: document.querySelector("#restartAppBtn"),
  closeStartupModal: document.querySelector("#closeStartupModal"),
  startupModal: document.querySelector("#startupModal"),
  backgroundOptions: document.querySelector("#backgroundOptions"),
  backgroundUpload: document.querySelector("#backgroundUpload"),
  toggleGridPanel: document.querySelector("#toggleGridPanel"),
  gridPanel: document.querySelector("#gridPanel"),
  gridBaseWidth: document.querySelector("#gridBaseWidth"),
  gridBaseHeight: document.querySelector("#gridBaseHeight"),
  gridCellWidth: document.querySelector("#gridCellWidth"),
  gridCellHeight: document.querySelector("#gridCellHeight"),
  gridOffsetX: document.querySelector("#gridOffsetX"),
  gridOffsetY: document.querySelector("#gridOffsetY"),
  gridOpacity: document.querySelector("#gridOpacity"),
  gridRuntimeHint: document.querySelector("#gridRuntimeHint"),
  resetGridBtn: document.querySelector("#resetGridBtn"),
  exportConfigBtn: document.querySelector("#exportConfigBtn"),
  configUpload: document.querySelector("#configUpload"),
  resetDataBtn: document.querySelector("#resetDataBtn"),
  timeValue: document.querySelector("#timeValue"),
  dateValue: document.querySelector("#dateValue"),
  selectedDateTrigger: document.querySelector("#selectedDateTrigger"),
  selectedDatePassiveLabel: document.querySelector("#selectedDatePassiveLabel"),
  selectedDateMeta: document.querySelector("#selectedDateMeta"),
  memoInput: document.querySelector("#memoInput"),
  memoPreview: document.querySelector("#memoPreview"),
  memoEditBtn: document.querySelector("#memoEditBtn"),
  memoPreviewBtn: document.querySelector("#memoPreviewBtn"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoDeadlineField: document.querySelector("#todoDeadlineField"),
  todoDeadlineInput: document.querySelector("#todoDeadlineInput"),
  todoStatus: document.querySelector("#todoStatus"),
  todoList: document.querySelector("#todoList"),
  todoTemplate: document.querySelector("#todoTemplate"),
  calendarPrevMonth: document.querySelector("#calendarPrevMonth"),
  calendarNextMonth: document.querySelector("#calendarNextMonth"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarSelectedLabel: document.querySelector("#calendarSelectedLabel"),
  calendarSelectedStatus: document.querySelector("#calendarSelectedStatus"),
  calendarMemoPreview: document.querySelector("#calendarMemoPreview"),
  calendarTodoPreview: document.querySelector("#calendarTodoPreview"),
  calendarGoToday: document.querySelector("#calendarGoToday"),
  launchAtStartupToggle: document.querySelector("#launchAtStartupToggle"),
  launchAtStartupStatus: document.querySelector("#launchAtStartupStatus"),
};

const NATIVE_BRIDGE = window.IvoryNativeBridge.create();
const STARTUP_SETTINGS = window.IvoryStartupSettings.create({
  state,
  elements: el,
  viewContext: VIEW_CONTEXT,
  nativeBridge: NATIVE_BRIDGE,
});
const WEATHER_RENDERER = window.IvoryWeatherRenderer.create({
  elements: el,
  viewContext: VIEW_CONTEXT,
});

init().catch((error) => {
  console.error("Initialization failed:", error);
});

async function init() {
  state.grid = migrateGrid(state.grid);
  applyDailyCarryOverOnFirstLaunch();
  persistWeather({ skipSnapshot: true });
  persistGrid({ skipSnapshot: true });
  hydrateSelectedDayState();
  mirrorCurrentDayLegacyStorage();
  persistSelectionState({ skipSnapshot: true });
  saveStorage(STORAGE_KEYS.dailyRecords, state.dailyRecords, { skipSnapshot: true });
  await migrateLegacyCustomBackgroundIfNeeded();
  await refreshCustomBackgroundUrl();
  persistSnapshot();
  applyBackground();
  applyWeather();
  renderBackgroundOptions();
  applyWindowRoleUI();
  applyGridAndLayout();
  syncWeatherInputs();
  syncGridInputs();
  syncTodoDeadlineField();
  initClock();
  initMemo();
  renderTodos();
  renderSelectedDateUI();
  renderCalendar();
  bindEvents();
  await STARTUP_SETTINGS.refresh();
  window.addEventListener("beforeunload", cleanupCustomBackgroundUrl);
  window.addEventListener("beforeunload", () => WEATHER_RENDERER.destroy());
  window.addEventListener("storage", handleStorageSync);

  if (!VIEW_CONTEXT.isEditor) {
    window.setInterval(() => {
      try {
        const weather = readStorage(STORAGE_KEYS.weather, DEFAULT_WEATHER);
        if (JSON.stringify(weather) !== JSON.stringify(state.weather)) {
          state.weather = normalizeWeather(weather);
          applyWeather();
          syncWeatherInputs();
        }
        const backgroundId = readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id);
        if (backgroundId !== state.backgroundId) {
          state.backgroundId = backgroundId;
          applyBackground();
        }
        const customBgFile = readStorage(STORAGE_KEYS.customBackgroundFile, "");
        if (customBgFile !== state.backgroundCustomFile) {
          state.backgroundCustomFile = customBgFile;
          applyBackground();
        }
      } catch (e) {
        console.warn("Passive settings sync failed:", e);
      }
    }, 1800);
  }
}

function bindEvents() {
  el.openBackgroundModal.addEventListener("click", () => openModal(el.backgroundModal));
  el.closeBackgroundModal.addEventListener("click", () => closeModal(el.backgroundModal));
  el.openCalendarModal.addEventListener("click", () => openModal(el.calendarModal));
  el.closeCalendarModal.addEventListener("click", () => closeModal(el.calendarModal));
  el.toggleWeatherPanel?.addEventListener("click", () => {
    el.weatherPanel?.classList.toggle("is-hidden");
  });
  el.openStartupModal?.addEventListener("click", () => {
    openModal(el.startupModal);
    STARTUP_SETTINGS.refresh().catch((error) => {
      console.error("Refresh startup settings failed:", error);
    });
  });
  el.closeStartupModal?.addEventListener("click", () => closeModal(el.startupModal));
  el.restartAppBtn?.addEventListener("click", () => restartApplication());
  el.selectedDateTrigger.addEventListener("click", () => openModal(el.calendarModal));

  [el.backgroundModal, el.calendarModal, el.startupModal].forEach((modal) => {
    if (!modal) {
      return;
    }
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal(el.backgroundModal);
      closeModal(el.calendarModal);
      closeModal(el.startupModal);
      el.weatherPanel?.classList.add("is-hidden");
      el.gridPanel.classList.add("is-hidden");
    }
  });

  el.backgroundUpload.addEventListener("change", (event) => {
    handleBackgroundUpload(event).catch((error) => {
      console.error("Background upload failed:", error);
      window.alert("背景上传失败，请重试。");
    });
  });

  el.toggleGridPanel.addEventListener("click", () => {
    el.gridPanel.classList.toggle("is-hidden");
  });

  el.weatherModeGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-weather-mode]");
    if (!button) {
      return;
    }
    setWeatherMode(button.dataset.weatherMode || "off");
  });

  [el.weatherIntensity, el.weatherWind, el.weatherOpacity, el.weatherCoverage].forEach((input) => {
    input?.addEventListener("input", syncWeatherFromInputs);
  });

  el.resetWeatherBtn?.addEventListener("click", () => {
    state.weather = normalizeWeather(DEFAULT_WEATHER);
    persistWeather();
    applyWeather();
    syncWeatherInputs();
  });

  [
    el.gridBaseWidth,
    el.gridBaseHeight,
    el.gridCellWidth,
    el.gridCellHeight,
    el.gridOffsetX,
    el.gridOffsetY,
    el.gridOpacity,
  ].forEach((input) => {
    input.addEventListener("input", syncGridFromInputs);
  });

  el.resetGridBtn.addEventListener("click", () => {
    state.grid = normalizeGrid(DEFAULT_GRID);
    persistGrid();
    applyGridAndLayout();
    syncGridInputs();
  });

  el.exportConfigBtn.addEventListener("click", () => {
    exportConfig().catch((error) => {
      console.error("Export config failed:", error);
      window.alert("保存配置失败，请重试。");
    });
  });

  el.configUpload.addEventListener("change", (event) => {
    importConfigFromFile(event).catch((error) => {
      console.error("Import config failed:", error);
      window.alert("加载配置失败，请检查 JSON 文件。");
      event.target.value = "";
    });
  });

  el.resetDataBtn.addEventListener("click", () => {
    const label = formatDateLabel(state.selectedDateKey, { includeWeekday: true, useShortWeekday: false });
    const confirmed = window.confirm(`清空 ${label} 的备忘录和 Todo 记录？`);
    if (!confirmed) {
      return;
    }
    delete state.dailyRecords[state.selectedDateKey];
    hydrateSelectedDayState();
    saveStorage(STORAGE_KEYS.dailyRecords, state.dailyRecords, { skipSnapshot: true });
    mirrorCurrentDayLegacyStorage();
    persistSelectionState({ skipSnapshot: true });
    persistSnapshot();
    initMemo();
    renderTodos();
    renderSelectedDateUI();
    renderCalendar();
  });

  el.memoInput.addEventListener("input", () => {
    state.memo = el.memoInput.value;
    saveCurrentDayRecord();
    renderMemoPreview();
    renderSelectedDateUI();
    renderCalendar();
  });

  el.memoEditBtn.addEventListener("click", () => switchMemoMode("edit"));
  el.memoPreviewBtn.addEventListener("click", () => switchMemoMode("preview"));

  el.todoDeadlineInput.addEventListener("input", syncTodoDeadlineField);
  el.todoDeadlineInput.addEventListener("change", syncTodoDeadlineField);

  el.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = el.todoInput.value.trim();
    if (!text) {
      return;
    }
    state.todos.push({
      id: makeId(),
      text,
      done: false,
      deadline: normalizeDeadlineInputValue(el.todoDeadlineInput.value),
    });
    el.todoInput.value = "";
    el.todoDeadlineInput.value = "";
    syncTodoDeadlineField();
    saveCurrentDayRecord();
    renderTodos();
    renderSelectedDateUI();
    renderCalendar();
  });

  el.calendarPrevMonth.addEventListener("click", () => {
    state.calendarMonthKey = shiftMonthKey(state.calendarMonthKey, -1);
    persistSelectionState();
    renderCalendar();
  });

  el.calendarNextMonth.addEventListener("click", () => {
    state.calendarMonthKey = shiftMonthKey(state.calendarMonthKey, 1);
    persistSelectionState();
    renderCalendar();
  });

  el.calendarGoToday.addEventListener("click", () => {
    const todayKey = getTodayKey();
    setSelectedDate(todayKey, { syncMonth: true });
  });

  el.launchAtStartupToggle?.addEventListener("change", (event) => {
    STARTUP_SETTINGS.handleToggle(event).catch((error) => {
      console.error("Toggle startup setting failed:", error);
      STARTUP_SETTINGS.setStatusMessage(error.message || "切换开机自启失败，请重试。");
    });
  });

  window.addEventListener("resize", applyGridAndLayout);
}

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).format(now);
  el.timeValue.textContent = time;
  el.dateValue.textContent = date;

  const todayKey = getTodayKey(now);
  if (todayKey !== state.todayKeyCache) {
    state.todayKeyCache = todayKey;
    renderSelectedDateUI();
    renderCalendar();
  }
}

function renderBackgroundOptions() {
  el.backgroundOptions.innerHTML = "";

  PRESET_BACKGROUNDS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bg-option${state.backgroundId === preset.id ? " is-active" : ""}`;
    button.style.backgroundImage = preset.image;
    button.setAttribute("aria-label", preset.label);
    button.addEventListener("click", () => {
      state.backgroundId = preset.id;
      saveStorage(STORAGE_KEYS.background, state.backgroundId);
      applyBackground();
      renderBackgroundOptions();
      closeModal(el.backgroundModal);
    });
    el.backgroundOptions.append(button);
  });

  const customUrl = getRenderableCustomBackground();
  if (customUrl) {
    const customButton = document.createElement("button");
    customButton.type = "button";
    customButton.className = `bg-option${state.backgroundId === "custom" ? " is-active" : ""}`;
    customButton.style.backgroundImage = `url("${customUrl}")`;
    customButton.setAttribute("aria-label", "Custom");
    customButton.addEventListener("click", () => {
      state.backgroundId = "custom";
      saveStorage(STORAGE_KEYS.background, state.backgroundId);
      applyBackground();
      renderBackgroundOptions();
      closeModal(el.backgroundModal);
    });
    el.backgroundOptions.append(customButton);
  }
}

function applyBackground() {
  const customUrl = getRenderableCustomBackground();
  if (state.backgroundId === "custom" && customUrl) {
    el.backgroundLayer.style.backgroundImage = `url("${customUrl}")`;
    scheduleSystemWallpaperSync();
    return;
  }
  const matched = PRESET_BACKGROUNDS.find((item) => item.id === state.backgroundId) || PRESET_BACKGROUNDS[0];
  el.backgroundLayer.style.backgroundImage = matched.image;
  scheduleSystemWallpaperSync();
}

function scheduleSystemWallpaperSync() {
  if (!NATIVE_BRIDGE.available || VIEW_CONTEXT.isEditor) {
    return;
  }

  window.clearTimeout(scheduleSystemWallpaperSync.timer);
  scheduleSystemWallpaperSync.timer = window.setTimeout(() => {
    syncSystemWallpaper().catch((error) => {
      console.warn("System wallpaper sync failed:", error);
    });
  }, 300);
}

async function syncSystemWallpaper() {
  if (state.backgroundId === "custom" && state.backgroundCustomFile) {
    await NATIVE_BRIDGE.invoke("syncSystemWallpaperFile", { path: state.backgroundCustomFile });
    return;
  }

  const sourceUrl = getCurrentBackgroundSourceUrl();
  if (!sourceUrl) {
    return;
  }

  const dataUrl = await renderBackgroundSourceToPngDataUrl(sourceUrl);
  await NATIVE_BRIDGE.invoke("syncSystemWallpaper", { dataUrl });
}

function getCurrentBackgroundSourceUrl() {
  const customUrl = getRenderableCustomBackground();
  if (state.backgroundId === "custom" && customUrl) {
    return customUrl;
  }

  const matched = PRESET_BACKGROUNDS.find((item) => item.id === state.backgroundId) || PRESET_BACKGROUNDS[0];
  return extractCssBackgroundUrl(matched.image);
}

function extractCssBackgroundUrl(value) {
  const match = String(value || "").match(/^url\((['"]?)(.*)\1\)$/);
  return match ? match[2] : "";
}

async function renderBackgroundSourceToPngDataUrl(sourceUrl) {
  const image = await loadImage(sourceUrl);
  const width = Math.max(1, Math.round(window.innerWidth * (window.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(window.innerHeight * (window.devicePixelRatio || 1)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  ctx.fillStyle = "#04101b";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL("image/png");
}

function loadImage(sourceUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load wallpaper image: ${sourceUrl.slice(0, 120)}`));
    image.src = sourceUrl;
  });
}

async function handleBackgroundUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    await saveCustomBackgroundBlob(file);
    state.backgroundCustomFile = "";
    saveStorage(STORAGE_KEYS.customBackgroundFile, "", { skipSnapshot: true });
    await refreshCustomBackgroundUrl();
  } catch {
    state.backgroundCustom = await readFileAsDataUrl(file);
    state.backgroundCustomFile = "";
    saveStorage(STORAGE_KEYS.customBackgroundFile, "", { skipSnapshot: true });
    try {
      saveStorage(STORAGE_KEYS.customBackground, state.backgroundCustom);
    } catch (error) {
      console.warn("Inline background persistence failed:", error);
    }
    cleanupCustomBackgroundUrl();
  }

  state.backgroundId = "custom";
  saveStorage(STORAGE_KEYS.background, state.backgroundId);
  applyBackground();
  renderBackgroundOptions();
  closeModal(el.backgroundModal);
  event.target.value = "";
}

function openModal(modal) {
  modal.classList.remove("is-hidden");
}

function closeModal(modal) {
  modal.classList.add("is-hidden");
}

async function restartApplication() {
  if (!NATIVE_BRIDGE.available) {
    alert("当前预览环境不支持应用内重启，请手动重启程序。");
    return;
  }

  el.restartAppBtn.disabled = true;
  el.restartAppBtn.textContent = "正在重启...";
  try {
    await NATIVE_BRIDGE.invoke("restartApp");
  } catch (error) {
    console.error("Restart application failed:", error);
    el.restartAppBtn.disabled = false;
    el.restartAppBtn.textContent = "重启应用";
    alert(error.message || "重启失败，请手动重启程序。");
  }
}

function applyWindowRoleUI() {
  document.body.dataset.ivoryRole = VIEW_CONTEXT.role;
  document.body.classList.toggle("is-editor-role", VIEW_CONTEXT.isEditor);
  document.body.classList.toggle("is-wallpaper-role", !VIEW_CONTEXT.isEditor);

  if (!VIEW_CONTEXT.isEditor) {
    closeModal(el.backgroundModal);
    closeModal(el.calendarModal);
    closeModal(el.startupModal);
    el.weatherPanel?.classList.add("is-hidden");
    el.gridPanel.classList.add("is-hidden");
  }
}

function syncTodoDeadlineField() {
  if (!el.todoDeadlineField || !el.todoDeadlineInput) {
    return;
  }
  el.todoDeadlineField.classList.toggle("is-empty", !el.todoDeadlineInput.value);
}

function handleStorageSync(event) {
  if (!event.key || !Object.values(STORAGE_KEYS).includes(event.key)) {
    return;
  }

  if (event.key === STORAGE_KEYS.snapshot) {
    const snapshot = readStorageMaybe(STORAGE_KEYS.snapshot);
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }
    applySnapshotState(snapshot);
    return;
  }

  if (event.key === STORAGE_KEYS.background) {
    state.backgroundId = readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id);
    applyBackground();
    renderBackgroundOptions();
    return;
  }

  if (event.key === STORAGE_KEYS.weather) {
    state.weather = normalizeWeather(readStorage(STORAGE_KEYS.weather, DEFAULT_WEATHER));
    applyWeather();
    syncWeatherInputs();
    return;
  }

  if (event.key === STORAGE_KEYS.customBackground) {
    state.backgroundCustom = readStorage(STORAGE_KEYS.customBackground, "");
    refreshCustomBackgroundUrl()
      .then(() => {
        applyBackground();
        renderBackgroundOptions();
      })
      .catch((error) => {
        console.warn("Custom background sync failed:", error);
      });
    return;
  }

  if (event.key === STORAGE_KEYS.customBackgroundFile) {
    state.backgroundCustomFile = readStorage(STORAGE_KEYS.customBackgroundFile, "");
    applyBackground();
    renderBackgroundOptions();
    return;
  }

  if (event.key === STORAGE_KEYS.grid) {
    state.grid = normalizeGrid(readStorage(STORAGE_KEYS.grid, DEFAULT_GRID));
    applyGridAndLayout();
    syncGridInputs();
    return;
  }

  if (event.key === STORAGE_KEYS.dailyRecords) {
    state.dailyRecords = normalizeDailyRecords(readStorageMaybe(STORAGE_KEYS.dailyRecords));
    hydrateSelectedDayState();
    initMemo();
    renderTodos();
    renderSelectedDateUI();
    renderCalendar();
    return;
  }

  if (event.key === STORAGE_KEYS.selectedDateKey) {
    state.selectedDateKey = sanitizeDateKey(readStorageMaybe(STORAGE_KEYS.selectedDateKey), getTodayKey());
    hydrateSelectedDayState();
    initMemo();
    renderTodos();
    renderSelectedDateUI();
    renderCalendar();
    return;
  }

  if (event.key === STORAGE_KEYS.calendarMonthKey) {
    state.calendarMonthKey = sanitizeMonthKey(
      readStorageMaybe(STORAGE_KEYS.calendarMonthKey),
      getMonthKey(state.selectedDateKey)
    );
    renderCalendar();
  }
}

function applySnapshotState(snapshot) {
  state.backgroundId = String(snapshot.backgroundId || PRESET_BACKGROUNDS[0].id);
  state.backgroundCustom = String(snapshot.backgroundCustom || "");
  state.backgroundCustomFile = String(snapshot.backgroundCustomFile || readStorage(STORAGE_KEYS.customBackgroundFile, ""));
  state.weather = normalizeWeather(snapshot.weather ?? state.weather);
  state.grid = normalizeGrid(snapshot.grid || DEFAULT_GRID);
  state.dailyRecords = normalizeDailyRecords(snapshot.dailyRecords);
  state.selectedDateKey = sanitizeDateKey(snapshot.selectedDateKey, getTodayKey());
  state.calendarMonthKey = sanitizeMonthKey(snapshot.calendarMonthKey, getMonthKey(state.selectedDateKey));

  if (!Object.keys(state.dailyRecords).length) {
    const migrated = buildInitialDailyState(snapshot);
    state.dailyRecords = migrated.dailyRecords;
    state.selectedDateKey = migrated.selectedDateKey;
    state.calendarMonthKey = migrated.calendarMonthKey;
  }

  hydrateSelectedDayState();

  refreshCustomBackgroundUrl()
    .then(() => {
      applyBackground();
      applyWeather();
      renderBackgroundOptions();
    })
    .catch((error) => {
      console.warn("Snapshot background sync failed:", error);
    });

  applyGridAndLayout();
  syncWeatherInputs();
  syncGridInputs();
  initMemo();
  renderTodos();
  renderSelectedDateUI();
  renderCalendar();
}

function applyGridAndLayout() {
  const root = document.documentElement;
  const dpr = window.devicePixelRatio || 1;
  const physicalWidth = window.innerWidth * dpr;
  const physicalHeight = window.innerHeight * dpr;
  const scaleX = physicalWidth / state.grid.baseWidth;
  const scaleY = physicalHeight / state.grid.baseHeight;

  const effective = {
    cellW: Number((state.grid.cellW * scaleX).toFixed(2)),
    cellH: Number((state.grid.cellH * scaleY).toFixed(2)),
    offsetX: Number((state.grid.offsetX * scaleX).toFixed(2)),
    offsetY: Number((state.grid.offsetY * scaleY).toFixed(2)),
    opacity: state.grid.opacity,
  };

  root.style.setProperty("--icon-grid-w", `${effective.cellW}px`);
  root.style.setProperty("--icon-grid-h", `${effective.cellH}px`);
  root.style.setProperty("--icon-grid-offset-x", `${effective.offsetX}px`);
  root.style.setProperty("--icon-grid-offset-y", `${effective.offsetY}px`);
  root.style.setProperty("--icon-grid-opacity", `${effective.opacity}`);

  const clockTop = clampFloat(effective.offsetY + effective.cellH * 0.8, 20, window.innerHeight * 0.38, 2);
  const clockWidth = clampFloat(effective.cellW * 5.8, 360, window.innerWidth - 30, 2);
  const panelBottom = clampFloat(effective.cellH * 0.82, 16, window.innerHeight * 0.24, 2);
  const panelWidth = clampFloat(effective.cellW * 13.6, 720, window.innerWidth - 36, 2);
  const panelHeight = clampFloat(effective.cellH * 4.45, 300, window.innerHeight * 0.62, 2);

  root.style.setProperty("--clock-top", `${clockTop}px`);
  root.style.setProperty("--clock-width", `${clockWidth}px`);
  root.style.setProperty("--panel-bottom", `${panelBottom}px`);
  root.style.setProperty("--panel-width", `${panelWidth}px`);
  root.style.setProperty("--panel-height", `${panelHeight}px`);

  el.gridRuntimeHint.textContent =
    `当前换算: cell ${effective.cellW.toFixed(1)} x ${effective.cellH.toFixed(1)}, ` +
    `offset ${effective.offsetX.toFixed(1)}, ${effective.offsetY.toFixed(1)} | ` +
    `dpr ${dpr.toFixed(2)} | physical ${physicalWidth.toFixed(0)}x${physicalHeight.toFixed(0)}`;
  syncWeatherMetrics();
}

function syncGridInputs() {
  el.gridBaseWidth.value = String(state.grid.baseWidth);
  el.gridBaseHeight.value = String(state.grid.baseHeight);
  el.gridCellWidth.value = String(state.grid.cellW);
  el.gridCellHeight.value = String(state.grid.cellH);
  el.gridOffsetX.value = String(state.grid.offsetX);
  el.gridOffsetY.value = String(state.grid.offsetY);
  el.gridOpacity.value = String(state.grid.opacity);
}

function syncGridFromInputs() {
  state.grid = normalizeGrid({
    baseWidth: el.gridBaseWidth.value,
    baseHeight: el.gridBaseHeight.value,
    cellW: el.gridCellWidth.value,
    cellH: el.gridCellHeight.value,
    offsetX: el.gridOffsetX.value,
    offsetY: el.gridOffsetY.value,
    opacity: el.gridOpacity.value,
  });
  persistGrid();
  applyGridAndLayout();
  syncGridInputs();
}

function persistGrid(options = {}) {
  saveStorage(STORAGE_KEYS.grid, state.grid, options);
}

function persistWeather(options = {}) {
  saveStorage(STORAGE_KEYS.weather, state.weather, options);
}

function setWeatherMode(mode) {
  if (["sunny", "rain", "snow", "cloudy", "foggy", "hail"].includes(mode)) {
    state.weather = normalizeWeather({
      ...state.weather,
      effect: mode,
      enabled: true,
    });
  } else {
    state.weather = normalizeWeather({
      ...state.weather,
      enabled: false,
    });
  }

  persistWeather();
  applyWeather();
  syncWeatherInputs();
}

function syncWeatherFromInputs() {
  state.weather = normalizeWeather({
    ...state.weather,
    intensity: el.weatherIntensity?.value,
    wind: el.weatherWind?.value,
    opacity: el.weatherOpacity?.value,
    coverage: el.weatherCoverage?.value,
  });

  persistWeather();
  applyWeather();
  syncWeatherInputs();
}

function syncWeatherInputs() {
  if (!el.weatherIntensity || !el.weatherWind || !el.weatherOpacity || !el.weatherCoverage) {
    return;
  }

  el.weatherIntensity.value = String(state.weather.intensity);
  el.weatherWind.value = String(state.weather.wind);
  el.weatherOpacity.value = String(state.weather.opacity);
  el.weatherCoverage.value = String(state.weather.coverage);

  if (el.weatherIntensityValue) {
    el.weatherIntensityValue.value = state.weather.intensity.toFixed(2);
    el.weatherIntensityValue.textContent = state.weather.intensity.toFixed(2);
  }

  if (el.weatherWindValue) {
    el.weatherWindValue.value = state.weather.wind.toFixed(2);
    el.weatherWindValue.textContent = `${state.weather.wind > 0 ? "+" : ""}${state.weather.wind.toFixed(2)}`;
  }

  if (el.weatherOpacityValue) {
    el.weatherOpacityValue.value = state.weather.opacity.toFixed(2);
    el.weatherOpacityValue.textContent = state.weather.opacity.toFixed(2);
  }

  if (el.weatherCoverageValue) {
    el.weatherCoverageValue.value = state.weather.coverage.toFixed(2);
    el.weatherCoverageValue.textContent = state.weather.coverage.toFixed(2);
  }

  const activeMode = state.weather.enabled ? state.weather.effect : "off";
  el.weatherModeGroup?.querySelectorAll("[data-weather-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.weatherMode === activeMode);
  });

  if (el.weatherRuntimeHint) {
    const modeLabels = {
      off: "关闭",
      sunny: "晴天",
      rain: "下雨",
      snow: "下雪",
      cloudy: "多云",
      foggy: "大雾",
      hail: "冰雹",
    };
    const modeLabel = modeLabels[activeMode] || "关闭";
    const windLabel =
      state.weather.wind > 0.08 ? "向右偏移" : state.weather.wind < -0.08 ? "向左偏移" : "基本垂直";
    el.weatherRuntimeHint.textContent =
      `当前效果: ${modeLabel} | 强度 ${state.weather.intensity.toFixed(2)} | ${windLabel} | 透明度 ${state.weather.opacity.toFixed(2)} | 覆盖 ${state.weather.coverage.toFixed(2)}`;
  }
}

function persistSnapshot() {
  saveStorage(
    STORAGE_KEYS.snapshot,
    {
      version: 3,
      savedAt: new Date().toISOString(),
      backgroundId: state.backgroundId,
      backgroundCustom: state.backgroundCustom,
      backgroundCustomFile: state.backgroundCustomFile,
      weather: state.weather,
      grid: state.grid,
      selectedDateKey: state.selectedDateKey,
      calendarMonthKey: state.calendarMonthKey,
      dailyRecords: state.dailyRecords,
      memo: state.memo,
      todos: state.todos,
    },
    { skipSnapshot: true }
  );
}

function persistSelectionState(options = {}) {
  saveStorage(STORAGE_KEYS.selectedDateKey, state.selectedDateKey, { skipSnapshot: true, ...options });
  saveStorage(STORAGE_KEYS.calendarMonthKey, state.calendarMonthKey, { skipSnapshot: true, ...options });
  if (!options.skipSnapshot) {
    persistSnapshot();
  }
}

function mirrorCurrentDayLegacyStorage() {
  saveStorage(STORAGE_KEYS.memo, state.memo, { skipSnapshot: true });
  saveStorage(STORAGE_KEYS.todos, state.todos, { skipSnapshot: true });
}

function hydrateSelectedDayState() {
  const record = getDayRecord(state.selectedDateKey);
  state.memo = record.memo;
  state.todos = normalizeTodos(record.todos);
}

function getDayRecord(dateKey) {
  return normalizeDayRecord(state.dailyRecords[dateKey]);
}

function saveCurrentDayRecord() {
  const previous = normalizeDayRecord(state.dailyRecords[state.selectedDateKey]);
  state.todos = sortTodos(state.todos);
  const nextRecord = normalizeDayRecord({
    memo: state.memo,
    todos: state.todos,
    updatedAt: new Date().toISOString(),
  });

  state.dailyRecords[state.selectedDateKey] = {
    memo: nextRecord.memo,
    todos: nextRecord.todos,
    updatedAt: nextRecord.updatedAt || previous.updatedAt || new Date().toISOString(),
  };

  saveStorage(STORAGE_KEYS.dailyRecords, state.dailyRecords, { skipSnapshot: true });
  mirrorCurrentDayLegacyStorage();
  persistSelectionState({ skipSnapshot: true });
  persistSnapshot();
}

function setSelectedDate(dateKey, options = {}) {
  state.selectedDateKey = sanitizeDateKey(dateKey, getTodayKey());
  if (options.syncMonth !== false) {
    state.calendarMonthKey = getMonthKey(state.selectedDateKey);
  }
  hydrateSelectedDayState();
  mirrorCurrentDayLegacyStorage();
  persistSelectionState({ skipSnapshot: true });
  persistSnapshot();
  initMemo();
  renderTodos();
  renderSelectedDateUI();
  renderCalendar();
}

function renderSelectedDateUI() {
  const record = getDayRecord(state.selectedDateKey);
  const stats = getTodoStats(record.todos);
  const dateLabel = formatDateLabel(state.selectedDateKey, {
    includeWeekday: true,
    useShortWeekday: false,
  });
  el.selectedDateTrigger.textContent = dateLabel;
  if (el.selectedDatePassiveLabel) {
    el.selectedDatePassiveLabel.textContent = dateLabel;
  }
  el.selectedDateMeta.textContent = buildDayStatusText(record, stats, state.selectedDateKey);
}

function initMemo() {
  el.memoInput.value = state.memo;
  renderMemoPreview();
  switchMemoMode("preview");
}

function switchMemoMode(mode) {
  const isEdit = mode === "edit";
  el.memoInput.classList.toggle("is-hidden", !isEdit);
  el.memoPreview.classList.toggle("is-hidden", isEdit);
  el.memoEditBtn.classList.toggle("is-active", isEdit);
  el.memoPreviewBtn.classList.toggle("is-active", !isEdit);
}

function renderMemoPreview() {
  el.memoPreview.innerHTML = markdownToHtml(state.memo);
}

function renderTodos() {
  el.todoList.innerHTML = "";
  state.todos = sortTodos(state.todos);
  const stats = getTodoStats(state.todos);
  el.todoStatus.textContent = `${stats.total} 项待办，已完成 ${stats.done} 项`;

  state.todos.forEach((todo) => {
    const item = el.todoTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector(".todo-checkbox");
    const text = item.querySelector(".todo-text");
    const deadline = item.querySelector(".todo-deadline");
    const edit = item.querySelector(".todo-edit");
    const remove = item.querySelector(".todo-remove");

    checkbox.checked = todo.done;
    checkbox.disabled = !VIEW_CONTEXT.isEditor;
    edit.disabled = !VIEW_CONTEXT.isEditor;
    text.textContent = todo.text;
    deadline.textContent = formatTodoDeadline(todo.deadline, todo.done);
    deadline.classList.toggle("is-overdue", isTodoOverdue(todo));

    checkbox.addEventListener("change", () => {
      todo.done = checkbox.checked;
      saveCurrentDayRecord();
      renderTodos();
      renderSelectedDateUI();
      renderCalendar();
    });

    edit.addEventListener("click", () => {
      const nextText = window.prompt("编辑待办内容", todo.text);
      if (nextText === null) {
        return;
      }
      const trimmed = nextText.trim().slice(0, 120);
      if (!trimmed) {
        window.alert("待办内容不能为空。");
        return;
      }
      const currentDeadlineInput = todo.deadline ? toDateTimeLocalValue(todo.deadline) : "";
      const nextDeadlineInput = window.prompt(
        "编辑截止时间，格式例如 2026-03-25T18:30，留空表示无截止时间",
        currentDeadlineInput
      );
      if (nextDeadlineInput === null) {
        return;
      }
      todo.text = trimmed;
      todo.deadline = normalizeDeadlineInputValue(nextDeadlineInput);
      saveCurrentDayRecord();
      renderTodos();
      renderSelectedDateUI();
      renderCalendar();
    });

    remove.addEventListener("click", () => {
      state.todos = state.todos.filter((row) => row.id !== todo.id);
      saveCurrentDayRecord();
      renderTodos();
      renderSelectedDateUI();
      renderCalendar();
    });

    el.todoList.append(item);
  });
}

function renderCalendar() {
  const monthKey = sanitizeMonthKey(state.calendarMonthKey, getMonthKey(state.selectedDateKey));
  state.calendarMonthKey = monthKey;
  el.calendarMonthLabel.textContent = formatMonthLabel(monthKey);
  el.calendarGrid.innerHTML = "";

  const monthDate = parseDateKey(monthKey);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(current);
    const record = getDayRecord(dateKey);
    const isOutside = getMonthKey(dateKey) !== monthKey;
    const isToday = dateKey === state.todayKeyCache;
    const isSelected = dateKey === state.selectedDateKey;
    const isRecorded = hasRecordedDay(record);

    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "calendar-day",
      isOutside ? "is-outside" : "",
      isToday ? "is-today" : "",
      isSelected ? "is-selected" : "",
      isRecorded ? "is-recorded" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const note = getCalendarDayPreviewText(record);
    const tag = isToday ? "今天" : isRecorded ? "已记" : "空白";

    button.innerHTML = `
      <div class="calendar-day-head">
        <span class="calendar-day-number">${current.getDate()}</span>
        <span class="calendar-day-tag">${tag}</span>
      </div>
      <p class="calendar-day-note">${escapeHtml(note)}</p>
      <span class="calendar-day-dot" aria-hidden="true"></span>
    `;

    button.addEventListener("click", () => {
      setSelectedDate(dateKey, { syncMonth: false });
      renderCalendarSidebar();
    });

    el.calendarGrid.append(button);
  }

  renderCalendarSidebar();
}

function renderCalendarSidebar() {
  const record = getDayRecord(state.selectedDateKey);
  const stats = getTodoStats(record.todos);
  el.calendarSelectedLabel.textContent = formatDateLabel(state.selectedDateKey, {
    includeWeekday: true,
    useShortWeekday: false,
  });
  el.calendarSelectedStatus.textContent = buildDayStatusText(record, stats, state.selectedDateKey, {
    includeTime: true,
  });

  const memoPreview = getMemoPreviewText(record.memo);
  el.calendarMemoPreview.textContent = memoPreview || "当天还没有备忘录内容。";

  el.calendarTodoPreview.innerHTML = "";
  if (!record.todos.length) {
    const empty = document.createElement("li");
    empty.className = "calendar-empty-todos";
    empty.textContent = "当天还没有 Todo 项目。";
    el.calendarTodoPreview.append(empty);
    return;
  }

  record.todos.slice(0, 6).forEach((todo) => {
    const item = document.createElement("li");
    item.className = `calendar-todo-item${todo.done ? " is-done" : ""}`;
    item.textContent = todo.deadline
      ? `${todo.text} · ${formatTodoDeadline(todo.deadline, todo.done, { compact: true })}`
      : todo.text;
    el.calendarTodoPreview.append(item);
  });
}

function getRenderableCustomBackground() {
  return state.backgroundCustomUrl || state.backgroundCustom || filePathToFileUrl(state.backgroundCustomFile) || "";
}

async function migrateLegacyCustomBackgroundIfNeeded() {
  const legacy = state.backgroundCustom;
  if (!legacy || !legacy.startsWith("data:")) {
    return;
  }

  try {
    const blob = dataUrlToBlob(legacy);
    await saveCustomBackgroundBlob(blob);
    state.backgroundCustom = "";
    saveStorage(STORAGE_KEYS.customBackground, "", { skipSnapshot: true });
  } catch (error) {
    console.warn("Legacy background migration skipped:", error);
  }
}

async function refreshCustomBackgroundUrl() {
  try {
    const blob = await loadCustomBackgroundBlob();
    if (!blob) {
      cleanupCustomBackgroundUrl();
      return;
    }
    const nextUrl = URL.createObjectURL(blob);
    setCustomBackgroundUrl(nextUrl);
  } catch (error) {
    console.warn("Load custom background from IndexedDB failed:", error);
    cleanupCustomBackgroundUrl();
  }
}

function setCustomBackgroundUrl(url) {
  cleanupCustomBackgroundUrl();
  state.backgroundCustomUrl = url;
}

function cleanupCustomBackgroundUrl() {
  if (state.backgroundCustomUrl && state.backgroundCustomUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.backgroundCustomUrl);
  }
  state.backgroundCustomUrl = "";
}

async function exportConfig() {
  const serializedBackground = await serializeCustomBackgroundForExport();
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    grid: state.grid,
    weather: state.weather,
    background: {
      id: state.backgroundId,
      custom: serializedBackground,
      customFile: state.backgroundCustomFile,
    },
    selectedDateKey: state.selectedDateKey,
    calendarMonthKey: state.calendarMonthKey,
    dailyRecords: state.dailyRecords,
    memo: state.memo,
    todos: state.todos,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `ivory-config-${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function importConfigFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    await applyImportedConfig(parsed);
  } catch (error) {
    window.alert(`配置文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`);
  } finally {
    event.target.value = "";
  }
}

async function applyImportedConfig(config) {
  if (config.grid) {
    state.grid = normalizeGrid(config.grid);
    persistGrid({ skipSnapshot: true });
  }

  if (config.weather && typeof config.weather === "object") {
    state.weather = normalizeWeather(config.weather);
    persistWeather({ skipSnapshot: true });
  }

  if (config.background && typeof config.background === "object") {
    const nextId = String(config.background.id || PRESET_BACKGROUNDS[0].id);
    const nextCustom = String(config.background.custom || "");
    const nextCustomFile = String(config.background.customFile || "");
    state.backgroundId = nextId;
    state.backgroundCustomFile = nextCustomFile;
    saveStorage(STORAGE_KEYS.customBackgroundFile, state.backgroundCustomFile, { skipSnapshot: true });

    if (nextCustom.startsWith("data:")) {
      const blob = dataUrlToBlob(nextCustom);
      await saveCustomBackgroundBlob(blob);
      await refreshCustomBackgroundUrl();
    } else if (nextCustom) {
      state.backgroundCustom = nextCustom;
      saveStorage(STORAGE_KEYS.customBackground, state.backgroundCustom, { skipSnapshot: true });
      await deleteCustomBackgroundBlob();
      cleanupCustomBackgroundUrl();
    } else {
      state.backgroundCustom = "";
      saveStorage(STORAGE_KEYS.customBackground, "", { skipSnapshot: true });
      await deleteCustomBackgroundBlob();
      cleanupCustomBackgroundUrl();
    }

    saveStorage(STORAGE_KEYS.background, state.backgroundId, { skipSnapshot: true });
  }

  if (config.dailyRecords && typeof config.dailyRecords === "object") {
    state.dailyRecords = normalizeDailyRecords(config.dailyRecords);
  } else {
    const importedDateKey = sanitizeDateKey(config.selectedDateKey, getTodayKey());
    const importedRecord = normalizeDayRecord({
      memo: typeof config.memo === "string" ? config.memo : "",
      todos: Array.isArray(config.todos) ? config.todos : [],
      updatedAt: typeof config.exportedAt === "string" ? config.exportedAt : new Date().toISOString(),
    });
    state.dailyRecords = {};
    if (hasRecordedDay(importedRecord)) {
      state.dailyRecords[importedDateKey] = importedRecord;
    }
  }

  state.selectedDateKey = sanitizeDateKey(
    config.selectedDateKey,
    Object.keys(state.dailyRecords)[0] || getTodayKey()
  );
  state.calendarMonthKey = sanitizeMonthKey(config.calendarMonthKey, getMonthKey(state.selectedDateKey));

  hydrateSelectedDayState();
  saveStorage(STORAGE_KEYS.dailyRecords, state.dailyRecords, { skipSnapshot: true });
  persistSelectionState({ skipSnapshot: true });
  mirrorCurrentDayLegacyStorage();
  persistSnapshot();

  applyBackground();
  applyWeather();
  renderBackgroundOptions();
  applyGridAndLayout();
  syncWeatherInputs();
  syncGridInputs();
  initMemo();
  renderTodos();
  renderSelectedDateUI();
  renderCalendar();
}

function markdownToHtml(markdown) {
  const safe = escapeHtml(markdown);
  const lines = safe.split(/\r?\n/);
  const output = [];
  let inList = false;
  let listType = "";

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    const checklist = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)/);
    const bullet = line.match(/^\s*-\s+(.+)/);

    if (heading) {
      closeListIfNeeded();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    if (checklist) {
      if (listType !== "check") {
        closeListIfNeeded();
        output.push('<ul class="md-check">');
        inList = true;
        listType = "check";
      }
      const checked = checklist[1].toLowerCase() === "x";
      const marker = checked ? "☑" : "☐";
      output.push(`<li>${marker} ${inlineMarkdown(checklist[2])}</li>`);
      return;
    }

    if (bullet) {
      if (listType !== "ul") {
        closeListIfNeeded();
        output.push("<ul>");
        inList = true;
        listType = "ul";
      }
      output.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      return;
    }

    if (!line.trim()) {
      closeListIfNeeded();
      return;
    }

    closeListIfNeeded();
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  closeListIfNeeded();
  return output.join("");

  function closeListIfNeeded() {
    if (!inList) {
      return;
    }
    output.push("</ul>");
    inList = false;
    listType = "";
  }
}

function inlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function escapeHtml(value) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value).replace(/[&<>"']/g, (char) => map[char]);
}

function stripMarkdown(value) {
  return String(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCalendarDayPreviewText(record) {
  if (!hasRecordedDay(record)) {
    return "当天还没有记录";
  }
  const memoPreview = getMemoPreviewText(record.memo, 26);
  if (memoPreview) {
    return memoPreview;
  }
  if (record.todos.length) {
    return `${record.todos.length} 项 Todo`;
  }
  return "已修改，当前内容为空";
}

function getMemoPreviewText(memo, maxLength = 180) {
  const clean = stripMarkdown(memo);
  if (!clean) {
    return "";
  }
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength).trim()}…`;
}

function buildDayStatusText(record, stats, dateKey, options = {}) {
  const parts = [];
  if (dateKey === state.todayKeyCache) {
    parts.push("今天");
  }

  if (!hasRecordedDay(record)) {
    parts.push("尚未记录");
    return parts.join(" · ");
  }

  parts.push("已修改");

  if (stats.total > 0) {
    parts.push(`${stats.total} 项待办`);
    if (stats.done > 0) {
      parts.push(`已完成 ${stats.done} 项`);
    }
  } else {
    parts.push("无待办");
  }

  if (options.includeTime && record.updatedAt) {
    parts.push(`更新于 ${formatTime(record.updatedAt)}`);
  }

  return parts.join(" · ");
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "--:--";
  }
}

function normalizeDeadlineValue(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  const normalized = value.trim().replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function normalizeDeadlineInputValue(value) {
  return normalizeDeadlineValue(value);
}

function toDateTimeLocalValue(value) {
  const iso = normalizeDeadlineValue(value);
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function sortTodos(todos) {
  return [...normalizeTodosShallow(todos)].sort(compareTodosByDeadline);
}

function normalizeTodosShallow(rows) {
  return Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
}

function compareTodosByDeadline(left, right) {
  const leftDeadline = deadlineRank(left.deadline);
  const rightDeadline = deadlineRank(right.deadline);

  if (leftDeadline !== rightDeadline) {
    return leftDeadline - rightDeadline;
  }

  return String(left.text || "").localeCompare(String(right.text || ""), "zh-CN");
}

function deadlineRank(value) {
  const normalized = normalizeDeadlineValue(value);
  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }
  return new Date(normalized).getTime();
}

function isTodoOverdue(todo) {
  if (todo.done || !todo.deadline) {
    return false;
  }
  return deadlineRank(todo.deadline) < Date.now();
}

function formatTodoDeadline(value, done, options = {}) {
  const normalized = normalizeDeadlineValue(value);
  if (!normalized) {
    return "未设置截止时间";
  }

  const date = new Date(normalized);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const prefix = done ? "已截止于" : isTodoOverdue({ deadline: normalized, done: false }) ? "已逾期" : "截止";
  return options.compact ? formatter.format(date) : `${prefix} ${formatter.format(date)}`;
}

function getTodoStats(todos) {
  const total = Array.isArray(todos) ? todos.length : 0;
  const done = Array.isArray(todos) ? todos.filter((item) => item.done).length : 0;
  return { total, done };
}

function applyDailyCarryOverOnFirstLaunch() {
  const todayKey = getTodayKey();
  const lastLaunchDate = readStorageMaybe(STORAGE_KEYS.lastLaunchDate);
  if (lastLaunchDate === todayKey) {
    return;
  }

  saveStorage(STORAGE_KEYS.lastLaunchDate, todayKey, { skipSnapshot: true });

  const latestDailyRecords = normalizeDailyRecords(readStorageMaybe(STORAGE_KEYS.dailyRecords));
  if (Object.keys(latestDailyRecords).length) {
    state.dailyRecords = latestDailyRecords;
  }

  state.selectedDateKey = todayKey;
  state.calendarMonthKey = getMonthKey(todayKey);

  if (!state.dailyRecords[todayKey]) {
    const sourceDateKey = findCarryOverSourceDate(todayKey);
    if (sourceDateKey) {
      const sourceRecord = getDayRecordSnapshot(state.dailyRecords[sourceDateKey]);
      const carriedRecord = createCarryOverRecord(sourceRecord);
      if (carriedRecord) {
        state.dailyRecords[todayKey] = carriedRecord;
      }
    }
  }

  const todayRecord = state.dailyRecords[todayKey];
  if (!todayRecord) {
    return;
  }

  const normalizedTodayRecord = normalizeDayRecord(todayRecord);
  const clearedRecord = createActiveDayRecord(normalizedTodayRecord);
  if (clearedRecord.todos.length === normalizedTodayRecord.todos.length) {
    return;
  }

  if (hasRecordedDay(clearedRecord)) {
    state.dailyRecords[todayKey] = {
      ...clearedRecord,
      updatedAt: new Date().toISOString(),
    };
    return;
  }

  delete state.dailyRecords[todayKey];
}

function readViewContext() {
  const params = new URLSearchParams(window.location.search);
  const rawRole = params.get("ivoryWindowRole");
  const role = rawRole === "wallpaper" ? "wallpaper" : "editor";
  return {
    role,
    isEditor: role === "editor",
    monitorIndex: Number.parseInt(params.get("ivoryMonitorIndex") || "0", 10) || 0,
    isPrimary: params.get("ivoryMonitorPrimary") === "1",
  };
}

function buildInitialDailyState(snapshot) {
  const snapshotRecords = normalizeDailyRecords(snapshot?.dailyRecords);
  const storedRecords = normalizeDailyRecords(readStorageMaybe(STORAGE_KEYS.dailyRecords));

  let dailyRecords =
    Object.keys(snapshotRecords).length > 0 ? snapshotRecords : Object.keys(storedRecords).length > 0 ? storedRecords : {};

  let selectedDateKey = sanitizeDateKey(
    snapshot?.selectedDateKey ?? readStorageMaybe(STORAGE_KEYS.selectedDateKey),
    getTodayKey()
  );

  if (!Object.keys(dailyRecords).length) {
    const legacyMemo = typeof snapshot?.memo === "string" ? snapshot.memo : readStorageMaybe(STORAGE_KEYS.memo);
    const legacyTodos = Array.isArray(snapshot?.todos) ? snapshot.todos : readStorageMaybe(STORAGE_KEYS.todos);
    const legacyRecord = normalizeDayRecord({
      memo: typeof legacyMemo === "string" ? legacyMemo : "",
      todos: Array.isArray(legacyTodos) ? legacyTodos : [],
      updatedAt: typeof snapshot?.savedAt === "string" ? snapshot.savedAt : new Date().toISOString(),
    });

    if (hasRecordedDay(legacyRecord)) {
      dailyRecords[selectedDateKey] = legacyRecord;
    }
  }

  if (!Object.keys(dailyRecords).length && !hasAnyStoredState()) {
    selectedDateKey = getTodayKey();
    dailyRecords[selectedDateKey] = normalizeDayRecord({
      memo: DEFAULT_MEMO,
      todos: getDefaultTodos(),
      updatedAt: new Date().toISOString(),
    });
  }

  const calendarMonthKey = sanitizeMonthKey(
    snapshot?.calendarMonthKey ?? readStorageMaybe(STORAGE_KEYS.calendarMonthKey),
    getMonthKey(selectedDateKey)
  );

  return {
    dailyRecords,
    selectedDateKey,
    calendarMonthKey,
  };
}

function hasAnyStoredState() {
  return [
    STORAGE_KEYS.snapshot,
    STORAGE_KEYS.dailyRecords,
    STORAGE_KEYS.memo,
    STORAGE_KEYS.todos,
    STORAGE_KEYS.background,
    STORAGE_KEYS.weather,
    STORAGE_KEYS.grid,
    STORAGE_KEYS.lastLaunchDate,
  ].some((key) => localStorage.getItem(key) !== null);
}

function getDefaultTodos() {
  return DEFAULT_TODO_TEXTS.map((text, index) => ({
    id: makeId(),
    text,
    done: index === 1,
  }));
}

function normalizeDailyRecords(records) {
  if (!records || typeof records !== "object" || Array.isArray(records)) {
    return {};
  }

  const normalized = {};
  Object.entries(records).forEach(([dateKey, record]) => {
    if (!isValidDateKey(dateKey)) {
      return;
    }
    const nextRecord = normalizeDayRecord(record);
    if (hasRecordedDay(nextRecord)) {
      normalized[dateKey] = nextRecord;
    }
  });
  return normalized;
}

function normalizeDayRecord(record) {
  if (!record || typeof record !== "object") {
    return {
      memo: "",
      todos: [],
      updatedAt: "",
    };
  }

  const updatedAt =
    typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt)) ? record.updatedAt : "";

  return {
    memo: typeof record.memo === "string" ? record.memo : "",
    todos: sortTodos(normalizeTodos(record.todos)),
    updatedAt,
  };
}

function getDayRecordSnapshot(record) {
  return normalizeDayRecord(record);
}

function createCarryOverRecord(sourceRecord) {
  const memo = String(sourceRecord.memo || "");
  const todos = sortTodos(
    normalizeTodos(sourceRecord.todos)
      .filter((todo) => !todo.done)
      .map((todo) => ({
        ...todo,
        id: makeId(),
        done: false,
      }))
  );

  if (!memo.trim() && !todos.length) {
    return null;
  }

  return {
    memo,
    todos,
    updatedAt: new Date().toISOString(),
  };
}

function createActiveDayRecord(record) {
  const normalized = normalizeDayRecord(record);
  return {
    ...normalized,
    todos: sortTodos(normalized.todos.filter((todo) => !todo.done)),
  };
}

function findCarryOverSourceDate(todayKey) {
  return Object.keys(state.dailyRecords)
    .filter((dateKey) => dateKey < todayKey)
    .sort((a, b) => b.localeCompare(a))
    .find((dateKey) => hasRecordedDay(state.dailyRecords[dateKey]));
}

function hasRecordedDay(record) {
  if (!record) {
    return false;
  }
  return Boolean(record.updatedAt || String(record.memo || "").trim() || normalizeTodos(record.todos).length);
}

function normalizeGrid(grid) {
  return {
    baseWidth: clampInt(grid.baseWidth, 800, 8000),
    baseHeight: clampInt(grid.baseHeight, 600, 5000),
    cellW: clampInt(grid.cellW, 40, 220),
    cellH: clampInt(grid.cellH, 40, 260),
    offsetX: clampInt(grid.offsetX, -800, 800),
    offsetY: clampInt(grid.offsetY, -600, 600),
    opacity: clampFloat(grid.opacity, 0, 1, 2),
  };
}

function migrateGrid(grid) {
  if (
    grid.baseWidth === 2500 &&
    grid.baseHeight === 1600 &&
    grid.cellW === 77 &&
    grid.cellH === 98 &&
    grid.offsetX === 72 &&
    grid.offsetY === -7
  ) {
    return {
      ...grid,
      baseWidth: 2560,
      baseHeight: 1600,
    };
  }
  return grid;
}

function normalizeWeather(weather) {
  const effect = typeof weather?.effect === "string" ? weather.effect : DEFAULT_WEATHER.effect;
  const effectMap = {
    sunny: "sunny",
    rain: "rain",
    rainy: "rain",
    snow: "snow",
    snowy: "snow",
    cloudy: "cloudy",
    foggy: "foggy",
    hail: "hail",
    icy: "hail",
    off: "none",
    none: "none",
  };
  const normalizedEffect = effectMap[effect] || "none";
  const enabled = weather?.enabled !== false && normalizedEffect !== "none";
  return {
    effect: normalizedEffect,
    enabled,
    intensity: clampFloat(weather?.intensity, 0.2, 1, 2),
    wind: clampFloat(weather?.wind, -1, 1, 2),
    opacity: clampFloat(weather?.opacity, 0.25, 1, 2),
    coverage: clampFloat(weather?.coverage, 0.2, 1, 2),
  };
}

function applyWeather() {
  const effect = state.weather.enabled ? state.weather.effect : "none";

  document.body.dataset.weatherEffect = effect;

  if (!el.weatherLayer) {
    return;
  }

  el.weatherLayer.hidden = effect === "none";
  syncWeatherMetrics();
}

function syncWeatherMetrics() {
  if (!el.weatherLayer) {
    return;
  }

  const root = document.documentElement;
  const intensity = state.weather?.intensity ?? DEFAULT_WEATHER.intensity;
  const wind = state.weather?.wind ?? DEFAULT_WEATHER.wind;
  const opacityScale = state.weather?.opacity ?? DEFAULT_WEATHER.opacity;
  const coverage = state.weather?.coverage ?? DEFAULT_WEATHER.coverage;
  const effect = state.weather.enabled ? state.weather.effect : "none";

  let layerOpacity = 0;
  let cloudOpacity = 0;
  let cloudSpeed = 1;
  let fogOpacity = 0;
  let fogDensity = 0.5;
  let sunOpacity = 0;
  let sunX = "78%";
  let sunY = "18%";
  let sunSize = `${clampFloat(28 + intensity * 12, 24, 42, 2)}vmax`;

  if (effect === "sunny") {
    layerOpacity = clampFloat(0.22 + opacityScale * 0.5, 0.22, 0.72, 2);
    sunOpacity = clampFloat(0.38 + intensity * 0.42, 0.38, 0.88, 2) * opacityScale;
    cloudOpacity = clampFloat(0.05 + coverage * 0.12, 0.05, 0.18, 2);
    cloudSpeed = clampFloat(0.42 + Math.abs(wind) * 0.55, 0.42, 1.1, 2);
    sunX = `${clampFloat(76 + wind * 6, 68, 84, 2)}%`;
  } else if (effect === "rain") {
    layerOpacity = clampFloat(0.45 + opacityScale * 0.4, 0.3, 0.9, 2);
    cloudOpacity = clampFloat(0.32 + coverage * 0.38 + intensity * 0.1, 0.3, 0.84, 2);
    cloudSpeed = clampFloat(0.85 + intensity * 0.8 + Math.abs(wind) * 0.45, 0.85, 1.95, 2);
    fogOpacity = clampFloat(0.04 + intensity * 0.08, 0.04, 0.18, 2);
    fogDensity = clampFloat(0.3 + coverage * 0.2, 0.25, 0.6, 2);
  } else if (effect === "snow") {
    layerOpacity = clampFloat(0.42 + opacityScale * 0.34, 0.3, 0.82, 2);
    cloudOpacity = clampFloat(0.18 + coverage * 0.3, 0.18, 0.58, 2);
    cloudSpeed = clampFloat(0.42 + Math.abs(wind) * 0.35, 0.42, 0.95, 2);
    fogOpacity = clampFloat(0.03 + coverage * 0.08, 0.03, 0.16, 2);
    fogDensity = clampFloat(0.28 + coverage * 0.16, 0.25, 0.5, 2);
  } else if (effect === "cloudy") {
    layerOpacity = clampFloat(0.26 + opacityScale * 0.36, 0.22, 0.76, 2);
    cloudOpacity = clampFloat(0.34 + coverage * 0.44, 0.34, 0.9, 2);
    cloudSpeed = clampFloat(0.55 + Math.abs(wind) * 0.55, 0.55, 1.25, 2);
    fogOpacity = clampFloat(0.03 + coverage * 0.08, 0.03, 0.14, 2);
    fogDensity = clampFloat(0.26 + coverage * 0.16, 0.24, 0.46, 2);
  } else if (effect === "foggy") {
    layerOpacity = clampFloat(0.3 + opacityScale * 0.45, 0.28, 0.82, 2);
    cloudOpacity = clampFloat(0.12 + coverage * 0.18, 0.12, 0.34, 2);
    cloudSpeed = clampFloat(0.3 + Math.abs(wind) * 0.25, 0.3, 0.72, 2);
    fogOpacity = clampFloat(0.24 + coverage * 0.46, 0.24, 0.84, 2);
    fogDensity = clampFloat(0.42 + coverage * 0.45, 0.42, 0.92, 2);
  } else if (effect === "hail") {
    layerOpacity = clampFloat(0.5 + opacityScale * 0.38, 0.36, 0.92, 2);
    cloudOpacity = clampFloat(0.42 + coverage * 0.4 + intensity * 0.06, 0.42, 0.92, 2);
    cloudSpeed = clampFloat(1 + intensity * 0.72 + Math.abs(wind) * 0.55, 1, 2.1, 2);
    fogOpacity = clampFloat(0.05 + intensity * 0.1, 0.05, 0.2, 2);
    fogDensity = clampFloat(0.34 + coverage * 0.2, 0.3, 0.6, 2);
  }

  root.style.setProperty("--weather-layer-opacity", `${effect === "none" ? 0 : layerOpacity}`);
  root.style.setProperty("--weather-cloud-opacity", `${cloudOpacity}`);
  root.style.setProperty("--weather-cloud-speed", `${cloudSpeed}`);
  root.style.setProperty("--weather-fog-opacity", `${fogOpacity}`);
  root.style.setProperty("--weather-fog-density", `${fogDensity}`);
  root.style.setProperty("--weather-sun-opacity", `${sunOpacity}`);
  root.style.setProperty("--weather-sun-x", sunX);
  root.style.setProperty("--weather-sun-y", sunY);
  root.style.setProperty("--weather-sun-size", sunSize);

  WEATHER_RENDERER.apply({
    effect,
    enabled: effect !== "none",
    intensity,
    wind,
    opacity: opacityScale,
    coverage,
  });
  WEATHER_RENDERER.resize();
}

function normalizeTodos(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => ({
      id: String(row?.id || makeId()),
      text: String(row?.text || "").trim().slice(0, 120),
      done: Boolean(row?.done),
      deadline: normalizeDeadlineValue(row?.deadline),
    }))
    .filter((row) => row.text);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayKey(date = new Date()) {
  return formatDateKey(date);
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function sanitizeDateKey(value, fallback) {
  return isValidDateKey(value) ? String(value) : fallback;
}

function getMonthKey(dateKey) {
  const safeDateKey = sanitizeDateKey(dateKey, getTodayKey());
  return `${safeDateKey.slice(0, 7)}-01`;
}

function sanitizeMonthKey(value, fallback) {
  return isValidDateKey(value) ? getMonthKey(value) : getMonthKey(fallback);
}

function shiftMonthKey(monthKey, delta) {
  const base = parseDateKey(sanitizeMonthKey(monthKey, getMonthKey(getTodayKey())));
  return formatDateKey(new Date(base.getFullYear(), base.getMonth() + delta, 1, 12));
}

function formatDateLabel(dateKey, options = {}) {
  const date = parseDateKey(dateKey);
  const parts = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  if (options.includeWeekday) {
    parts.weekday = options.useShortWeekday ? "short" : "long";
  }

  return new Intl.DateTimeFormat("zh-CN", parts).format(date).replace(/\//g, "-");
}

function formatMonthLabel(monthKey) {
  const date = parseDateKey(monthKey);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

async function serializeCustomBackgroundForExport() {
  if (state.backgroundCustom) {
    return state.backgroundCustom;
  }

  try {
    const blob = await loadCustomBackgroundBlob();
    if (!blob) {
      return "";
    }
    return await blobToDataUrl(blob);
  } catch (error) {
    console.warn("Serialize custom background failed:", error);
    return "";
  }
}

async function saveCustomBackgroundBlob(blob) {
  await idbSet(ASSET_DB.customBackgroundKey, blob);
  state.backgroundCustom = "";
  saveStorage(STORAGE_KEYS.customBackground, "", { skipSnapshot: true });
}

async function loadCustomBackgroundBlob() {
  return idbGet(ASSET_DB.customBackgroundKey);
}

async function deleteCustomBackgroundBlob() {
  return idbDelete(ASSET_DB.customBackgroundKey);
}

function filePathToFileUrl(path) {
  const value = String(path || "").trim();
  if (!value) {
    return "";
  }
  if (/^(file|data|blob):/i.test(value)) {
    return value;
  }

  const normalized = value.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }

  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("readAsDataURL failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("blobToDataUrl failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = String(dataUrl).split(",", 2);
  if (!head || !body) {
    throw new Error("Invalid data URL");
  }
  const mime = /data:(.*?);base64/.exec(head)?.[1] || "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function openAssetDb() {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB unavailable");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB.name, ASSET_DB.version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_DB.store)) {
        db.createObjectStore(ASSET_DB.store);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

async function idbSet(key, value) {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_DB.store, "readwrite");
    tx.objectStore(ASSET_DB.store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB put failed"));
  });
}

async function idbGet(key) {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_DB.store, "readonly");
    const req = tx.objectStore(ASSET_DB.store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("IndexedDB get failed"));
  });
}

async function idbDelete(key) {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_DB.store, "readwrite");
    tx.objectStore(ASSET_DB.store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB delete failed"));
  });
}

function clampInt(value, min, max) {
  const upper = Math.max(min, max);
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return min;
  }
  return Math.max(min, Math.min(upper, number));
}

function clampFloat(value, min, max, fixed = 2) {
  const upper = Math.max(min, max);
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) {
    return min;
  }
  const clamped = Math.max(min, Math.min(upper, number));
  return Number(clamped.toFixed(fixed));
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return cloneValue(fallback);
    }
    return JSON.parse(raw);
  } catch {
    return cloneValue(fallback);
  }
}

function readStorageMaybe(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return undefined;
    }
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function saveStorage(key, value, options = {}) {
  localStorage.setItem(key, JSON.stringify(value));
  if (!options.skipSnapshot && key !== STORAGE_KEYS.snapshot) {
    persistSnapshot();
  }
}

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
