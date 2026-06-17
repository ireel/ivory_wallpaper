import React, { useEffect, useRef } from 'react';

export interface WeatherState {
  effect: 'sunny' | 'rain' | 'snow' | 'cloudy' | 'foggy' | 'hail' | 'off';
  enabled: boolean;
  intensity: number;
  wind: number;
  opacity: number;
  coverage: number;
}

interface WeatherCanvasProps {
  weather: WeatherState;
}

declare global {
  interface Window {
    IvoryWeatherRenderer?: {
      create: (options: { elements: { weatherCanvas: HTMLCanvasElement | null } }) => {
        apply: (weather: any) => void;
        resize: () => void;
        destroy: () => void;
        recover?: () => void;
      };
    };
  }
}

function clampFloat(value: number, min: number, max: number, fixed = 2): number {
  const clamped = Math.max(min, Math.min(max, value));
  return Number(clamped.toFixed(fixed));
}

export const WeatherCanvas: React.FC<WeatherCanvasProps> = ({ weather }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    // 1. Initialize canvas and renderer
    if (window.IvoryWeatherRenderer && canvasRef.current) {
      try {
        rendererRef.current = window.IvoryWeatherRenderer.create({
          elements: {
            weatherCanvas: canvasRef.current,
          },
        });
      } catch (err) {
        console.error("Failed to create IvoryWeatherRenderer:", err);
      }
    }

    // 2. Add resize listener
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // 3. Update weather variables and apply to canvas
    const root = document.documentElement;
    const intensity = weather.intensity;
    const wind = weather.wind;
    const opacityScale = weather.opacity;
    const coverage = weather.coverage;
    const effect = weather.enabled ? weather.effect : 'none';

    let layerOpacity = 0;
    let cloudOpacity = 0;
    let cloudSpeed = 1;
    let fogOpacity = 0;
    let fogDensity = 0.5;
    let sunOpacity = 0;
    let sunX = '78%';
    let sunY = '18%';
    let sunSize = `${clampFloat(28 + intensity * 12, 24, 42, 2)}vmax`;

    if (effect === 'sunny') {
      layerOpacity = clampFloat(0.22 + opacityScale * 0.5, 0.22, 0.72, 2);
      sunOpacity = clampFloat(0.38 + intensity * 0.42, 0.38, 0.88, 2) * opacityScale;
      cloudOpacity = clampFloat(0.05 + coverage * 0.12, 0.05, 0.18, 2);
      cloudSpeed = clampFloat(0.42 + Math.abs(wind) * 0.55, 0.42, 1.1, 2);
      sunX = `${clampFloat(76 + wind * 6, 68, 84, 2)}%`;
    } else if (effect === 'rain') {
      layerOpacity = clampFloat(0.45 + opacityScale * 0.4, 0.3, 0.9, 2);
      cloudOpacity = clampFloat(0.32 + coverage * 0.38 + intensity * 0.1, 0.3, 0.84, 2);
      cloudSpeed = clampFloat(0.85 + intensity * 0.8 + Math.abs(wind) * 0.45, 0.85, 1.95, 2);
      fogOpacity = clampFloat(0.04 + intensity * 0.08, 0.04, 0.18, 2);
      fogDensity = clampFloat(0.3 + coverage * 0.2, 0.25, 0.6, 2);
    } else if (effect === 'snow') {
      layerOpacity = clampFloat(0.42 + opacityScale * 0.34, 0.3, 0.82, 2);
      cloudOpacity = clampFloat(0.18 + coverage * 0.3, 0.18, 0.58, 2);
      cloudSpeed = clampFloat(0.42 + Math.abs(wind) * 0.35, 0.42, 0.95, 2);
      fogOpacity = clampFloat(0.03 + coverage * 0.08, 0.03, 0.16, 2);
      fogDensity = clampFloat(0.28 + coverage * 0.16, 0.25, 0.5, 2);
    } else if (effect === 'cloudy') {
      layerOpacity = clampFloat(0.26 + opacityScale * 0.36, 0.22, 0.76, 2);
      cloudOpacity = clampFloat(0.34 + coverage * 0.44, 0.34, 0.9, 2);
      cloudSpeed = clampFloat(0.55 + Math.abs(wind) * 0.55, 0.55, 1.25, 2);
      fogOpacity = clampFloat(0.03 + coverage * 0.08, 0.03, 0.14, 2);
      fogDensity = clampFloat(0.26 + coverage * 0.16, 0.24, 0.46, 2);
    } else if (effect === 'foggy') {
      layerOpacity = clampFloat(0.3 + opacityScale * 0.45, 0.28, 0.82, 2);
      cloudOpacity = clampFloat(0.12 + coverage * 0.18, 0.12, 0.34, 2);
      cloudSpeed = clampFloat(0.3 + Math.abs(wind) * 0.25, 0.3, 0.72, 2);
      fogOpacity = clampFloat(0.24 + coverage * 0.46, 0.24, 0.84, 2);
      fogDensity = clampFloat(0.42 + coverage * 0.45, 0.42, 0.92, 2);
    } else if (effect === 'hail') {
      layerOpacity = clampFloat(0.5 + opacityScale * 0.38, 0.36, 0.92, 2);
      cloudOpacity = clampFloat(0.42 + coverage * 0.4 + intensity * 0.06, 0.42, 0.92, 2);
      cloudSpeed = clampFloat(1 + intensity * 0.72 + Math.abs(wind) * 0.55, 1, 2.1, 2);
      fogOpacity = clampFloat(0.05 + intensity * 0.1, 0.05, 0.2, 2);
      fogDensity = clampFloat(0.34 + coverage * 0.2, 0.3, 0.6, 2);
    }

    // Set attributes for visual feedback on document body
    document.body.setAttribute('data-weather-effect', effect);

    root.style.setProperty('--weather-layer-opacity', `${effect === 'none' ? 0 : layerOpacity}`);
    root.style.setProperty('--weather-cloud-opacity', `${cloudOpacity}`);
    root.style.setProperty('--weather-cloud-speed', `${cloudSpeed}`);
    root.style.setProperty('--weather-fog-opacity', `${fogOpacity}`);
    root.style.setProperty('--weather-fog-density', `${fogDensity}`);
    root.style.setProperty('--weather-sun-opacity', `${sunOpacity}`);
    root.style.setProperty('--weather-sun-x', sunX);
    root.style.setProperty('--weather-sun-y', sunY);
    root.style.setProperty('--weather-sun-size', sunSize);

    // Apply to canvas particle generator
    if (rendererRef.current) {
      rendererRef.current.apply({
        effect,
        enabled: effect !== 'none',
        intensity,
        wind,
        opacity: opacityScale,
        coverage,
      });
      if (rendererRef.current.recover) {
        rendererRef.current.recover();
      }
    }
  }, [weather]);

  return (
    <canvas 
      ref={canvasRef} 
      className="weather-canvas" 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};
