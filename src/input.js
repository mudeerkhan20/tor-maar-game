// Input controller: keyboard, on-screen D-pad and swipe.
// All listeners are registered once through one AbortController, so attach()
// can never create duplicates and detach() removes every listener.

const KEY_MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
};
const SWIPE_THRESHOLD = 20; // px of movement before a swipe counts

export class InputController {
  /**
   * handlers: { onDirection(name), onPauseToggle(), onEnter(), onGesture(),
   *             isInGame() }
   * elements: { swipeTarget, dpad }
   */
  constructor(handlers, elements) {
    this.h = handlers;
    this.el = elements;
    this.ac = null;
  }

  attach() {
    if (this.ac) return;
    const ac = (this.ac = new AbortController());
    const { signal } = ac;
    const h = this.h;

    // Any first touch/key unlocks audio (browsers need a user gesture).
    window.addEventListener('pointerdown', () => h.onGesture(), { signal, passive: true });
    window.addEventListener('keydown', () => h.onGesture(), { signal, passive: true });

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const onButton = e.target && e.target.tagName === 'BUTTON';
        const dir = KEY_MAP[e.key];
        if (dir) {
          e.preventDefault();
          h.onDirection(dir);
          return;
        }
        if (e.key === ' ' || e.code === 'Space') {
          if (!onButton || h.isInGame()) {
            e.preventDefault();
            if (!e.repeat) h.onPauseToggle();
          }
          return;
        }
        if (e.key === 'Enter' && !onButton) {
          e.preventDefault();
          if (!e.repeat) h.onEnter();
        }
      },
      { signal }
    );
    // Stop Space from "clicking" a focused button on key release.
    window.addEventListener(
      'keyup',
      (e) => {
        if ((e.key === ' ' || e.code === 'Space') && h.isInGame()) e.preventDefault();
      },
      { signal }
    );

    // D-pad: act on pointerdown for instant response.
    this.el.dpad.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener(
        'pointerdown',
        (e) => {
          e.preventDefault(); // no focus, no ghost click, no text selection
          h.onDirection(btn.dataset.dir);
        },
        { signal }
      );
      // Keyboard-activated click (detail === 0) for accessibility.
      btn.addEventListener('click', (e) => {
        if (e.detail === 0) h.onDirection(btn.dataset.dir);
      }, { signal });
    });

    // Swipe on the board. Chained swipes work: the origin resets after each turn.
    const target = this.el.swipeTarget;
    let pid = null;
    let sx = 0;
    let sy = 0;
    target.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target.closest && e.target.closest('button')) return;
        pid = e.pointerId;
        sx = e.clientX;
        sy = e.clientY;
        try { target.setPointerCapture(pid); } catch (err) { /* ignore */ }
      },
      { signal }
    );
    target.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
        if (h.isInGame()) {
          h.onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }
        sx = e.clientX;
        sy = e.clientY;
      },
      { signal }
    );
    const end = (e) => {
      if (e.pointerId === pid) pid = null;
    };
    target.addEventListener('pointerup', end, { signal });
    target.addEventListener('pointercancel', end, { signal });

    // No context menu / selection / double-tap zoom while playing.
    document.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    document.addEventListener('selectstart', (e) => e.preventDefault(), { signal });
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { signal });
  }

  detach() {
    if (this.ac) this.ac.abort();
    this.ac = null;
  }
}
