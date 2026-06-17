import React, { useEffect, useState } from 'react';

export const ClockWidget: React.FC = () => {
  const [time, setTime] = useState<string>('00:00:00');
  const [dateStr, setDateStr] = useState<string>('2026/01/01 星期四');

  useEffect(() => {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    const updateTime = () => {
      const now = new Date();
      
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const weekday = weekdays[now.getDay()];
      
      setDateStr(`${year}/${month}/${day} ${weekday}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section 
      className="glass-panel"
      style={{
        position: 'fixed',
        top: 'var(--clock-top)',
        left: 'var(--icon-grid-offset-x)',
        width: 'var(--clock-width)',
        padding: '24px 28px',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'auto',
      }}
      aria-label="时间区域"
    >
      <div 
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          opacity: 0.85,
          marginBottom: '2px',
        }}
      >
        TIME & DATE
      </div>
      <div 
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '4.5rem',
          fontWeight: 800,
          lineHeight: '1',
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          textShadow: '0 0 24px rgba(56, 189, 248, 0.15)',
        }}
      >
        {time}
      </div>
      <div 
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginTop: '6px',
          letterSpacing: '0.05em',
        }}
      >
        {dateStr}
      </div>
    </section>
  );
};
