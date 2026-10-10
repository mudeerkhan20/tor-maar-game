// Menu and interface layer: owns every DOM lookup and visual state change.
// It contains no game rules.

const SCREENS = ['menu', 'ready', 'pause', 'over', 'instructions', 'settings'];
const pad3 = (n) => String(n).padStart(3, '0');

export function createUI() {
  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('app'),
    lcd: $('lcd'),
    boardArea: $('boardArea'),
    boardWrap: $('boardWrap'),
    canvas: $('board'),
    dpad: $('dpad'),
    maarRalo: $('maarRalo'),
    hudScore: $('hudScore'),
    hudBest: $('hudBest'),
    hudMode: $('hudMode'),
  };

  return {
    el: els,
    canvas: els.canvas,

    /** Show one overlay screen by name, or null/'play' to reveal the board. */
    show(name) {
      SCREENS.forEach((s) => $('screen-' + s).classList.toggle('active', s === name));
      document.body.dataset.screen = name || 'play';
    },

    setHud({ score, best, label, practice }) {
      els.hudScore.textContent = pad3(score);
      els.hudBest.textContent = pad3(best);
      els.hudMode.textContent = practice ? 'PRACTICE MODE' : label.toUpperCase();
      els.hudMode.classList.toggle('practice', !!practice);
    },

    setModeChips(modeId) {
      document.querySelectorAll('.chip[data-mode]').forEach((c) => {
        const on = c.dataset.mode === modeId;
        c.classList.toggle('selected', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    },

    setBoardStyle(mode) {
      els.boardWrap.classList.toggle('wraps', !!mode.wrap);
      els.boardWrap.classList.toggle('practice', mode.id === 'practice');
    },

    setReady(mode) {
      $('readyMode').textContent = mode.id === 'practice' ? 'PRACTICE MODE' : mode.label.toUpperCase() + ' MODE';
      $('readyMode').classList.toggle('practice', mode.id === 'practice');
      $('readyDesc').textContent = mode.desc;
    },

    setMenuBest(n) {
      $('menuBest').textContent = pad3(n);
    },

    setSoundLabel(on) {
      const text = 'Sound: ' + (on ? 'ON' : 'OFF');
      $('menuSound').textContent = text;
      $('setSound').textContent = text;
    },

    setVibrationLabel(on, supported) {
      const b = $('setVibration');
      b.textContent = supported ? 'Vibration: ' + (on ? 'ON' : 'OFF') : 'Vibration: N/A';
      b.disabled = !supported;
    },

    setGameOver({ score, best, record, won }) {
      $('overTitle').textContent = won ? 'BOARD FULL! YOU WIN' : 'GAME OVER';
      $('overScore').textContent = pad3(score);
      $('overBest').textContent = pad3(best);
      $('overRecord').hidden = !record;
    },

    /** Play the "Maar Ralo" intro. Pure CSS transform/opacity animation, so
     *  it runs on the compositor and never touches the game loop. */
    flashMaarRalo() {
      const m = els.maarRalo;
      m.classList.remove('show');
      void m.offsetWidth; // restart the CSS animation
      m.classList.add('show');
    },

    hideMaarRalo() {
      els.maarRalo.classList.remove('show');
    },

    availableBoardSize() {
      const a = els.boardArea;
      return { w: Math.max(0, a.clientWidth - 20), h: Math.max(0, a.clientHeight - 20) };
    },

    setBoardSize(width, height) {
      els.boardWrap.style.width = width + 'px';
      els.boardWrap.style.height = height + 'px';
      els.boardWrap.style.setProperty('--board-w', width + 'px');
    },
  };
}
