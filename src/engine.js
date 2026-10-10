// Tor Maar game engine: pure game logic, no DOM, no rendering, no timers.
// Everything here is deterministic given an rng, so it is unit-testable.

export const COLS = 16;
export const ROWS = 18;

// Scoring and difficulty (tweak here).
export const POINTS_PER_FOOD = 1;
export const START_INTERVAL = 190; // ms per step at score 0
export const MIN_INTERVAL = 70; // fastest allowed step
export const SPEED_STEP = 4; // ms faster per point
export const PRACTICE_INTERVAL = 160; // practice mode keeps a steady pace

export const MODES = {
  classic: { id: 'classic', label: 'Classic', wrap: false, speedUp: true, desc: 'Walls are deadly. Speed rises as you grow.' },
  wrap: { id: 'wrap', label: 'Wrap', wrap: true, speedUp: true, desc: 'Cross an edge and return from the other side.' },
  practice: { id: 'practice', label: 'Practice', wrap: true, speedUp: false, desc: 'No walls, steady speed. Warm up here.' },
};

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function intervalFor(score, modeId) {
  const mode = MODES[modeId] || MODES.classic;
  if (!mode.speedUp) return PRACTICE_INTERVAL;
  return Math.max(MIN_INTERVAL, START_INTERVAL - score * SPEED_STEP);
}

export class Engine {
  constructor(modeId = 'classic', rng = Math.random, cols = COLS, rows = ROWS) {
    this.rng = rng;
    this.cols = cols;
    this.rows = rows;
    this.reset(modeId);
  }

  /** Reset every piece of game state for a fresh game. */
  reset(modeId = this.mode ? this.mode.id : 'classic') {
    this.mode = MODES[modeId] || MODES.classic;
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    // Head first; starts as a 3-segment snake heading right.
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = DIRECTIONS.right;
    this.queue = []; // buffered turns (max 2) so quick double-taps are not lost
    this.score = 0;
    this.status = 'running'; // 'running' | 'over' | 'won'
    this.food = null;
    this.spawnFood();
  }

  interval() {
    return intervalFor(this.score, this.mode.id);
  }

  /** Queue a turn. Returns true if accepted. Reversals and no-ops are rejected. */
  turn(name) {
    const d = DIRECTIONS[name];
    if (!d || this.status !== 'running') return false;
    if (this.queue.length >= 2) return false;
    const ref = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (d.x === -ref.x && d.y === -ref.y) return false; // would reverse into body
    if (d.x === ref.x && d.y === ref.y) return false; // already heading that way
    this.queue.push(d);
    return true;
  }

  /** Place food on a random free cell. Returns false if the board is full. */
  spawnFood() {
    const taken = new Set(this.snake.map((s) => s.y * this.cols + s.x));
    const free = [];
    for (let i = 0; i < this.cols * this.rows; i++) if (!taken.has(i)) free.push(i);
    if (free.length === 0) {
      this.food = null;
      return false;
    }
    const pick = free[Math.min(free.length - 1, Math.floor(this.rng() * free.length))];
    this.food = { x: pick % this.cols, y: Math.floor(pick / this.cols) };
    return true;
  }

  /** Advance one grid step. Returns {event}: move | eat | wall | self | won | none. */
  step() {
    if (this.status !== 'running') return { event: 'none' };
    if (this.queue.length) this.dir = this.queue.shift();

    const head = this.snake[0];
    let nx = head.x + this.dir.x;
    let ny = head.y + this.dir.y;

    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      if (!this.mode.wrap) {
        this.status = 'over';
        return { event: 'wall' };
      }
      nx = (nx + this.cols) % this.cols;
      ny = (ny + this.rows) % this.rows;
    }

    const eating = !!this.food && nx === this.food.x && ny === this.food.y;
    // The tail cell is vacated this step unless we grow, so it is safe to enter.
    const solid = eating ? this.snake : this.snake.slice(0, -1);
    if (solid.some((s) => s.x === nx && s.y === ny)) {
      this.status = 'over';
      return { event: 'self' };
    }

    this.snake.unshift({ x: nx, y: ny });
    if (eating) {
      this.score += POINTS_PER_FOOD;
      this.food = null; // consumed exactly once
      if (!this.spawnFood()) {
        this.status = 'won'; // board completely full
        return { event: 'won' };
      }
      return { event: 'eat' };
    }
    this.snake.pop();
    return { event: 'move' };
  }
}
