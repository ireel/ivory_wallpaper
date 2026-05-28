import { STORAGE_KEYS, PRESET_BACKGROUNDS, DEFAULT_WEATHER, DEFAULT_GRID } from './config.js';
import * as Utils from './utils.js';

// 自动 DOM 映射器 (替代原先 50 行的手动查询)
export const el = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string' && !target[prop]) {
      target[prop] = document.getElementById(prop);
    }
    return target[prop];
  }
});

export const VIEW_CONTEXT = Utils.readViewContext();

export const state = {
  backgroundId: Utils.readStorage(STORAGE_KEYS.background, PRESET_BACKGROUNDS[0].id),
  weather: Utils.readStorage(STORAGE_KEYS.weather, DEFAULT_WEATHER),
  memo: "",
  todos: [],
  grid: Utils.readStorage(STORAGE_KEYS.grid, DEFAULT_GRID),
  dailyRecords: Utils.readStorageMaybe(STORAGE_KEYS.dailyRecords) || {},
  selectedDateKey: Utils.getTodayKey()
};