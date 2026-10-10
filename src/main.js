// Tor Maar: game state manager. Connects engine, renderer, input, sound,
// storage and UI. There is exactly one requestAnimationFrame loop, and it only
// exists while state === 'playing'.

import './styles.css';
import { Engine, MODES, COLS, ROWS } from './engine.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { SoundManager } from './sound.js';
import { Store } from './storage.js';
import { createUI } from './ui.js';

function boot() {
  const ui = createUI();
  const store = new Store();
  const sound = new SoundManager(store.data.sound);
  const renderer = new Renderer(ui.canvas, COLS, ROWS);
  const engine = new Engine(store.data.mode);

  // State: 'menu' | 'ready' | 'playing' | 'paused' | 'over' | 'info'
  let state = 'menu';
  let mode = store.data.mode;
  let best = store.best(mode);
  let newRecord = false;
  let rafId = 0;
  let last = null;
  let acc = 0;

  const vibrationSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const vibrate = (pattern) => {
    if (!vibrationSupported || !store.data.vibration) return;
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  };

  // ---- view helpers -------------------------------------------------------
  function updateHud() {
    ui.setHud({ score: engine.score, best, label: MODES[mode].label, practice: mode === 'practice' });
  }

  function layout() {
    const { w, h } = ui.availableBoardSize();
    if (w < 8 || h < 8) return;
    const size = renderer.fit(w, h);
    ui.setBoardSize(size.width, size.height);
    renderer.render(engine);
  }

  function refreshSelection() {
    best = store.best(mode);
    engine.reset(mode); // preview state, also keeps HUD consistent
    ui.setModeChips(mode);
    ui.setBoardStyle(MODES[mode]);
    ui.setReady(MODES[mode]);
    ui.setMenuBest(best);
    updateHud();
    renderer.render(engine);
  }

  // ---- game loop ----------------------------------------------------------
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    last = null;
    acc = 0;
  }

  function startLoop() {
    stopLoop(); // guarantees a single loop, even on rapid restart
    rafId = requestAnimationFrame(frame);
  }

  function frame(ts) {
    if (state !== 'playing') {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(frame);
    if (last === null) {
      last = ts;
      return;
    }
    acc += Math.min(Math.max(ts - last, 0), 250); // clamp long stalls
    last = ts;
    let interval = engine.interval();
    let stepped = false;
    while (acc >= interval && state === 'playing') {
      acc -= interval;
      handleStep(engine.step());
      interval = engine.interval();
      stepped = true;
    }
    if (stepped) renderer.render(engine);
  }

  function handleStep(result) {
    switch (result.event) {
      case 'eat':
        sound.eat();
        vibrate(15);
        if (engine.score > best) {
          best = engine.score;
          newRecord = true;
          store.setBest(mode, best); // persist immediately
        }
        updateHud();
        break;
      case 'wall':
      case 'self':
        gameOver(false);
        break;
      case 'won':
        if (engine.score > best) {
          best = engine.score;
          newRecord = true;
          store.setBest(mode, best);
        }
        updateHud();
        gameOver(true);
        break;
      default:
        break;
    }
  }

  // ---- state transitions --------------------------------------------------
  function startGame() {
    stopLoop();
    engine.reset(mode);
    newRecord = false;
    best = store.best(mode);
    ui.setBoardStyle(MODES[mode]);
    updateHud();
    renderer.render(engine);
    state = 'playing';
    ui.show(null);
    ui.flashMaarRalo(); // once per new game, never per step
    startLoop();
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    stopLoop();
    ui.show('pause');
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    ui.show(null);
    startLoop(); // accumulator reset, so speed is unchanged after resume
  }

  function gameOver(won) {
    stopLoop();
    state = 'over';
    renderer.render(engine);
    sound.gameOver();
    vibrate([40, 40, 80]);
    ui.setGameOver({ score: engine.score, best, record: newRecord, won });
    ui.hideMaarRalo();
    ui.show('over');
    ui.setMenuBest(best);
  }

  function toMenu() {
    stopLoop();
    state = 'menu';
    ui.hideMaarRalo();
    refreshSelection();
    ui.show('menu');
  }

  function toReady() {
    state = 'ready';
    refreshSelection();
    ui.show('ready');
  }

  function toggleSound() {
    store.setSound(!store.data.sound);
    sound.setEnabled(store.data.sound);
    sound.unlock();
    ui.setSoundLabel(store.data.sound);
  }

  function toggleVibration() {
    store.setVibration(!store.data.vibration);
    ui.setVibrationLabel(store.data.vibration, vibrationSupported);
    if (store.data.vibration) vibrate(20);
  }

  // ---- actions (single delegated click listener) ---------------------------
  const actions = {
    play: toReady,
    start: startGame,
    restart: startGame,
    resume,
    pause,
    menu: toMenu,
    instructions: () => { state = 'info'; ui.show('instructions'); },
    settings: () => { state = 'info'; ui.show('settings'); },
    'toggle-sound': toggleSound,
    'toggle-vibration': toggleVibration,
    mode: (el) => {
      mode = el.dataset.mode;
      store.setMode(mode);
      refreshSelection();
    },
  };

  ui.el.app.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const fn = actions[btn.dataset.action];
    if (!fn) return;
    sound.click();
    fn(btn);
    btn.blur(); // keep Space/Enter free for game shortcuts
  });

  // ---- input ---------------------------------------------------------------
  const input = new InputController(
    {
      onDirection: (dir) => {
        if (state === 'playing') engine.turn(dir);
      },
      onPauseToggle: () => {
        if (state === 'playing') pause();
        else if (state === 'paused') resume();
      },
      onEnter: () => {
        if (state === 'menu') toReady();
        else if (state === 'ready' || state === 'over') startGame();
        else if (state === 'paused') resume();
      },
      onGesture: () => sound.unlock(),
      isInGame: () => state === 'playing' || state === 'paused',
    },
    { swipeTarget: ui.el.lcd, dpad: ui.el.dpad }
  );
  input.attach();

  // ---- lifecycle -----------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 150));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layout).observe(ui.el.boardArea);

  // ---- initial state -------------------------------------------------------
  ui.setSoundLabel(store.data.sound);
  ui.setVibrationLabel(store.data.vibration, vibrationSupported);
  refreshSelection();
  layout();
  ui.show('menu');

  // Offline support in browsers (Capacitor serves files locally, no SW needed).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

boot();
