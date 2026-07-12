export interface StartupStatus {
  supported: boolean;
  enabled: boolean;
  default_enabled: boolean;
  mode: string;
}

export interface RecoveredConfig {
  dailyRecords?: Record<string, unknown>;
  [key: string]: unknown;
}

interface NativeCommandMap {
  getStartupStatus: { payload: undefined; result: StartupStatus };
  setStartupEnabled: { payload: { enabled: boolean }; result: StartupStatus };
  restartApp: { payload: undefined; result: { restarting: boolean } };
  syncSystemWallpaperFile: { payload: { path: string }; result: { path: string } };
  syncSystemWallpaper: { payload: { dataUrl: string }; result: { path: string } };
  getRecoveredData: { payload: undefined; result: RecoveredConfig | null };
  logFrontend: { payload: { level: string; message: string; context: string }; result: { logged: boolean } };
}

// Define the interface for the native bridge response
export type NativeCommand = keyof NativeCommandMap;
export type NativeInvoke = <K extends NativeCommand>(
  command: K,
  payload?: NativeCommandMap[K]['payload'],
) => Promise<NativeCommandMap[K]['result']>;

export interface NativeBridge {
  available: boolean;
  invoke: NativeInvoke;
}

// Define typings for the global object
declare global {
  interface Window {
    IvoryNativeBridge?: {
      create: () => {
        available: boolean;
        invoke: NativeInvoke;
      };
    };
  }
}

let activeBridge: NativeBridge | null = null;

export function getNativeBridge(): NativeBridge {
  if (activeBridge) return activeBridge;

  // Initialize the bridge
  if (window.IvoryNativeBridge) {
    try {
      const native = window.IvoryNativeBridge.create();
      activeBridge = {
        available: native.available,
        invoke: async (command, payload) => {
          console.log(`[NativeBridge] Invoking native command: ${command}`, payload);
          return native.invoke(command, payload);
        }
      };
      return activeBridge;
    } catch (err) {
      console.error("Failed to initialize IvoryNativeBridge, falling back to mock:", err);
    }
  }

  // Mock implementation for standard browser debugging
  activeBridge = {
    available: false,
    invoke: async (command, payload) => {
      console.log(`[MockBridge] Mock invoke: ${command}`, payload);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      switch (command) {
        case 'getStartupStatus':
          return {
            supported: true,
            enabled: JSON.parse(localStorage.getItem('mock.startupEnabled') || 'false'),
            default_enabled: true,
            mode: 'workerw'
          };
        case 'setStartupEnabled': {
          const startupPayload = payload as NativeCommandMap['setStartupEnabled']['payload'];
          localStorage.setItem('mock.startupEnabled', String(startupPayload.enabled));
          return {
            supported: true,
            enabled: startupPayload.enabled,
            default_enabled: true,
            mode: 'workerw'
          };
        }
        case 'restartApp':
          console.warn('[MockBridge] restartApp command received.');
          return { restarting: true };
        case 'syncSystemWallpaperFile': {
          const wallpaperPayload = payload as NativeCommandMap['syncSystemWallpaperFile']['payload'];
          console.log('[MockBridge] Syncing wallpaper path:', wallpaperPayload.path);
          return { path: wallpaperPayload.path };
        }
        case 'syncSystemWallpaper':
          console.log('[MockBridge] Syncing wallpaper dataUrl chunk.');
          return { path: 'mock_path_to_wallpaper.png' };
        case 'getRecoveredData':
          return null;
        case 'logFrontend':
          return { logged: true };
        default:
          return {};
      }
    }
  };

  return activeBridge;
}

export function useNativeBridge() {
  return getNativeBridge();
}
