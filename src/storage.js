// Local storage manager. Never throws: falls back to memory if storage is
// unavailable (private mode, blocked, quota) or contains corrupted data.

const KEY = 'tormaar.v1';
const MODE_IDS = ['classic', 'wrap', 'practice'];

function defaults() {
  return { best: { classic: 0, wrap: 0, practice: 0 }, sound: true, vibration: true, mode: 'classic' };
}

function sanitize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  if (raw.best && typeof raw.best === 'object') {
    for (const id of MODE_IDS) {
      const v = Number(raw.best[id]);
      if (Number.isFinite(v) && v > 0) d.best[id] = Math.floor(v);
    }
  }
  if (typeof raw.sound === 'boolean') d.sound = raw.sound;
  if (typeof raw.vibration === 'boolean') d.vibration = raw.vibration;
  if (MODE_IDS.includes(raw.mode)) d.mode = raw.mode;
  return d;
}

function safeLocalStorage() {
  try {
    const s = window.localStorage;
    s.setItem('__tormaar_probe', '1');
    s.removeItem('__tormaar_probe');
    return s;
  } catch (e) {
    return null;
  }
}

export class Store {
  constructor(storage) {
    this.storage = storage === undefined ? safeLocalStorage() : storage;
    this.data = this._load();
  }

  _load() {
    try {
      const text = this.storage ? this.storage.getItem(KEY) : null;
      return sanitize(text ? JSON.parse(text) : null);
    } catch (e) {
      return defaults(); // corrupted JSON etc.
    }
  }

  _save() {
    try {
      if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* ignore: keep playing with in-memory values */
    }
  }

  best(modeId) {
    return this.data.best[modeId] || 0;
  }

  setBest(modeId, score) {
    if (score > this.best(modeId)) {
      this.data.best[modeId] = score;
      this._save();
    }
  }

  setSound(on) {
    this.data.sound = !!on;
    this._save();
  }

  setVibration(on) {
    this.data.vibration = !!on;
    this._save();
  }

  setMode(id) {
    if (MODE_IDS.includes(id)) {
      this.data.mode = id;
      this._save();
    }
  }
}
