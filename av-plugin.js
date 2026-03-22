const THEMES = [
  { bg: ['#e0c3fc', '#8ec5fc'], text: '#4a148c' },
  { bg: ['#fad0c4', '#ffd1ff'], text: '#880e4f' },
  { bg: ['#d299c2', '#fef9d7'], text: '#3e2723' },
  { bg: ['#a1c4fd', '#c2e9fb'], text: '#01579b' },
  { bg: ['#d4fc79', '#96e6a1'], text: '#1b5e20' }
];

const SCALE_FREQS = {
  extended_pentatonic: [130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0],
  original: [329.63, 369.99, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.0],
  major_pentatonic: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99],
  minor_pentatonic: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
  chromatic: [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.0, 415.3, 440.0, 466.16, 493.88],
  whole_tone: [261.63, 293.66, 329.63, 369.99, 415.3, 466.16, 523.25, 587.33, 659.25],
  blues: [261.63, 311.13, 349.23, 369.99, 392.0, 466.16, 523.25, 622.25]
};

const DEFAULT_STATE = {
  themeIndex: 0,
  currentScale: 'extended_pentatonic',
  spritePack: 'flowers',
  decaySetting: 2,
  trailSetting: 5,
  growSetting: 50,
  customWords: [],
  overlayTitle: 'A Time to Relax',
  overlaySubtitle: 'Tap to bloom · drag to strum',
  recentEvents: []
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function normalizeState(input = {}) {
  const next = { ...DEFAULT_STATE, ...input };
  next.themeIndex = clamp(Number(next.themeIndex) || 0, 0, THEMES.length - 1);
  next.decaySetting = clamp(Number(next.decaySetting) || DEFAULT_STATE.decaySetting, 0, 5);
  next.trailSetting = clamp(Number(next.trailSetting) || DEFAULT_STATE.trailSetting, 1, 10);
  next.growSetting = clamp(Number(next.growSetting) || DEFAULT_STATE.growSetting, 1, 100);
  next.currentScale = SCALE_FREQS[next.currentScale] ? next.currentScale : DEFAULT_STATE.currentScale;
  next.spritePack = ['flowers', 'fireworks', 'shapes'].includes(next.spritePack) ? next.spritePack : DEFAULT_STATE.spritePack;
  next.customWords = Array.isArray(next.customWords) ? next.customWords.filter(Boolean).slice(0, 24) : [];
  next.recentEvents = Array.isArray(next.recentEvents) ? next.recentEvents.slice(-24) : [];
  return next;
}

function settingsFromState(state) {
  const decayMap = [0, 0.002, 0.005, 0.01, 0.02, 0.05];
  const trailDecays = [0.1, 0.08, 0.06, 0.04, 0.02, 0.01, 0.008, 0.005, 0.002, 0.0005];
  const trailSpeeds = [3.0, 2.5, 2.0, 1.5, 1.0, 0.8, 0.6, 0.4, 0.2, 0.1];
  return {
    decayValue: decayMap[state.decaySetting],
    trailDecay: trailDecays[state.trailSetting - 1],
    trailSpeed: trailSpeeds[state.trailSetting - 1],
    speedMultiplier: 0.2 + (state.growSetting / 100) * 1.8,
    frequencies: SCALE_FREQS[state.currentScale]
  };
}

function createAudioRuntime() {
  const runtime = {
    ctx: null,
    gain: null,
    buffers: {},
    scaleKey: null,
    ensure(scaleKey) {
      if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.18;
        this.gain.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (this.scaleKey !== scaleKey) {
        this.scaleKey = scaleKey;
        this.buffers = {};
        const freqs = SCALE_FREQS[scaleKey] || SCALE_FREQS.extended_pentatonic;
        freqs.forEach((freq) => {
          const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.25, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          const delayLength = Math.max(8, Math.floor(this.ctx.sampleRate / freq));
          const noise = new Float32Array(delayLength).map(() => Math.random() * 2 - 1);
          let idx = 0;
          let last = 0;
          for (let i = 0; i < buffer.length; i += 1) {
            const sample = (noise[idx] + last) * 0.5 * 0.992;
            last = noise[idx];
            noise[idx] = sample;
            data[i] = sample;
            idx = (idx + 1) % delayLength;
          }
          this.buffers[freq] = buffer;
        });
      }
    },
    pluck(scaleKey, idx, volume = 0.2) {
      this.ensure(scaleKey);
      if (!this.ctx) return;
      const freqs = SCALE_FREQS[scaleKey] || SCALE_FREQS.extended_pentatonic;
      const freq = freqs[clamp(idx, 0, freqs.length - 1)];
      const buffer = this.buffers[freq];
      if (!buffer) return;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(this.gain);
      source.start();
    }
  };
  return runtime;
}

function bloomWord(words) {
  if (!words.length) return ['Peace', 'Gentle', 'Joy', 'Bloom'][Math.floor(Math.random() * 4)];
  return words[Math.floor(Math.random() * words.length)];
}

export function createAVPlugin() {
  let container = null;
  let host = null;
  let canvas = null;
  let overlay = null;
  let ctx = null;
  let resizeObserver = null;
  let rafId = 0;
  let mode = 'live';
  let currentState = normalizeState();
  let liveSettings = settingsFromState(currentState);
  let entities = [];
  let words = [];
  let trails = [];
  let pointerStart = null;
  let lastTapAt = 0;
  let lastTapPoint = null;
  let lastDragAt = 0;
  const audio = createAudioRuntime();
  let emitEvent = () => {};
  let emitState = () => {};

  function serializeState() {
    return {
      ...currentState,
      recentEvents: currentState.recentEvents.slice(-24)
    };
  }

  function notifyState() {
    emitState(serializeState());
  }

  function resize() {
    if (!container || !canvas || !ctx) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function relativePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1)
    };
  }

  function emitTransient(event) {
    currentState.recentEvents = [...currentState.recentEvents, event].slice(-24);
    emitEvent(event);
    notifyState();
  }

  function applyScaleSound(point, volume) {
    if (mode !== 'live') return;
    const freqs = liveSettings.frequencies;
    const idx = Math.floor((1 - point.y) * (freqs.length - 1));
    audio.pluck(currentState.currentScale, idx, volume);
  }

  function createBloom(point, options = {}) {
    const hue = random(0, 360);
    entities.push({
      type: options.double ? 'heart-bloom' : (currentState.spritePack === 'fireworks' ? 'firework' : currentState.spritePack === 'shapes' ? 'shape' : 'bloom'),
      x: point.x,
      y: point.y,
      size: 0,
      maxSize: random(28, 72),
      alpha: 1,
      hue,
      rotation: random(0, Math.PI * 2)
    });
    words.push({
      x: point.x,
      y: Math.max(0.08, point.y - 0.05),
      text: options.word || bloomWord(currentState.customWords),
      alpha: 0,
      fadeIn: true
    });
    if (options.double) {
      for (let i = 0; i < 7; i += 1) {
        trails.push({
          type: 'heart-cloud',
          x: point.x + random(-0.06, 0.06),
          y: point.y + random(-0.06, 0.06),
          size: random(10, 22),
          alpha: 1,
          hue: random(320, 360)
        });
      }
    }
    applyScaleSound(point, options.double ? 0.26 : 0.18);
  }

  function createTrail(point, trailType = '♥') {
    trails.push({
      type: trailType,
      x: point.x,
      y: point.y,
      size: random(10, 18),
      alpha: 1,
      hue: random(0, 360)
    });
    applyScaleSound(point, 0.08);
  }

  function applyEvent(event, options = {}) {
    const record = options.record !== false;
    if (!event || !event.type) return;
    if (event.type === 'tap') {
      createBloom({ x: clamp(event.x ?? 0.5, 0, 1), y: clamp(event.y ?? 0.5, 0, 1) }, { double: Boolean(event.double), word: event.word });
      if (record) currentState.recentEvents = [...currentState.recentEvents, event].slice(-24);
    }
    if (event.type === 'drag') {
      createTrail({ x: clamp(event.x ?? 0.5, 0, 1), y: clamp(event.y ?? 0.5, 0, 1) }, event.trail || '♥');
      if (record) currentState.recentEvents = [...currentState.recentEvents, event].slice(-24);
    }
  }

  function clearVisuals() {
    entities = [];
    words = [];
    trails = [];
  }

  function updateState(nextState) {
    currentState = normalizeState({ ...currentState, ...nextState });
    liveSettings = settingsFromState(currentState);
    if (overlay) {
      overlay.querySelector('[data-role="title"]').textContent = currentState.overlayTitle;
      overlay.querySelector('[data-role="subtitle"]').textContent = currentState.overlaySubtitle;
      overlay.classList.toggle('hidden', mode === 'inert');
    }
    clearVisuals();
    currentState.recentEvents.forEach((event) => applyEvent(event, { record: false }));
  }

  function setMode(nextMode) {
    mode = nextMode === 'inert' ? 'inert' : 'live';
    if (canvas) canvas.style.pointerEvents = mode === 'live' ? 'auto' : 'none';
    if (overlay) overlay.classList.toggle('hidden', mode === 'inert');
  }

  function drawBackground(width, height) {
    const theme = THEMES[currentState.themeIndex];
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.bg[0]);
    gradient.addColorStop(1, theme.bg[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBloom(entity, width, height) {
    const x = entity.x * width;
    const y = entity.y * height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(entity.rotation);
    ctx.globalAlpha = Math.max(0, entity.alpha);
    entity.rotation += 0.003;
    entity.size = Math.min(entity.maxSize, entity.size + 0.5 * liveSettings.speedMultiplier);
    if (entity.size >= entity.maxSize) entity.alpha -= liveSettings.decayValue * liveSettings.speedMultiplier;

    if (entity.type === 'firework') {
      ctx.strokeStyle = `hsla(${entity.hue}, 80%, 75%, ${entity.alpha})`;
      for (let i = 0; i < 10; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const angle = (i / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(angle) * entity.size, Math.sin(angle) * entity.size);
        ctx.stroke();
      }
    } else if (entity.type === 'shape') {
      ctx.fillStyle = `hsla(${entity.hue}, 70%, 82%, ${entity.alpha})`;
      ctx.beginPath();
      ctx.roundRect(-entity.size / 2, -entity.size / 2, entity.size, entity.size, 10);
      ctx.fill();
    } else if (entity.type === 'heart-bloom') {
      ctx.fillStyle = `hsla(${entity.hue}, 85%, 72%, ${entity.alpha})`;
      const s = entity.size / 24;
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -10, -20, 0, 0, 20);
      ctx.bezierCurveTo(20, 0, 10, -10, 0, 0);
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = `hsla(${entity.hue}, 70%, 80%, ${entity.alpha * (0.7 - i * 0.15)})`;
        ctx.beginPath();
        const petals = 6 + i;
        for (let j = 0; j < petals; j += 1) {
          const angle = (j / petals) * Math.PI * 2;
          const radius = entity.size - i * 5;
          ctx.ellipse(Math.cos(angle) * radius * 0.4, Math.sin(angle) * radius * 0.4, radius * 0.45, radius * 0.18, angle, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawWord(word, width, height) {
    word.y -= 0.0008 * liveSettings.speedMultiplier;
    if (word.fadeIn) {
      word.alpha += 0.02 * liveSettings.speedMultiplier;
      if (word.alpha >= 1) word.fadeIn = false;
    } else {
      word.alpha -= liveSettings.decayValue * liveSettings.speedMultiplier;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, word.alpha);
    ctx.fillStyle = THEMES[currentState.themeIndex].text;
    ctx.font = '20px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(word.text, word.x * width, word.y * height);
    ctx.restore();
  }

  function drawTrail(trail, width, height) {
    trail.y -= (liveSettings.trailSpeed / Math.max(160, height));
    trail.alpha -= liveSettings.trailDecay;
    ctx.save();
    ctx.globalAlpha = Math.max(0, trail.alpha);
    ctx.fillStyle = `hsla(${trail.hue}, 100%, 68%, ${trail.alpha})`;
    ctx.font = `${trail.size}px serif`;
    const x = trail.x * width;
    const y = trail.y * height;
    if (trail.type === 'heart-cloud') {
      ctx.fillText('♥', x, y);
    } else if (trail.type === 'Comet') {
      ctx.beginPath();
      ctx.arc(x, y, trail.size / 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (trail.type === '☁️' || trail.type === '⭐' || trail.type === '♥') {
      ctx.fillText(trail.type, x, y);
    } else {
      ctx.fillText('•', x, y);
    }
    ctx.restore();
  }

  function loop() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    drawBackground(rect.width, rect.height);

    entities.forEach((entity) => drawBloom(entity, rect.width, rect.height));
    words.forEach((word) => drawWord(word, rect.width, rect.height));
    trails.forEach((trail) => drawTrail(trail, rect.width, rect.height));

    entities = entities.filter((entity) => entity.alpha > 0);
    words = words.filter((word) => word.alpha > 0);
    trails = trails.filter((trail) => trail.alpha > 0);

    rafId = requestAnimationFrame(loop);
  }

  function handlePointerDown(event) {
    if (mode !== 'live') return;
    const point = relativePoint(event.clientX, event.clientY);
    pointerStart = { ...point, clientX: event.clientX, clientY: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    overlay?.classList.add('hidden');
  }

  function handlePointerMove(event) {
    if (mode !== 'live' || !pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.clientX, event.clientY - pointerStart.clientY);
    if (distance < 12) return;
    const now = Date.now();
    if (now - lastDragAt < 45) return;
    lastDragAt = now;
    const point = relativePoint(event.clientX, event.clientY);
    const trailOptions = ['♥', 'Comet', '☁️', '⭐'];
    const trail = trailOptions[Math.floor(Math.random() * trailOptions.length)];
    createTrail(point, trail);
    emitTransient({ type: 'drag', x: point.x, y: point.y, trail, ts: now });
  }

  function handlePointerUp(event) {
    if (mode !== 'live' || !pointerStart) return;
    const point = relativePoint(event.clientX, event.clientY);
    const now = Date.now();
    const isDouble = Boolean(lastTapPoint) && now - lastTapAt < 240 && Math.hypot(point.x - lastTapPoint.x, point.y - lastTapPoint.y) < 0.08;
    createBloom(point, { double: isDouble });
    emitTransient({ type: 'tap', x: point.x, y: point.y, double: isDouble, word: bloomWord(currentState.customWords), ts: now });
    lastTapAt = now;
    lastTapPoint = point;
    pointerStart = null;
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function mount(nextContainer, options = {}) {
    destroy();
    container = nextContainer;
    if (!container) throw new Error('mount(container) requires a container element');
    emitEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
    emitState = typeof options.onStateChange === 'function' ? options.onStateChange : () => {};
    mode = options.mode === 'inert' ? 'inert' : 'live';
    currentState = normalizeState({ ...DEFAULT_STATE, ...(options.initialState || {}) });
    liveSettings = settingsFromState(currentState);

    host = document.createElement('div');
    host.className = 'relative h-full w-full overflow-hidden rounded-[inherit] bg-black';
    host.innerHTML = `
      <canvas class="absolute inset-0 h-full w-full"></canvas>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white/90 drop-shadow-md transition-opacity duration-300" data-role="overlay">
        <h2 class="text-2xl font-light tracking-[0.3em] uppercase" data-role="title"></h2>
        <p class="mt-3 max-w-md text-sm text-white/80" data-role="subtitle"></p>
      </div>
    `;
    container.replaceChildren(host);
    canvas = host.querySelector('canvas');
    overlay = host.querySelector('[data-role="overlay"]');
    ctx = canvas.getContext('2d');
    overlay.querySelector('[data-role="title"]').textContent = currentState.overlayTitle;
    overlay.querySelector('[data-role="subtitle"]').textContent = currentState.overlaySubtitle;
    resize();
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    setMode(mode);
    clearVisuals();
    currentState.recentEvents.forEach((event) => applyEvent(event, { record: false }));
    notifyState();
    rafId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (canvas) {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    }
    if (container) container.replaceChildren();
    container = null;
    host = null;
    canvas = null;
    overlay = null;
    ctx = null;
    pointerStart = null;
    clearVisuals();
  }

  return {
    mount,
    updateState,
    applyEvent,
    serializeState,
    setMode,
    destroy
  };
}

export default createAVPlugin;
