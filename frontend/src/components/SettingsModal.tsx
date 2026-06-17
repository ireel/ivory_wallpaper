import React, { useState, useEffect } from 'react';
import type { WeatherState } from '../hooks/useWallpaperState';
import { useWallpaperState, PRESET_BACKGROUNDS } from '../hooks/useWallpaperState';
import { X, Palette, Cloud, Grid, Power, Database, Calendar, RefreshCw, ChevronLeft, ChevronRight, Upload, FileDown, RotateCcw, Trash2 } from 'lucide-react';
import { loadCustomBackgroundBlob, blobToDataUrl } from '../utils/db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: ReturnType<typeof useWallpaperState>;
  initialTab?: TabType;
}

type TabType = 'background' | 'weather' | 'grid' | 'startup' | 'data' | 'calendar';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  initialTab = 'background',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Update active tab when modal is opened with a specific tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Startup launch preferences
  const [startupSupported, setStartupSupported] = useState(false);
  const [startupEnabled, setStartupEnabled] = useState(false);
  const [startupLoading, setStartupLoading] = useState(true);

  // Calendar state
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed
  const [calSelectedDate, setCalSelectedDate] = useState<string>(() => state.selectedDateKey);

  // Load startup status from native bridge when opening the tab
  useEffect(() => {
    if (activeTab === 'startup' && isOpen) {
      const fetchStartup = async () => {
        setStartupLoading(true);
        try {
          const res = await state.nativeBridge.invoke('getStartupStatus');
          if (res) {
            setStartupSupported(res.supported);
            setStartupEnabled(res.enabled);
          }
        } catch (err) {
          console.warn('Failed to fetch startup settings:', err);
        } finally {
          setStartupLoading(false);
        }
      };
      fetchStartup();
    }
  }, [activeTab, isOpen, state.nativeBridge]);

  // Sync calendar view month to selected date
  useEffect(() => {
    const parts = state.selectedDateKey.split('-');
    if (parts.length === 3) {
      setCalendarYear(parseInt(parts[0]));
      setCalendarMonth(parseInt(parts[1]) - 1);
      setCalSelectedDate(state.selectedDateKey);
    }
  }, [state.selectedDateKey, isOpen]);

  if (!isOpen) return null;

  const handleStartupToggle = async () => {
    setStartupLoading(true);
    const target = !startupEnabled;
    try {
      const res = await state.nativeBridge.invoke('setStartupEnabled', { enabled: target });
      if (res) {
        setStartupEnabled(res.enabled);
      }
    } catch (err) {
      console.warn('Failed to save startup settings:', err);
      // Fallback toggling locally in mock
      setStartupEnabled(target);
    } finally {
      setStartupLoading(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      const blob = await loadCustomBackgroundBlob();
      const customBase64 = blob ? await blobToDataUrl(blob) : '';
      
      const payload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        grid: state.grid,
        weather: state.weather,
        background: {
          id: state.backgroundId,
          custom: customBase64,
          customFile: state.backgroundCustomFile,
        },
        selectedDateKey: state.selectedDateKey,
        calendarMonthKey: state.calendarMonthKey,
        dailyRecords: state.dailyRecords,
      };

      const fileBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const fileUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.href = fileUrl;
      link.download = `ivory-config-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);
    } catch (err) {
      console.error('Export configuration failed:', err);
      alert('备份配置导出失败');
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const config = JSON.parse(String(reader.result));
        await state.importConfig(config);
        alert('配置加载成功！');
      } catch (err) {
        console.error('Import failed:', err);
        alert('配置文件解析失败，请确保格式正确。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.changeBackground('custom', file);
    }
    e.target.value = '';
  };

  // Calendar calculations
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (year: number, month: number) => {
    // getDay returns 0 for Sunday, 1 for Monday etc.
    // We want Monday as index 0, Tuesday index 1, Sunday index 6.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const shiftMonth = (amount: number) => {
    let nextMonth = calendarMonth + amount;
    let nextYear = calendarYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCalendarMonth(nextMonth);
    setCalendarYear(nextYear);
  };

  const renderCalendarGrid = () => {
    const daysCount = daysInMonth(calendarYear, calendarMonth);
    const startIdx = firstDayIndex(calendarYear, calendarMonth);
    const cells = [];

    // Empty padding slots for start of month
    for (let i = 0; i < startIdx; i++) {
      cells.push(<div key={`pad-${i}`} style={{ height: '32px' }} />);
    }

    // Days slots
    for (let day = 1; day <= daysCount; day++) {
      const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = state.dailyRecords[dateKey];
      const hasRecord = record && record.todos && record.todos.length > 0;
      const isSelected = calSelectedDate === dateKey;
      const isToday = getTodayKey() === dateKey;

      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => setCalSelectedDate(dateKey)}
          style={{
            height: '34px',
            borderRadius: '6px',
            border: isSelected ? '1.5px solid var(--accent)' : '1px solid transparent',
            background: isSelected 
              ? 'rgba(56, 189, 248, 0.15)' 
              : hasRecord 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'transparent',
            color: isSelected 
              ? 'var(--text-primary)' 
              : isToday 
                ? 'var(--accent)' 
                : 'var(--text-secondary)',
            fontWeight: isToday || isSelected ? 600 : 400,
            cursor: 'pointer',
            position: 'relative',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {day}
          {hasRecord && !isSelected && (
            <div 
              style={{
                position: 'absolute',
                bottom: '3px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          )}
        </button>
      );
    }

    return cells;
  };

  const calSelectedRecord = state.dailyRecords[calSelectedDate] || { memo: '', todos: [] };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(780px, calc(100vw - 20px))',
          height: 'min(520px, calc(100vh - 20px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideScale 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>系统设置</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              配置桌面壁纸、天气动画、图标布局和管理历史数据
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <nav 
            style={{
              width: '180px',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '16px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {[
              { id: 'background', label: '更换背景', icon: <Palette size={16} /> },
              { id: 'weather', label: '天气效果', icon: <Cloud size={16} /> },
              { id: 'grid', label: '网格对齐', icon: <Grid size={16} /> },
              { id: 'startup', label: '开机启动', icon: <Power size={16} /> },
              { id: 'data', label: '备份管理', icon: <Database size={16} /> },
              { id: 'calendar', label: '日历记录', icon: <Calendar size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Pane Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* Background Pane */}
            {activeTab === 'background' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>桌面壁纸</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    选择内置动态渐变背景，或上传自定义的高清本地图片
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {PRESET_BACKGROUNDS.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => state.changeBackground(bg.id)}
                      style={{
                        height: '76px',
                        borderRadius: '10px',
                        border: state.backgroundId === bg.id ? '2px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: bg.image,
                        backgroundSize: 'cover',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '8px',
                        boxShadow: state.backgroundId === bg.id ? '0 0 12px var(--accent-glow)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: 'white', 
                          background: 'rgba(0, 0, 0, 0.65)', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {bg.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div 
                  style={{
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    background: state.backgroundId === 'custom' ? 'rgba(56, 189, 248, 0.03)' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {state.backgroundId === 'custom' ? '当前正在使用自定义壁纸' : '您可以上传本地图片作为壁纸背景'}
                  </div>
                  <label className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '12px' }}>
                    <Upload size={14} />
                    <span>上传本地图片</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCustomBgUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Weather Pane */}
            {activeTab === 'weather' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>天气特效效果</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      调节常驻桌面背景的轻量动态天气动画粒子与透明图层
                    </p>
                  </div>
                  <button onClick={state.resetWeather} className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    <RotateCcw size={12} />
                    <span>恢复默认</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { id: 'off', label: '关闭' },
                    { id: 'sunny', label: '晴天' },
                    { id: 'rain', label: '下雨' },
                    { id: 'snow', label: '下雪' },
                    { id: 'cloudy', label: '多云' },
                    { id: 'foggy', label: '大雾' },
                    { id: 'hail', label: '冰雹' },
                  ].map(mode => {
                    const isActive = (mode.id === 'off' && !state.weather.enabled) || 
                      (mode.id !== 'off' && state.weather.enabled && state.weather.effect === mode.id);
                    
                    return (
                      <button
                        key={mode.id}
                        onClick={() => state.changeWeather({ 
                          enabled: mode.id !== 'off', 
                          effect: mode.id === 'off' ? 'sunny' : mode.id as WeatherState['effect'] 
                        })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#042f44' : 'var(--text-secondary)',
                          border: 'none',
                          fontWeight: isActive ? 600 : 400,
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {state.weather.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                    {/* Intensity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>降水量/阳光强度</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{state.weather.intensity}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" 
                        max="1" 
                        step="0.05"
                        value={state.weather.intensity} 
                        onChange={e => state.changeWeather({ intensity: parseFloat(e.target.value) })}
                      />
                    </div>

                    {/* Wind */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>风力偏角</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{state.weather.wind}</span>
                      </div>
                      <input 
                        type="range" 
                        min="-1" 
                        max="1" 
                        step="0.05"
                        value={state.weather.wind} 
                        onChange={e => state.changeWeather({ wind: parseFloat(e.target.value) })}
                      />
                    </div>

                    {/* Opacity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>特效透明度</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{state.weather.opacity}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.25" 
                        max="1" 
                        step="0.05"
                        value={state.weather.opacity} 
                        onChange={e => state.changeWeather({ opacity: parseFloat(e.target.value) })}
                      />
                    </div>

                    {/* Coverage */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>雾气/云层浓度</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{state.weather.coverage}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" 
                        max="1" 
                        step="0.05"
                        value={state.weather.coverage} 
                        onChange={e => state.changeWeather({ coverage: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grid Pane */}
            {activeTab === 'grid' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>桌面单元格网格</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      微调桌面图标对齐区域，壁纸在切换物理分辨率时将进行自适应换算
                    </p>
                  </div>
                  <button onClick={state.resetGrid} className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    <RotateCcw size={12} />
                    <span>恢复默认</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>单元格宽度 (px)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.cellW} 
                      onChange={e => state.changeGrid({ cellW: parseInt(e.target.value) || 40 })} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>单元格高度 (px)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.cellH} 
                      onChange={e => state.changeGrid({ cellH: parseInt(e.target.value) || 40 })} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>水平偏移量 (offsetX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.offsetX} 
                      onChange={e => state.changeGrid({ offsetX: parseInt(e.target.value) || 0 })} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>垂直偏移量 (offsetY)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.offsetY} 
                      onChange={e => state.changeGrid({ offsetY: parseInt(e.target.value) || 0 })} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>基准宽度 baseWidth (px)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.baseWidth} 
                      onChange={e => state.changeGrid({ baseWidth: parseInt(e.target.value) || 800 })} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>基准高度 baseHeight (px)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={state.grid.baseHeight} 
                      onChange={e => state.changeGrid({ baseHeight: parseInt(e.target.value) || 600 })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>网格辅助线透明度</span>
                    <span style={{ color: 'var(--accent)' }}>{state.grid.opacity}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={state.grid.opacity} 
                    onChange={e => state.changeGrid({ opacity: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {/* Startup Pane */}
            {activeTab === 'startup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>开机自动启动</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    管理本壁纸软件的开机启动参数设置。启用后将通过 Windows 注册表进行关联启动。
                  </p>
                </div>

                {startupLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={14} className="spin" />
                    <span>读取 Windows 系统启动状态...</span>
                  </div>
                ) : !startupSupported ? (
                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '13px' }}>
                    本系统/版本不支持配置自启动项，请在 Windows 任务管理器中手动配置。
                  </div>
                ) : (
                  <div 
                    style={{ 
                      padding: '16px 20px', 
                      borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>自启动壁纸模式</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        登录 Windows 后自动运行 runtime 以加载当前壁纸网格
                      </div>
                    </div>
                    <label 
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '46px',
                        height: '24px',
                        cursor: 'pointer'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={startupEnabled} 
                        onChange={handleStartupToggle}
                        style={{ opacity: 0, width: 0, height: 0 }} 
                      />
                      <span 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '34px',
                          background: startupEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                          transition: '0.2s',
                        }}
                      />
                      <span 
                        style={{
                          position: 'absolute',
                          left: '4px',
                          bottom: '3px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: startupEnabled ? '#042f44' : '#f8fafc',
                          transition: '0.2s',
                          transform: startupEnabled ? 'translateX(20px)' : 'translateX(0)',
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Data Pane */}
            {activeTab === 'data' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>配置与备份管理</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    备份壁纸的所有待办记录、网络对齐偏置参数，或重启桌面底层渲染器
                  </p>
                </div>

                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '12px',
                  }}
                >
                  <button onClick={handleExportConfig} className="btn" style={{ padding: '12px' }}>
                    <FileDown size={16} />
                    <span>备份/导出配置</span>
                  </button>

                  <label className="btn" style={{ padding: '12px', cursor: 'pointer' }}>
                    <Upload size={16} />
                    <span>导入/加载配置</span>
                    <input 
                      type="file" 
                      accept="application/json" 
                      onChange={handleImportConfig} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  <button 
                    onClick={() => {
                      if(window.confirm('您确定要清空今天的待办记录吗？该操作不可撤销。')) {
                        state.clearTodayRecords();
                        alert('今日待办已清空。');
                      }
                    }} 
                    className="btn btn-danger" 
                    style={{ padding: '12px' }}
                  >
                    <Trash2 size={16} />
                    <span>清空今日待办记录</span>
                  </button>

                  <button 
                    onClick={() => {
                      state.nativeBridge.invoke('restartApp');
                    }} 
                    className="btn" 
                    style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)' }}
                  >
                    <RefreshCw size={16} />
                    <span>重启底层应用</span>
                  </button>
                </div>
              </div>
            )}

            {/* Calendar Pane */}
            {activeTab === 'calendar' && (
              <div style={{ display: 'flex', gap: '20px', height: '340px' }}>
                {/* Left Month Calendar */}
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <button onClick={() => shiftMonth(-1)} className="btn btn-ghost" style={{ padding: '4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {calendarYear} 年 {calendarMonth + 1} 月
                    </span>
                    <button onClick={() => shiftMonth(1)} className="btn btn-ghost" style={{ padding: '4px' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gap: '4px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      marginBottom: '2px',
                    }}
                  >
                    <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
                  </div>

                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gridAutoRows: '34px',
                      gap: '4px',
                      flex: 1,
                    }}
                  >
                    {renderCalendarGrid()}
                  </div>
                </div>

                {/* Right Calendar Detail View */}
                <div 
                  style={{ 
                    flex: 0.8, 
                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingLeft: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>查看日期</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {calSelectedDate}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>待办记录</div>
                      <div 
                        style={{ 
                          fontSize: '12px', 
                          color: calSelectedRecord.todos.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', 
                          marginTop: '4px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {calSelectedRecord.todos.length > 0 ? (
                          calSelectedRecord.todos.map(t => (
                            <div 
                              key={t.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                opacity: t.completed ? 0.5 : 1,
                                textDecoration: t.completed ? 'line-through' : 'none'
                              }}
                            >
                              <div 
                                style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  background: t.completed ? 'var(--text-muted)' : 'var(--accent)' 
                                }} 
                              />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                            </div>
                          ))
                        ) : (
                          <span>该天尚无任何待办记录</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      state.selectDate(calSelectedDate);
                      onClose();
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '12px' }}
                  >
                    <span>切换查看该日待办</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideScale {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// Helper for format date matching YYYY-MM-DD
function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
