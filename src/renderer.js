// Board renderer: draws the monochrome LCD-style board on a canvas.
// Works in device pixels with an integer cell size so cells never blur or drift.

const PALETTE = {
  bg: '#b7cc8c',
  ghost: 'rgba(27, 42, 19, 0.07)', // faint "unlit LCD pixel"
  ink: '#1b2a13',
};

export class Renderer {
  constructor(canvas, cols, rows) {
    this.canvas = canvas;
    this.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    this.cols = cols;
    this.rows = rows;
    this.cell = 8;
    this.canvas.width = cols * this.cell;
    this.canvas.height = rows * this.cell;
  }

  /** Fit the board into the available CSS box. Returns the CSS size used. */
  fit(availW, availH, dpr = window.devicePixelRatio || 1) {
    dpr = Math.max(1, dpr);
    const cell = Math.max(4, Math.floor(Math.min((availW * dpr) / this.cols, (availH * dpr) / this.rows)));
    this.cell = cell;
    this.canvas.width = cell * this.cols;
    this.canvas.height = cell * this.rows;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    return { width, height };
  }

  render(engine) {
    const ctx = this.ctx;
    if (!ctx) return;
    const c = this.cell;
    const g = Math.max(1, Math.round(c * 0.08)); // gap between pixels

    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Unlit LCD pixels.
    ctx.fillStyle = PALETTE.ghost;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        ctx.fillRect(x * c + g, y * c + g, c - 2 * g, c - 2 * g);
      }
    }

    ctx.fillStyle = PALETTE.ink;

    // Food: a small plus-shaped pixel cluster.
    if (engine.food) {
      const a = Math.round(c / 3);
      const fx = engine.food.x * c;
      const fy = engine.food.y * c;
      ctx.fillRect(fx + a, fy + g, c - 2 * a, c - 2 * g);
      ctx.fillRect(fx + g, fy + a, c - 2 * g, c - 2 * a);
    }

    // Snake body.
    engine.snake.forEach((s) => {
      ctx.fillRect(s.x * c + g, s.y * c + g, c - 2 * g, c - 2 * g);
    });

    // Head: carve a small "eye" so direction is readable.
    const head = engine.snake[0];
    if (head) {
      const e = Math.max(1, Math.round(c / 5));
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(head.x * c + Math.round((c - e) / 2), head.y * c + Math.round((c - e) / 2), e, e);
    }
  }
}
