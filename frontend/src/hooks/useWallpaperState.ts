import { useState, useEffect, useCallback, useRef } from 'react';
import { getNativeBridge } from './useNativeBridge';
import type { TodoItem, Coord, TetrominoType } from '../utils/tetris';
import { getDeterministicShape, calculatePlacement, applyGravity } from '../utils/tetris';
import { loadCustomBackgroundBlob, saveCustomBackgroundBlob, dataUrlToBlob } from '../utils/db';

export interface WeatherState {
  effect: 'sunny' | 'rain' | 'snow' | 'cloudy' | 'foggy' | 'hail' | 'off';
  enabled: boolean;
  intensity: number;
  wind: number;
  opacity: number;
  coverage: number;
}

export interface GridState {
  baseWidth: number;
  baseHeight: number;
  cellW: number;
  cellH: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface DailyRecord {
  memo: string;
  todos: TodoItem[];
  updatedAt?: string;
}

export const DEFAULT_GRID: GridState = {
  baseWidth: 2560,
  baseHeight: 1600,
  cellW: 77,
  cellH: 98,
  offsetX: 72,
  offsetY: -7,
  opacity: 0.24,
};

export const DEFAULT_WEATHER: WeatherState = {
  effect: 'rain',
  enabled: true,
  intensity: 0.56,
  wind: 0.35,
  opacity: 0.72,
  coverage: 0.58,
};

export const PRESET_BACKGROUNDS = [
  {
    id: 'coastline',
    label: 'Coastline',
    image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%230b1d3a'/%3E%3Cstop offset='55%' stop-color='%23143b57'/%3E%3Cstop offset='100%' stop-color='%23285f79'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.75' cy='0.15' r='0.55'%3E%3Cstop offset='0%' stop-color='%234ecdc4' stop-opacity='0.42'/%3E%3Cstop offset='100%' stop-color='%234ecdc4' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 650 Q250 560 540 640 T1100 630 T1600 680 L1600 900 L0 900 Z' fill='%23061121' fill-opacity='0.66'/%3E%3C/svg%3E")`,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23231a3a'/%3E%3Cstop offset='45%' stop-color='%233f2f58'/%3E%3Cstop offset='100%' stop-color='%235f4d66'/%3E%3C/linearGradient%3E%3CradialGradient id='sun' cx='0.75' cy='0.34' r='0.30'%3E%3Cstop offset='0%' stop-color='%23f7d580' stop-opacity='0.95'/%3E%3Cstop offset='100%' stop-color='%23f7d580' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23sun)'/%3E%3Cpath d='M0 700 C260 590 520 740 800 670 C1060 600 1320 760 1600 700 L1600 900 L0 900 Z' fill='%23130f22' fill-opacity='0.72'/%3E%3C/svg%3E")`,
  },
  {
    id: 'forest',
    label: 'Forest',
    image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%23081617'/%3E%3Cstop offset='58%' stop-color='%23113b31'/%3E%3Cstop offset='100%' stop-color='%232a574b'/%3E%3C/linearGradient%3E%3CradialGradient id='r' cx='0.22' cy='0.22' r='0.5'%3E%3Cstop offset='0%' stop-color='%23f2c14e' stop-opacity='0.22'/%3E%3Cstop offset='100%' stop-color='%23f2c14e' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23r)'/%3E%3Cpath d='M0 710 L170 520 L280 710 ZM210 710 L380 470 L550 710 ZM510 710 L720 430 L920 710 ZM860 710 L1060 500 L1260 710 ZM1180 710 L1380 470 L1600 710 Z' fill='%23061313' fill-opacity='0.42'/%3E%3C/svg%3E")`,
  },
];

export const STORAGE_KEYS = {
  background: 'ivory.background',
  customBackground: 'ivory.background.custom',
  customBackgroundFile: 'ivory.background.customFile',
  weather: 'ivory.weather',
  grid: 'ivory.grid',
  dailyRecords: 'ivory.dailyRecords',
  selectedDateKey: 'ivory.selectedDateKey',
  calendarMonthKey: 'ivory.calendarMonthKey',
  snapshot: 'ivory.snapshot',
};

// Date utilities
export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getMonthKey(dateKey: string): string {
  const parts = dateKey.split('-');
  return `${parts[0]}-${parts[1]}`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

export interface ViewContext {
  role: 'wallpaper' | 'editor';
  isEditor: boolean;
  monitorIndex: number;
}

export function readViewContext(): ViewContext {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('ivoryWindowRole') === 'wallpaper' ? 'wallpaper' : 'editor';
  return {
    role,
    isEditor: role === 'editor',
    monitorIndex: parseInt(params.get('ivoryMonitorIndex') || '0', 10) || 0,
  };
}

export function useWallpaperState() {
  const nativeBridge = getNativeBridge();
  const [viewContext] = useState<ViewContext>(() => readViewContext());

  // Apply body classes for CSS styling corresponding to window role
  useEffect(() => {
    document.body.setAttribute('data-ivory-role', viewContext.role);
    document.body.classList.toggle('is-editor-role', viewContext.isEditor);
    document.body.classList.toggle('is-wallpaper-role', !viewContext.isEditor);
  }, [viewContext]);
  
  // 1. Initial State Loading
  const [backgroundId, setBackgroundId] = useState<string>(() => readStorage(STORAGE_KEYS.background, 'coastline'));
  const [backgroundCustomFile, setBackgroundCustomFile] = useState<string>(() => readStorage(STORAGE_KEYS.customBackgroundFile, ''));
  const [backgroundCustomUrl, setBackgroundCustomUrl] = useState<string>('');
  
  const [weather, setWeather] = useState<WeatherState>(() => readStorage(STORAGE_KEYS.weather, DEFAULT_WEATHER));
  const [grid, setGrid] = useState<GridState>(() => readStorage(STORAGE_KEYS.grid, DEFAULT_GRID));
  
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => readStorage(STORAGE_KEYS.selectedDateKey, getTodayKey()));
  const [calendarMonthKey, setCalendarMonthKey] = useState<string>(() => readStorage(STORAGE_KEYS.calendarMonthKey, getMonthKey(getTodayKey())));
  
  const [dailyRecords, setDailyRecords] = useState<Record<string, DailyRecord>>(() => readStorage(STORAGE_KEYS.dailyRecords, {}));

  // Active day todos
  const currentRecord = dailyRecords[selectedDateKey] || { memo: '', todos: [] };
  const todos = currentRecord.todos || [];

  // Ref to prevent infinite loops on updates
  const syncTimeoutRef = useRef<number | null>(null);

  // 2. Load custom background from IndexedDB when backgroundId is custom
  const loadCustomBg = useCallback(async (active: boolean) => {
    const blob = await loadCustomBackgroundBlob();
    if (blob && active) {
      const url = URL.createObjectURL(blob);
      setBackgroundCustomUrl(prev => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (backgroundId === 'custom') {
      loadCustomBg(active);
    }
    return () => {
      active = false;
    };
  }, [backgroundId, loadCustomBg]);

  // 3. Grid metric CSS variables application
  useEffect(() => {
    const root = document.documentElement;
    const dpr = window.devicePixelRatio || 1;
    const physicalWidth = window.innerWidth * dpr;
    const physicalHeight = window.innerHeight * dpr;
    const scaleX = physicalWidth / grid.baseWidth;
    const scaleY = physicalHeight / grid.baseHeight;

    const cellW = Number((grid.cellW * scaleX).toFixed(2));
    const cellH = Number((grid.cellH * scaleY).toFixed(2));
    const offsetX = Number((grid.offsetX * scaleX).toFixed(2));
    const offsetY = Number((grid.offsetY * scaleY).toFixed(2));

    root.style.setProperty('--icon-grid-w', `${cellW}px`);
    root.style.setProperty('--icon-grid-h', `${cellH}px`);
    root.style.setProperty('--icon-grid-offset-x', `${offsetX}px`);
    root.style.setProperty('--icon-grid-offset-y', `${offsetY}px`);
    root.style.setProperty('--icon-grid-opacity', `${grid.opacity}`);

    const clockTop = Math.max(20, Math.min(window.innerHeight * 0.38, offsetY + cellH * 0.8));
    const clockWidth = Math.max(360, Math.min(window.innerWidth - 30, cellW * 5.8));
    const panelBottom = Math.max(16, Math.min(window.innerHeight * 0.24, cellH * 0.82));
    const panelWidth = Math.max(720, Math.min(window.innerWidth - 36, cellW * 13.6));
    const panelHeight = Math.max(300, Math.min(window.innerHeight * 0.62, cellH * 4.45));

    root.style.setProperty('--clock-top', `${clockTop}px`);
    root.style.setProperty('--clock-width', `${clockWidth}px`);
    root.style.setProperty('--panel-bottom', `${panelBottom}px`);
    root.style.setProperty('--panel-width', `${panelWidth}px`);
    root.style.setProperty('--panel-height', `${panelHeight}px`);
  }, [grid]);

  // 4. Save state & persist snapshot
  const persistState = useCallback((
    bgId: string,
    bgFile: string,
    w: WeatherState,
    g: GridState,
    dateKey: string,
    monthKey: string,
    records: Record<string, DailyRecord>
  ) => {
    saveStorage(STORAGE_KEYS.background, bgId);
    saveStorage(STORAGE_KEYS.customBackgroundFile, bgFile);
    saveStorage(STORAGE_KEYS.weather, w);
    saveStorage(STORAGE_KEYS.grid, g);
    saveStorage(STORAGE_KEYS.selectedDateKey, dateKey);
    saveStorage(STORAGE_KEYS.calendarMonthKey, monthKey);
    saveStorage(STORAGE_KEYS.dailyRecords, records);

    // Save full snapshot for host backup
    const snapshot = {
      version: 3,
      savedAt: new Date().toISOString(),
      backgroundId: bgId,
      backgroundCustomFile: bgFile,
      weather: w,
      grid: g,
      selectedDateKey: dateKey,
      calendarMonthKey: monthKey,
      dailyRecords: records,
    };
    saveStorage(STORAGE_KEYS.snapshot, snapshot);
  }, []);

  // 5. System Wallpaper Sync (Asynchronous Canvas Render)
  const syncSystemWallpaper = useCallback(async (bgId: string, bgFile: string, bgUrl: string) => {
    if (!nativeBridge.available) return;

    if (bgId === 'custom' && bgFile) {
      await nativeBridge.invoke('syncSystemWallpaperFile', { path: bgFile });
      return;
    }

    // Resolve current background source URL
    let sourceUrl = '';
    if (bgId === 'custom' && bgUrl) {
      sourceUrl = bgUrl;
    } else {
      const preset = PRESET_BACKGROUNDS.find(p => p.id === bgId) || PRESET_BACKGROUNDS[0];
      const match = preset.image.match(/^url\((['"]?)(.*)\1\)$/);
      sourceUrl = match ? match[2] : '';
    }

    if (!sourceUrl) return;

    // Load and draw to canvas, export to PNG
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image: ' + sourceUrl.slice(0, 100)));
        image.src = sourceUrl;
      });

      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(window.innerWidth * dpr));
      const height = Math.max(1, Math.round(window.innerHeight * dpr));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      ctx.fillStyle = '#04101b';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      const dataUrl = canvas.toDataURL('image/png');
      await nativeBridge.invoke('syncSystemWallpaper', { dataUrl });
    } catch (err) {
      console.warn('System wallpaper sync failed:', err);
    }
  }, [nativeBridge]);

  const scheduleSystemWallpaperSync = useCallback((bgId: string, bgFile: string, bgUrl: string) => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      syncSystemWallpaper(bgId, bgFile, bgUrl);
    }, 300);
  }, [syncSystemWallpaper]);

  // Sync background changes to disk/native
  useEffect(() => {
    scheduleSystemWallpaperSync(backgroundId, backgroundCustomFile, backgroundCustomUrl);
  }, [backgroundId, backgroundCustomFile, backgroundCustomUrl, scheduleSystemWallpaperSync]);

  // 6. Controller Functions for Components

  const changeBackground = useCallback(async (id: string, fileObj?: File) => {
    if (id === 'custom' && fileObj) {
      try {
        await saveCustomBackgroundBlob(fileObj);
        const url = URL.createObjectURL(fileObj);
        
        if (backgroundCustomUrl && backgroundCustomUrl.startsWith('blob:')) {
          URL.revokeObjectURL(backgroundCustomUrl);
        }

        setBackgroundCustomUrl(url);
        setBackgroundCustomFile('');
        setBackgroundId('custom');
        
        persistState('custom', '', weather, grid, selectedDateKey, calendarMonthKey, dailyRecords);
        localStorage.setItem("ivory.background.custom.updatedAt", String(Date.now()));
      } catch (err) {
        console.error('Custom image upload failed, falling back to data URL:', err);
        // Fallback inline dataUrl
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          setBackgroundCustomUrl(dataUrl);
          setBackgroundCustomFile('');
          setBackgroundId('custom');
          // In fallback we can't save as blob, we write custom dataUrl directly to localStorage or skip
          persistState('custom', '', weather, grid, selectedDateKey, calendarMonthKey, dailyRecords);
          localStorage.setItem("ivory.background.custom.updatedAt", String(Date.now()));
        };
        reader.readAsDataURL(fileObj);
      }
    } else {
      setBackgroundId(id);
      persistState(id, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, dailyRecords);
    }
  }, [backgroundCustomUrl, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  const changeWeather = useCallback((newWeather: Partial<WeatherState>) => {
    setWeather(prev => {
      const next = { ...prev, ...newWeather };
      persistState(backgroundId, backgroundCustomFile, next, grid, selectedDateKey, calendarMonthKey, dailyRecords);
      return next;
    });
  }, [backgroundId, backgroundCustomFile, grid, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  const resetWeather = useCallback(() => {
    setWeather(DEFAULT_WEATHER);
    persistState(backgroundId, backgroundCustomFile, DEFAULT_WEATHER, grid, selectedDateKey, calendarMonthKey, dailyRecords);
  }, [backgroundId, backgroundCustomFile, grid, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  const changeGrid = useCallback((newGrid: Partial<GridState>) => {
    setGrid(prev => {
      const next = { ...prev, ...newGrid };
      persistState(backgroundId, backgroundCustomFile, weather, next, selectedDateKey, calendarMonthKey, dailyRecords);
      return next;
    });
  }, [backgroundId, backgroundCustomFile, weather, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  const resetGrid = useCallback(() => {
    setGrid(DEFAULT_GRID);
    persistState(backgroundId, backgroundCustomFile, weather, DEFAULT_GRID, selectedDateKey, calendarMonthKey, dailyRecords);
  }, [backgroundId, backgroundCustomFile, weather, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  const selectDate = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    const monthKey = getMonthKey(dateKey);
    setCalendarMonthKey(monthKey);
    
    // Save to storage
    saveStorage(STORAGE_KEYS.selectedDateKey, dateKey);
    saveStorage(STORAGE_KEYS.calendarMonthKey, monthKey);
    
    // Full snapshot
    const snapshot = {
      version: 3,
      savedAt: new Date().toISOString(),
      backgroundId,
      backgroundCustomFile,
      weather,
      grid,
      selectedDateKey: dateKey,
      calendarMonthKey: monthKey,
      dailyRecords,
    };
    saveStorage(STORAGE_KEYS.snapshot, snapshot);
  }, [backgroundId, backgroundCustomFile, weather, grid, dailyRecords]);

  // Todo operations
  const updateCurrentDateTodos = useCallback((updatedTodos: TodoItem[]) => {
    // Sort completed/active items correctly
    const sorted = [...updatedTodos].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    setDailyRecords(prev => {
      const newRecords = {
        ...prev,
        [selectedDateKey]: {
          memo: prev[selectedDateKey]?.memo || '',
          todos: sorted,
          updatedAt: new Date().toISOString(),
        }
      };
      
      persistState(backgroundId, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, newRecords);
      return newRecords;
    });
  }, [backgroundId, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, persistState]);

  const addTodo = useCallback((text: string, deadline: string | null, shapeType: TetrominoType | 'auto') => {
    const shape = shapeType === 'auto' ? getDeterministicShape(text, deadline) : shapeType;
    
    // Calculate placement
    const activePlacedCoords = todos
      .filter(t => !t.completed && t.placedCoords)
      .flatMap(t => t.placedCoords as Coord[]);

    const placedCoords = calculatePlacement(shape, activePlacedCoords);

    const newTodo: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      text,
      completed: false,
      deadline,
      shape,
      placedCoords
    };

    updateCurrentDateTodos([...todos, newTodo]);
  }, [todos, updateCurrentDateTodos]);

  const editTodo = useCallback((id: string, text: string, deadline: string | null, shapeType: TetrominoType | 'auto') => {
    const updated = todos.map(t => {
      if (t.id === id) {
        const shape = shapeType === 'auto' ? getDeterministicShape(text, deadline) : shapeType;
        
        // If the shape changed, we need to recalculate placement
        let placedCoords = t.placedCoords;
        if (t.shape !== shape || t.deadline !== deadline || t.text !== text) {
          const activePlacedCoords = todos
            .filter(todo => todo.id !== id && !todo.completed && todo.placedCoords)
            .flatMap(todo => todo.placedCoords as Coord[]);
          placedCoords = calculatePlacement(shape, activePlacedCoords);
        }

        return {
          ...t,
          text,
          deadline,
          shape,
          placedCoords
        };
      }
      return t;
    });

    updateCurrentDateTodos(updated);
  }, [todos, updateCurrentDateTodos]);

  const deleteTodo = useCallback((id: string) => {
    const updated = todos.filter(t => t.id !== id);
    // After deletion, run gravity on the remaining active items to pack the board nicely
    const gravityApplied = applyGravity(updated);
    updateCurrentDateTodos(gravityApplied);
  }, [todos, updateCurrentDateTodos]);

  const toggleTodoComplete = useCallback((id: string) => {
    const updated = todos.map(t => {
      if (t.id === id) {
        return {
          ...t,
          completed: !t.completed,
          // If completing, we're removing it from board coordinates
          placedCoords: t.completed ? [] : t.placedCoords // will be placed on next block calculations if unchecked
        };
      }
      return t;
    });

    // If we completed an item, we should run gravity to let above blocks fall down!
    let gravityApplied = updated;
    const completedItem = todos.find(t => t.id === id);
    if (completedItem && !completedItem.completed) {
      // It was checked (active -> completed)
      // Remove its coordinates first so gravity shifts items down
      const clearedCoords = updated.map(t => t.id === id ? { ...t, placedCoords: [] } : t);
      gravityApplied = applyGravity(clearedCoords);
    } else if (completedItem && completedItem.completed) {
      // It was unchecked (completed -> active)
      // We need to place it back onto the board!
      const activePlacedCoords = updated
        .filter(t => t.id !== id && !t.completed && t.placedCoords)
        .flatMap(t => t.placedCoords as Coord[]);
      
      const newShape = completedItem.shape || getDeterministicShape(completedItem.text, completedItem.deadline);
      const newCoords = calculatePlacement(newShape, activePlacedCoords);
      
      gravityApplied = updated.map(t => {
        if (t.id === id) {
          return { ...t, shape: newShape, placedCoords: newCoords };
        }
        return t;
      });
    }

    updateCurrentDateTodos(gravityApplied);
  }, [todos, updateCurrentDateTodos]);

  // Clean records
  const clearTodayRecords = useCallback(() => {
    setDailyRecords(prev => {
      const newRecords = { ...prev };
      delete newRecords[selectedDateKey];
      persistState(backgroundId, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, newRecords);
      return newRecords;
    });
  }, [backgroundId, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, persistState]);

  // Import configuration
  const importConfig = useCallback(async (config: any) => {
    let nextBgId = backgroundId;
    let nextBgFile = backgroundCustomFile;
    let nextWeather = weather;
    let nextGrid = grid;
    let nextDateKey = selectedDateKey;
    let nextMonthKey = calendarMonthKey;
    let nextRecords = dailyRecords;

    if (config.grid) {
      nextGrid = { ...DEFAULT_GRID, ...config.grid };
      setGrid(nextGrid);
    }
    if (config.weather) {
      nextWeather = { ...DEFAULT_WEATHER, ...config.weather };
      setWeather(nextWeather);
    }
    if (config.background) {
      nextBgId = config.background.id || 'coastline';
      nextBgFile = config.background.customFile || '';
      setBackgroundId(nextBgId);
      setBackgroundCustomFile(nextBgFile);
      
      if (config.background.custom && config.background.custom.startsWith('data:')) {
        try {
          const blob = dataUrlToBlob(config.background.custom);
          await saveCustomBackgroundBlob(blob);
          const url = URL.createObjectURL(blob);
          setBackgroundCustomUrl(url);
        } catch (err) {
          console.warn('Importing custom background failed:', err);
        }
      }
    }
    if (config.selectedDateKey) {
      nextDateKey = config.selectedDateKey;
      setSelectedDateKey(nextDateKey);
    }
    if (config.calendarMonthKey) {
      nextMonthKey = config.calendarMonthKey;
      setCalendarMonthKey(nextMonthKey);
    }
    if (config.dailyRecords) {
      // Normalize imported records
      const normalizedRecords: Record<string, DailyRecord> = {};
      for (const [dateKey, record] of Object.entries(config.dailyRecords)) {
        if (!record || typeof record !== 'object') continue;
        const rawTodos = (record as any).todos || [];
        const normalizedTodos: TodoItem[] = [];
        const activePlacedCoords: Coord[] = [];
        
        for (const todo of rawTodos) {
          if (!todo) continue;
          const completed = todo.completed ?? todo.done ?? false;
          const text = todo.text || '';
          const deadline = todo.deadline || '';
          const shape = todo.shape || getDeterministicShape(text, deadline);
          
          let placedCoords = todo.placedCoords;
          if (!completed) {
            if (!placedCoords || placedCoords.length === 0) {
              placedCoords = calculatePlacement(shape, activePlacedCoords);
            }
            activePlacedCoords.push(...placedCoords);
          } else {
            placedCoords = [];
          }
          
          normalizedTodos.push({
            id: todo.id || `todo_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            text,
            completed,
            deadline,
            shape,
            placedCoords,
          });
        }
        
        normalizedRecords[dateKey] = {
          memo: (record as any).memo || '',
          todos: normalizedTodos,
          updatedAt: (record as any).updatedAt || new Date().toISOString(),
        };
      }
      nextRecords = normalizedRecords;
      setDailyRecords(nextRecords);
    }

    persistState(nextBgId, nextBgFile, nextWeather, nextGrid, nextDateKey, nextMonthKey, nextRecords);
  }, [backgroundId, backgroundCustomFile, weather, grid, selectedDateKey, calendarMonthKey, dailyRecords, persistState]);

  // 7. Passive synchronization across WebView windows via the "storage" event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      try {
        const val = e.newValue ? JSON.parse(e.newValue) : null;
        if (e.key === STORAGE_KEYS.background) {
          setBackgroundId(val ?? 'coastline');
        } else if (e.key === STORAGE_KEYS.customBackgroundFile) {
          setBackgroundCustomFile(val ?? '');
        } else if (e.key === STORAGE_KEYS.weather) {
          setWeather(val ?? DEFAULT_WEATHER);
        } else if (e.key === STORAGE_KEYS.grid) {
          setGrid(val ?? DEFAULT_GRID);
        } else if (e.key === STORAGE_KEYS.dailyRecords) {
          setDailyRecords(val ?? {});
        } else if (e.key === STORAGE_KEYS.selectedDateKey) {
          setSelectedDateKey(val ?? getTodayKey());
        } else if (e.key === "ivory.background.custom.updatedAt") {
          loadCustomBg(true);
        }
      } catch (err) {
        console.warn('Passive state sync failed on storage event:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadCustomBg]);

  // 8. Fetch recovered data on mount if available via native bridge
  useEffect(() => {
    if (!nativeBridge.available || !viewContext.isEditor) return;
    
    let active = true;
    async function fetchRecoveredData() {
      try {
        const response = await nativeBridge.invoke('getRecoveredData');
        if (active && response && response.dailyRecords && Object.keys(response.dailyRecords).length > 0) {
          console.log('[useWallpaperState] Received recovered data, importing...', response);
          await importConfig(response);
        }
      } catch (err) {
        console.warn('[useWallpaperState] Failed to fetch recovered data:', err);
      }
    }
    
    // Delay slightly to ensure bridge is fully ready and stable
    const timer = setTimeout(fetchRecoveredData, 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [nativeBridge, viewContext.isEditor, importConfig]);

  return {
    backgroundId,
    backgroundCustomFile,
    backgroundCustomUrl,
    weather,
    grid,
    selectedDateKey,
    calendarMonthKey,
    dailyRecords,
    todos,
    currentRecord,
    
    changeBackground,
    changeWeather,
    resetWeather,
    changeGrid,
    resetGrid,
    selectDate,
    addTodo,
    editTodo,
    deleteTodo,
    toggleTodoComplete,
    clearTodayRecords,
    importConfig,
    nativeBridge,
    viewContext,
  };
}
