const STORAGE_KEYS = {
  background: "ivory.background",
  customBackground: "ivory.background.custom",
  memo: "ivory.memo",
  todos: "ivory.todos",
  grid: "ivory.grid",
};

const ASSET_DB = {
  name: "ivory_wallpaper_assets",
  version: 1,
  store: "files",
  customBackgroundKey: "custom-background",
};

const DEFAULT_MEMO = `# 今日备忘

- [ ] 在桌面单元格里自然摆放原生图标
- [ ] 记录今天的重点任务
- [x] 背景和信息面板已经就位

你可以在这里输入 Markdown，然后切换到“预览”。`;

const DEFAULT_TODOS = [
  { id: makeId(), text: "检查今天的任务优先级", done: false },
  { id: makeId(), text: "清理桌面临时文件", done: true },
];

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

const state = {
  backgroundId: readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id),
  // Legacy inline DataURL value from older versions.
  backgroundCustom: readStorage(STORAGE_KEYS.customBackground, ""),
  // Runtime URL used by CSS background-image, usually blob URL.
  backgroundCustomUrl: "",
  memo: readStorage(STORAGE_KEYS.memo, DEFAULT_MEMO),
  todos: normalizeTodos(readStorage(STORAGE_KEYS.todos, DEFAULT_TODOS)),
  grid: normalizeGrid(readStorage(STORAGE_KEYS.grid, DEFAULT_GRID)),
};

const el = {
  backgroundLayer: document.querySelector("#backgroundLayer"),
  openBackgroundModal: document.querySelector("#openBackgroundModal"),
  closeBackgroundModal: document.querySelector("#closeBackgroundModal"),
  backgroundModal: document.querySelector("#backgroundModal"),
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
  memoInput: document.querySelector("#memoInput"),
  memoPreview: document.querySelector("#memoPreview"),
  memoEditBtn: document.querySelector("#memoEditBtn"),
  memoPreviewBtn: document.querySelector("#memoPreviewBtn"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoList: document.querySelector("#todoList"),
  todoTemplate: document.querySelector("#todoTemplate"),
};

init().catch((error) => {
  console.error("Initialization failed:", error);
});

async function init() {
  state.grid = migrateGrid(state.grid);
  persistGrid();
  await migrateLegacyCustomBackgroundIfNeeded();
  await refreshCustomBackgroundUrl();
  applyBackground();
  renderBackgroundOptions();
  applyGridAndLayout();
  syncGridInputs();
  initClock();
  initMemo();
  renderTodos();
  bindEvents();
  window.addEventListener("beforeunload", cleanupCustomBackgroundUrl);
  window.addEventListener("storage", handleStorageSync);
}

function bindEvents() {
  el.openBackgroundModal.addEventListener("click", () => el.backgroundModal.classList.remove("is-hidden"));
  el.closeBackgroundModal.addEventListener("click", closeBackgroundModal);

  el.backgroundModal.addEventListener("click", (event) => {
    if (event.target === el.backgroundModal) {
      closeBackgroundModal();
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
    state.memo = DEFAULT_MEMO;
    state.todos = cloneValue(DEFAULT_TODOS);
    saveStorage(STORAGE_KEYS.memo, state.memo);
    saveStorage(STORAGE_KEYS.todos, state.todos);
    el.memoInput.value = state.memo;
    renderMemoPreview();
    renderTodos();
  });

  el.memoInput.addEventListener("input", () => {
    state.memo = el.memoInput.value;
    saveStorage(STORAGE_KEYS.memo, state.memo);
    renderMemoPreview();
  });

  el.memoEditBtn.addEventListener("click", () => switchMemoMode("edit"));
  el.memoPreviewBtn.addEventListener("click", () => switchMemoMode("preview"));

  el.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = el.todoInput.value.trim();
    if (!text) {
      return;
    }
    state.todos.unshift({ id: makeId(), text, done: false });
    saveStorage(STORAGE_KEYS.todos, state.todos);
    el.todoInput.value = "";
    renderTodos();
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
      closeBackgroundModal();
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
      closeBackgroundModal();
    });
    el.backgroundOptions.append(customButton);
  }
}

function applyBackground() {
  const customUrl = getRenderableCustomBackground();
  if (state.backgroundId === "custom" && customUrl) {
    el.backgroundLayer.style.backgroundImage = `url("${customUrl}")`;
    return;
  }
  const matched = PRESET_BACKGROUNDS.find((item) => item.id === state.backgroundId) || PRESET_BACKGROUNDS[0];
  el.backgroundLayer.style.backgroundImage = matched.image;
}

async function handleBackgroundUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    await saveCustomBackgroundBlob(file);
    await refreshCustomBackgroundUrl();
  } catch {
    // Fallback to inline DataURL for environments where IndexedDB is unavailable.
    state.backgroundCustom = await readFileAsDataUrl(file);
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
  closeBackgroundModal();
  event.target.value = "";
}

function closeBackgroundModal() {
  el.backgroundModal.classList.add("is-hidden");
}

function handleStorageSync(event) {
  if (!event.key || !Object.values(STORAGE_KEYS).includes(event.key)) {
    return;
  }

  if (event.key === STORAGE_KEYS.background) {
    state.backgroundId = readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id);
    applyBackground();
    renderBackgroundOptions();
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

  if (event.key === STORAGE_KEYS.grid) {
    state.grid = normalizeGrid(readStorage(STORAGE_KEYS.grid, DEFAULT_GRID));
    applyGridAndLayout();
    syncGridInputs();
    return;
  }

  if (event.key === STORAGE_KEYS.memo) {
    state.memo = readStorage(STORAGE_KEYS.memo, DEFAULT_MEMO);
    el.memoInput.value = state.memo;
    renderMemoPreview();
    return;
  }

  if (event.key === STORAGE_KEYS.todos) {
    state.todos = normalizeTodos(readStorage(STORAGE_KEYS.todos, DEFAULT_TODOS));
    renderTodos();
  }
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

  el.gridRuntimeHint.textContent = `当前换算: cell ${effective.cellW.toFixed(1)} x ${effective.cellH.toFixed(1)}, offset ${effective.offsetX.toFixed(1)}, ${effective.offsetY.toFixed(1)} | dpr ${dpr.toFixed(2)} | physical ${physicalWidth.toFixed(0)}x${physicalHeight.toFixed(0)}`;
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

function persistGrid() {
  saveStorage(STORAGE_KEYS.grid, state.grid);
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

async function exportConfig() {
  const serializedBackground = await serializeCustomBackgroundForExport();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    grid: state.grid,
    background: {
      id: state.backgroundId,
      custom: serializedBackground,
    },
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
    persistGrid();
  }

  if (config.background && typeof config.background === "object") {
    const nextId = String(config.background.id || PRESET_BACKGROUNDS[0].id);
    const nextCustom = String(config.background.custom || "");
    state.backgroundId = nextId;
    if (nextCustom.startsWith("data:")) {
      const blob = dataUrlToBlob(nextCustom);
      await saveCustomBackgroundBlob(blob);
      await refreshCustomBackgroundUrl();
    } else if (nextCustom) {
      // Backward compatibility: treat any non-empty string as inline URL.
      state.backgroundCustom = nextCustom;
      saveStorage(STORAGE_KEYS.customBackground, state.backgroundCustom);
      await deleteCustomBackgroundBlob();
      cleanupCustomBackgroundUrl();
    } else {
      state.backgroundCustom = "";
      saveStorage(STORAGE_KEYS.customBackground, "");
      await deleteCustomBackgroundBlob();
      cleanupCustomBackgroundUrl();
    }
    saveStorage(STORAGE_KEYS.background, state.backgroundId);
  }

  if (typeof config.memo === "string") {
    state.memo = config.memo;
    saveStorage(STORAGE_KEYS.memo, state.memo);
  }

  if (Array.isArray(config.todos)) {
    state.todos = normalizeTodos(config.todos);
    saveStorage(STORAGE_KEYS.todos, state.todos);
  }

  applyBackground();
  renderBackgroundOptions();
  applyGridAndLayout();
  syncGridInputs();
  el.memoInput.value = state.memo;
  renderMemoPreview();
  renderTodos();
}

function initMemo() {
  el.memoInput.value = state.memo;
  renderMemoPreview();
  switchMemoMode("edit");
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
  return value.replace(/[&<>"']/g, (char) => map[char]);
}

function renderTodos() {
  el.todoList.innerHTML = "";
  state.todos.forEach((todo) => {
    const item = el.todoTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector(".todo-checkbox");
    const text = item.querySelector(".todo-text");
    const remove = item.querySelector(".todo-remove");

    checkbox.checked = todo.done;
    text.textContent = todo.text;

    checkbox.addEventListener("change", () => {
      todo.done = checkbox.checked;
      saveStorage(STORAGE_KEYS.todos, state.todos);
    });

    remove.addEventListener("click", () => {
      state.todos = state.todos.filter((row) => row.id !== todo.id);
      saveStorage(STORAGE_KEYS.todos, state.todos);
      renderTodos();
    });

    el.todoList.append(item);
  });
}

function getRenderableCustomBackground() {
  return state.backgroundCustomUrl || state.backgroundCustom || "";
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
    saveStorage(STORAGE_KEYS.customBackground, "");
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
  saveStorage(STORAGE_KEYS.customBackground, "");
}

async function loadCustomBackgroundBlob() {
  return idbGet(ASSET_DB.customBackgroundKey);
}

async function deleteCustomBackgroundBlob() {
  return idbDelete(ASSET_DB.customBackgroundKey);
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

function normalizeTodos(rows) {
  if (!Array.isArray(rows)) {
    return cloneValue(DEFAULT_TODOS);
  }
  return rows.map((row) => ({
    id: String(row.id || makeId()),
    text: String(row.text || "").slice(0, 120),
    done: Boolean(row.done),
  }));
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
    if (!raw) {
      return cloneValue(fallback);
    }
    return JSON.parse(raw);
  } catch {
    return cloneValue(fallback);
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
