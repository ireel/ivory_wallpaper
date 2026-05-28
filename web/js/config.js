export const STORAGE_KEYS = {
  background: "ivory.background",
  customBackground: "ivory.background.custom",
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

export const ASSET_DB = {
  name: "ivory_wallpaper_assets",
  version: 1,
  store: "files",
  customBackgroundKey: "custom-background",
};

export const DEFAULT_MEMO = `# 今日备忘\n\n- [ ] 记录今天最重要的事情\n- [ ] 用 Markdown 整理想法、会议纪要或灵感\n- [ ] 打开日历查看不同日期的记录`;
export const DEFAULT_TODO_TEXTS = ["检查今天的优先任务", "整理桌面上的临时文件"];

export const DEFAULT_GRID = {
  baseWidth: 2560, baseHeight: 1600, cellW: 77, cellH: 98,
  offsetX: 72, offsetY: -7, opacity: 0.24,
};

export const DEFAULT_WEATHER = {
  effect: "rain", enabled: true, intensity: 0.56,
  wind: 0.35, opacity: 0.72, coverage: 0.58,
};

export const PRESET_BACKGROUNDS = [
  { id: "coastline", label: "Coastline", image: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%230b1d3a'/%3E%3Cstop offset='55%' stop-color='%23143b57'/%3E%3Cstop offset='100%' stop-color='%23285f79'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.75' cy='0.15' r='0.55'%3E%3Cstop offset='0%' stop-color='%234ecdc4' stop-opacity='0.42'/%3E%3Cstop offset='100%' stop-color='%234ecdc4' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 650 Q250 560 540 640 T1100 630 T1600 680 L1600 900 L0 900 Z' fill='%23061121' fill-opacity='0.66'/%3E%3C/svg%3E\")" },
  { id: "sunset", label: "Sunset", image: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23231a3a'/%3E%3Cstop offset='45%' stop-color='%233f2f58'/%3E%3Cstop offset='100%' stop-color='%235f4d66'/%3E%3C/linearGradient%3E%3CradialGradient id='sun' cx='0.75' cy='0.34' r='0.30'%3E%3Cstop offset='0%' stop-color='%23f7d580' stop-opacity='0.95'/%3E%3Cstop offset='100%' stop-color='%23f7d580' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23sun)'/%3E%3Cpath d='M0 700 C260 590 520 740 800 670 C1060 600 1320 760 1600 700 L1600 900 L0 900 Z' fill='%23130f22' fill-opacity='0.72'/%3E%3C/svg%3E\")" },
  { id: "forest", label: "Forest", image: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%23081617'/%3E%3Cstop offset='58%' stop-color='%23113b31'/%3E%3Cstop offset='100%' stop-color='%232a574b'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.22' cy='0.22' r='0.5'%3E%3Cstop offset='0%' stop-color='%23f2c14e' stop-opacity='0.22'/%3E%3Cstop offset='100%' stop-color='%23f2c14e' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 710 L170 520 L280 710 ZM210 710 L380 470 L550 710 ZM510 710 L720 430 L920 710 ZM860 710 L1060 500 L1260 710 ZM1180 710 L1380 470 L1600 710 Z' fill='%23061313' fill-opacity='0.42'/%3E%3C/svg%3E\")" }
];