// Retro sound effects via Web Audio. The AudioContext is created lazily on the
// first user gesture (unlock), so nothing plays before the player interacts.

export class SoundManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  /** Call from a user gesture (pointerdown/keydown). Safe to call repeatedly. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      this.ctx = null;
    }
  }

  _tone(freq, duration, { type = 'square', volume = 0.05, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch (e) {
      /* audio is optional */
    }
  }

  eat() {
    this._tone(880, 0.06);
    this._tone(1320, 0.08, { delay: 0.06 });
  }

  gameOver() {
    this._tone(330, 0.16, { type: 'triangle', volume: 0.07 });
    this._tone(247, 0.16, { type: 'triangle', volume: 0.07, delay: 0.16 });
    this._tone(165, 0.32, { type: 'triangle', volume: 0.07, delay: 0.32 });
  }

  click() {
    this._tone(520, 0.03, { volume: 0.03 });
  }
}
