(function initIvoryWeatherRenderer(global) {
  const ACTIVE_CANVAS_EFFECTS = new Set(["sunny", "rain", "snow", "hail"]);
  const DEFAULT_WEATHER = {
    effect: "none",
    enabled: false,
    intensity: 0.56,
    wind: 0.35,
    opacity: 0.72,
    coverage: 0.58,
  };

  function createWeatherRenderer(options = {}) {
    const elements = options.elements || {};
    const canvas = elements.weatherCanvas;
    if (!canvas) {
      return {
        apply() {},
        resize() {},
        destroy() {},
      };
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return {
        apply() {},
        resize() {},
        destroy() {},
      };
    }

    const state = { ...DEFAULT_WEATHER };
    const viewport = {
      width: 0,
      height: 0,
      dpr: 1,
    };

    const rain = createRainPool(560);
    const snow = createSnowPool(280);
    const hail = createHailPool(180);
    const splash = createSplashPool(180);

    let animationId = 0;
    let running = false;
    let lastTick = 0;

    function apply(nextWeather) {
      const next = normalizeWeather(nextWeather);
      const effectChanged = state.effect !== next.effect || state.enabled !== next.enabled;

      state.effect = next.effect;
      state.enabled = next.enabled;
      state.intensity = next.intensity;
      state.wind = next.wind;
      state.opacity = next.opacity;
      state.coverage = next.coverage;

      if (effectChanged) {
        reseedParticles();
      }

      if (shouldAnimate()) {
        ensureRunning();
      } else {
        stop();
        clearCanvas();
      }
    }

    function resize() {
      const width = canvas.clientWidth || global.innerWidth || 0;
      const height = canvas.clientHeight || global.innerHeight || 0;
      const dpr = Math.min(global.devicePixelRatio || 1, 1.5);

      if (viewport.width === width && viewport.height === height && viewport.dpr === dpr) {
        return;
      }

      viewport.width = width;
      viewport.height = height;
      viewport.dpr = dpr;

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = width ? `${width}px` : "100%";
      canvas.style.height = height ? `${height}px` : "100%";

      reseedParticles();
      clearCanvas();
    }

    function destroy() {
      stop();
      clearCanvas();
      global.removeEventListener("resize", resize);
    }

    function ensureRunning() {
      resize();
      if (running) {
        return;
      }
      running = true;
      lastTick = 0;

      const tick = () => {
        if (!running) {
          return;
        }
        const now = global.performance ? global.performance.now() : Date.now();
        frame(now);
        animationId = global.setTimeout(tick, 16);
      };
      animationId = global.setTimeout(tick, 16);
    }

    function stop() {
      running = false;
      if (animationId) {
        global.clearTimeout(animationId);
        animationId = 0;
      }
    }

    function shouldAnimate() {
      return state.enabled && ACTIVE_CANVAS_EFFECTS.has(state.effect);
    }

    function frame(timestamp) {
      if (!running) {
        return;
      }

      resize();

      const delta = lastTick ? Math.min(32, timestamp - lastTick) : 16;
      lastTick = timestamp;

      clearCanvas();
      drawFrame(delta, timestamp);
    }

    function clearCanvas() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawFrame(delta, timestamp) {
      if (!viewport.width || !viewport.height) {
        return;
      }

      ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      ctx.globalAlpha = 1;

      if (state.effect === "sunny") {
        drawSunny(timestamp);
        return;
      }

      if (state.effect === "rain") {
        drawRain(delta);
        return;
      }

      if (state.effect === "snow") {
        drawSnow(delta, timestamp);
        return;
      }

      if (state.effect === "hail") {
        drawHail(delta);
      }
    }

    function drawSunny(timestamp) {
      const width = viewport.width;
      const height = viewport.height;
      const intensity = state.intensity;
      const opacity = state.opacity;
      const sunX = width * (0.74 + state.wind * 0.08);
      const sunY = height * 0.2;
      const radius = Math.max(width, height) * (0.18 + intensity * 0.08);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = opacity;

      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius * 1.85);
      glow.addColorStop(0, "rgba(255, 250, 226, 0.92)");
      glow.addColorStop(0.18, "rgba(255, 240, 190, 0.26)");
      glow.addColorStop(0.52, "rgba(255, 235, 180, 0.08)");
      glow.addColorStop(1, "rgba(255, 235, 180, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const flareBaseX = width * 0.5;
      const flareBaseY = height * 0.56;
      const flareOffsetX = (flareBaseX - sunX) * 0.75;
      const flareOffsetY = (flareBaseY - sunY) * 0.75;
      const pulse = Math.sin(timestamp * 0.0011) * 0.08 + 0.92;

      drawFlare(sunX + flareOffsetX, sunY + flareOffsetY, radius * 0.16 * pulse, 0.12 * opacity);
      drawFlare(sunX + flareOffsetX * 1.55, sunY + flareOffsetY * 1.55, radius * 0.1 * pulse, 0.08 * opacity);
      drawFlare(width * 0.5, height - 24, radius * 0.24, 0.1 * opacity);

      ctx.restore();
    }

    function drawFlare(x, y, radius, alpha) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 248, 235, ${alpha.toFixed(3)})`;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawRain(delta) {
      const count = Math.round(140 + state.intensity * 320 + state.coverage * 90);
      const wind = state.wind * (4 + state.intensity * 7);
      const speedScale = 0.8 + state.intensity * 0.9;

      rain.setCount(count, viewport.width, viewport.height);
      rain.update(delta, viewport.width, viewport.height, wind, speedScale, splash);
      rain.draw(ctx, wind, state.opacity);
      splash.update(delta);
      splash.draw(ctx, state.opacity);
    }

    function drawSnow(delta, timestamp) {
      const count = Math.round(80 + state.intensity * 170 + state.coverage * 55);
      const wind = state.wind * (0.7 + state.intensity * 1.2);
      const speedScale = 0.55 + state.intensity * 0.65;

      snow.setCount(count, viewport.width, viewport.height);
      snow.update(delta, viewport.width, viewport.height, wind, speedScale, timestamp);
      snow.draw(ctx, state.opacity);
    }

    function drawHail(delta) {
      const rainCount = Math.round(70 + state.intensity * 90);
      const hailCount = Math.round(20 + state.intensity * 95 + state.coverage * 20);
      const wind = state.wind * (4 + state.intensity * 8);
      const rainSpeedScale = 0.75 + state.intensity * 0.85;
      const hailSpeedScale = 1.15 + state.intensity * 1.2;

      rain.setCount(rainCount, viewport.width, viewport.height);
      rain.update(delta, viewport.width, viewport.height, wind, rainSpeedScale, splash, 0.22);
      rain.draw(ctx, wind, state.opacity * 0.75, 0.62);

      hail.setCount(hailCount, viewport.width, viewport.height);
      hail.update(delta, viewport.width, viewport.height, wind, hailSpeedScale, splash);
      hail.draw(ctx, state.opacity);

      splash.update(delta);
      splash.draw(ctx, state.opacity * 0.9);
    }

    function reseedParticles() {
      rain.seed(viewport.width, viewport.height);
      snow.seed(viewport.width, viewport.height);
      hail.seed(viewport.width, viewport.height);
      splash.clear();
    }

    global.addEventListener("resize", resize);
    resize();

    return {
      apply,
      resize,
      destroy,
    };
  }

  function normalizeWeather(weather) {
    const next = weather || {};
    return {
      effect: typeof next.effect === "string" ? next.effect : DEFAULT_WEATHER.effect,
      enabled: next.enabled !== false,
      intensity: clamp(next.intensity, 0.2, 1, DEFAULT_WEATHER.intensity),
      wind: clamp(next.wind, -1, 1, DEFAULT_WEATHER.wind),
      opacity: clamp(next.opacity, 0.25, 1, DEFAULT_WEATHER.opacity),
      coverage: clamp(next.coverage, 0.2, 1, DEFAULT_WEATHER.coverage),
    };
  }

  function createRainPool(maxCount) {
    const pool = {
      maxCount,
      count: 0,
      x: new Float32Array(maxCount),
      y: new Float32Array(maxCount),
      speed: new Float32Array(maxCount),
      length: new Float32Array(maxCount),
      alpha: new Float32Array(maxCount),
      width: new Float32Array(maxCount),
      seed(width, height) {
        for (let i = 0; i < this.maxCount; i += 1) {
          this.reset(i, width, height, true);
        }
      },
      setCount(nextCount, width, height) {
        const target = Math.max(0, Math.min(this.maxCount, nextCount));
        if (target > this.count) {
          for (let i = this.count; i < target; i += 1) {
            this.reset(i, width, height, true);
          }
        }
        this.count = target;
      },
      reset(index, width, height, randomY) {
        this.x[index] = Math.random() * Math.max(width, 1);
        this.y[index] = randomY ? Math.random() * Math.max(height, 1) : -Math.random() * 120;
        this.speed[index] = 14 + Math.random() * 16;
        this.length[index] = 14 + Math.random() * 22;
        this.alpha[index] = 0.18 + Math.random() * 0.34;
        this.width[index] = 0.8 + Math.random() * 1.4;
      },
      update(delta, width, height, wind, speedScale, splashPool, splashChanceMultiplier) {
        const splashChance = splashChanceMultiplier || 0.4;
        const step = delta / 16;
        for (let i = 0; i < this.count; i += 1) {
          this.y[i] += this.speed[i] * speedScale * step;
          this.x[i] += wind * step;

          if (this.y[i] > height + this.length[i] || this.x[i] < -120 || this.x[i] > width + 120) {
            if (this.y[i] > height - 4 && Math.random() < splashChance) {
              splashPool.spawn(this.x[i], height - 2, wind * 0.08, -1.4, 2);
            }
            this.reset(i, width, height, false);
          }
        }
      },
      draw(ctx, wind, layerOpacity, alphaScale) {
        const scale = alphaScale || 1;
        const slant = wind * 1.8;
        ctx.save();
        ctx.lineCap = "round";
        for (let band = 0; band < 3; band += 1) {
          ctx.beginPath();
          let lineWidth = 1.1 + band * 0.45;
          let alphaBase = 0.16 + band * 0.1;

          for (let i = band; i < this.count; i += 3) {
            const x = this.x[i];
            const y = this.y[i];
            const len = this.length[i];
            ctx.moveTo(x, y);
            ctx.lineTo(x + slant, y + len);
          }

          ctx.strokeStyle = `rgba(205, 225, 245, ${(alphaBase * layerOpacity * scale).toFixed(3)})`;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
        ctx.restore();
      },
    };
    return pool;
  }

  function createSnowPool(maxCount) {
    const pool = {
      maxCount,
      count: 0,
      x: new Float32Array(maxCount),
      y: new Float32Array(maxCount),
      speed: new Float32Array(maxCount),
      radius: new Float32Array(maxCount),
      alpha: new Float32Array(maxCount),
      sway: new Float32Array(maxCount),
      phase: new Float32Array(maxCount),
      seed(width, height) {
        for (let i = 0; i < this.maxCount; i += 1) {
          this.reset(i, width, height, true);
        }
      },
      setCount(nextCount, width, height) {
        const target = Math.max(0, Math.min(this.maxCount, nextCount));
        if (target > this.count) {
          for (let i = this.count; i < target; i += 1) {
            this.reset(i, width, height, true);
          }
        }
        this.count = target;
      },
      reset(index, width, height, randomY) {
        this.x[index] = Math.random() * Math.max(width, 1);
        this.y[index] = randomY ? Math.random() * Math.max(height, 1) : -Math.random() * 100;
        this.speed[index] = 0.8 + Math.random() * 1.9;
        this.radius[index] = 0.8 + Math.random() * 2.8;
        this.alpha[index] = 0.25 + Math.random() * 0.55;
        this.sway[index] = 0.4 + Math.random() * 2.4;
        this.phase[index] = Math.random() * Math.PI * 2;
      },
      update(delta, width, height, wind, speedScale, timestamp) {
        const step = delta / 16;
        const swayTime = timestamp * 0.0012;
        for (let i = 0; i < this.count; i += 1) {
          this.y[i] += this.speed[i] * speedScale * step;
          this.x[i] += wind * 0.6 * step + Math.sin(swayTime + this.phase[i]) * this.sway[i] * 0.14;

          if (this.y[i] > height + 18 || this.x[i] < -24 || this.x[i] > width + 24) {
            this.reset(i, width, height, false);
          }
        }
      },
      draw(ctx, layerOpacity) {
        ctx.save();
        for (let i = 0; i < this.count; i += 1) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(248, 251, 255, ${(this.alpha[i] * layerOpacity).toFixed(3)})`;
          ctx.arc(this.x[i], this.y[i], this.radius[i], 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
    };
    return pool;
  }

  function createHailPool(maxCount) {
    const pool = {
      maxCount,
      count: 0,
      x: new Float32Array(maxCount),
      y: new Float32Array(maxCount),
      speed: new Float32Array(maxCount),
      radius: new Float32Array(maxCount),
      alpha: new Float32Array(maxCount),
      seed(width, height) {
        for (let i = 0; i < this.maxCount; i += 1) {
          this.reset(i, width, height, true);
        }
      },
      setCount(nextCount, width, height) {
        const target = Math.max(0, Math.min(this.maxCount, nextCount));
        if (target > this.count) {
          for (let i = this.count; i < target; i += 1) {
            this.reset(i, width, height, true);
          }
        }
        this.count = target;
      },
      reset(index, width, height, randomY) {
        this.x[index] = Math.random() * Math.max(width, 1);
        this.y[index] = randomY ? Math.random() * Math.max(height, 1) : -Math.random() * 120;
        this.speed[index] = 18 + Math.random() * 18;
        this.radius[index] = 1.1 + Math.random() * 1.8;
        this.alpha[index] = 0.34 + Math.random() * 0.42;
      },
      update(delta, width, height, wind, speedScale, splashPool) {
        const step = delta / 16;
        for (let i = 0; i < this.count; i += 1) {
          this.y[i] += this.speed[i] * speedScale * step;
          this.x[i] += wind * 0.95 * step;

          if (this.y[i] > height + 18 || this.x[i] < -30 || this.x[i] > width + 30) {
            if (this.y[i] > height - 4) {
              splashPool.spawn(this.x[i], height - 2, wind * 0.1, -1.9, 3);
            }
            this.reset(i, width, height, false);
          }
        }
      },
      draw(ctx, layerOpacity) {
        ctx.save();
        for (let i = 0; i < this.count; i += 1) {
          const radius = this.radius[i];
          const x = this.x[i];
          const y = this.y[i];
          const alpha = this.alpha[i] * layerOpacity;

          ctx.beginPath();
          ctx.fillStyle = `rgba(228, 240, 255, ${alpha.toFixed(3)})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.72).toFixed(3)})`;
          ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
    };
    return pool;
  }

  function createSplashPool(maxCount) {
    const pool = {
      maxCount,
      count: 0,
      x: new Float32Array(maxCount),
      y: new Float32Array(maxCount),
      vx: new Float32Array(maxCount),
      vy: new Float32Array(maxCount),
      life: new Float32Array(maxCount),
      size: new Float32Array(maxCount),
      spawn(x, y, vx, vy, quantity) {
        const count = quantity || 2;
        for (let n = 0; n < count; n += 1) {
          if (this.count >= this.maxCount) {
            break;
          }
          const index = this.count++;
          this.x[index] = x;
          this.y[index] = y;
          this.vx[index] = vx + (Math.random() - 0.5) * 1.6;
          this.vy[index] = vy - Math.random() * 1.4;
          this.life[index] = 0.5 + Math.random() * 0.35;
          this.size[index] = 1.1 + Math.random() * 1.8;
        }
      },
      update(delta) {
        const step = delta / 16;
        let index = 0;
        while (index < this.count) {
          this.x[index] += this.vx[index] * step;
          this.y[index] += this.vy[index] * step;
          this.vy[index] += 0.14 * step;
          this.life[index] -= 0.035 * step;

          if (this.life[index] <= 0) {
            const last = this.count - 1;
            if (index < last) {
              this.x[index] = this.x[last];
              this.y[index] = this.y[last];
              this.vx[index] = this.vx[last];
              this.vy[index] = this.vy[last];
              this.life[index] = this.life[last];
              this.size[index] = this.size[last];
            }
            this.count -= 1;
            continue;
          }

          index += 1;
        }
      },
      draw(ctx, layerOpacity) {
        if (!this.count) {
          return;
        }
        ctx.save();
        ctx.fillStyle = `rgba(218, 232, 248, ${(0.35 * layerOpacity).toFixed(3)})`;
        for (let i = 0; i < this.count; i += 1) {
          ctx.globalAlpha = this.life[i];
          ctx.beginPath();
          ctx.arc(this.x[i], this.y[i], this.size[i], 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      },
      clear() {
        this.count = 0;
      },
    };
    return pool;
  }

  function clamp(value, min, max, fallback) {
    const number = Number.parseFloat(value);
    if (Number.isNaN(number)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, number));
  }

  global.IvoryWeatherRenderer = {
    create: createWeatherRenderer,
  };
})(window);
