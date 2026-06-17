import { useEffect, useState } from 'react';

// Define the interface for the native bridge response
export interface NativeBridge {
  available: boolean;
  invoke: (command: string, payload?: any) => Promise<any>;
}

// Define typings for the global object
declare global {
  interface Window {
    IvoryNativeBridge?: {
      create: () => {
        available: boolean;
        invoke: (command: string, payload?: any) => Promise<any>;
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
        case 'setStartupEnabled':
          localStorage.setItem('mock.startupEnabled', String(payload.enabled));
          return {
            supported: true,
            enabled: payload.enabled,
            default_enabled: true,
            mode: 'workerw'
          };
        case 'restartApp':
          console.warn('[MockBridge] restartApp command received.');
          return { restarting: true };
        case 'syncSystemWallpaperFile':
          console.log('[MockBridge] Syncing wallpaper path:', payload.path);
          return { path: payload.path };
        case 'syncSystemWallpaper':
          console.log('[MockBridge] Syncing wallpaper dataUrl chunk.');
          return { path: 'mock_path_to_wallpaper.png' };
        default:
          return {};
      }
    }
  };

  return activeBridge;
}

export function useNativeBridge() {
  const [bridge, setBridge] = useState<NativeBridge>(() => getNativeBridge());

  useEffect(() => {
    // Poll/check if the bridge becomes available later (e.g. initialization delay)
    if (!bridge.available && window.IvoryNativeBridge) {
      setBridge(getNativeBridge());
    }
  }, [bridge.available]);

  return bridge;
}
