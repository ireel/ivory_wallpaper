import { useState } from 'react';
import { useWallpaperState, PRESET_BACKGROUNDS } from './hooks/useWallpaperState';
import { ClockWidget } from './components/ClockWidget';
import { WeatherCanvas } from './components/WeatherCanvas';
import { TodoPanel } from './components/TodoPanel';
import { SettingsModal } from './components/SettingsModal';
import { Settings } from 'lucide-react';

function App() {
  const wallpaperState = useWallpaperState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'background' | 'weather' | 'grid' | 'startup' | 'data' | 'calendar'>('background');

  const handleOpenSettingsCalendar = () => {
    setSettingsTab('calendar');
    setSettingsOpen(true);
  };

  const getBackgroundStyle = () => {
    if ((wallpaperState.backgroundId === 'custom' || wallpaperState.backgroundId.startsWith('custom_')) && wallpaperState.backgroundCustomUrl) {
      return { backgroundImage: `url("${wallpaperState.backgroundCustomUrl}")` };
    }
    const preset = PRESET_BACKGROUNDS.find(p => p.id === wallpaperState.backgroundId) || PRESET_BACKGROUNDS[0];
    return { backgroundImage: preset.image };
  };

  return (
    <>
      {/* Background layer */}
      <div 
        className="background-layer" 
        style={getBackgroundStyle()} 
      />
      
      {/* Vignette effect */}
      <div className="vignette" />

      {/* Particle weather effects canvas layer */}
      <WeatherCanvas weather={wallpaperState.weather} />

      {/* Settings trigger HUD controls - only visible in editor mode */}
      {wallpaperState.viewContext.isEditor && (
        <header 
          style={{
            position: 'fixed',
            top: '18px',
            right: '20px',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <button 
            onClick={() => {
              setSettingsTab('background');
              setSettingsOpen(true);
            }}
            className="btn glass-panel" 
            style={{
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.35)',
              padding: '10px 18px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <Settings size={15} style={{ opacity: 0.9 }} />
            <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>设置</span>
          </button>
        </header>
      )}

      {/* Main Widgets layout */}
      <main style={{ pointerEvents: 'none', position: 'relative', width: '100vw', height: '100vh' }}>
        {/* Clock & Date display widget */}
        <ClockWidget />

        {/* Todo lists and Tetris stacking dashboard */}
        <TodoPanel 
          state={wallpaperState} 
          onOpenSettingsCalendar={handleOpenSettingsCalendar} 
        />
      </main>

      {/* Global settings sidebar modal */}
      {settingsOpen && <SettingsModal
        key={settingsTab}
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        state={wallpaperState} 
        initialTab={settingsTab}
      />}
    </>
  );
}

export default App;
