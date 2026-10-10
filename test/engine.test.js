import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, intervalFor, MIN_INTERVAL, START_INTERVAL, COLS, ROWS } from '../src/engine.js';
import { Store } from '../src/storage.js';

const fixedRng = (v = 0) => () => v;

test('snake starts with 3 segments near the center, moving right', () => {
  const e = new Engine('classic', fixedRng());
  assert.equal(e.snake.length, 3);
  assert.deepEqual(e.snake[0], { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) });
  const x0 = e.snake[0].x;
  e.food = { x: 0, y: 0 };
  assert.equal(e.step().event, 'move');
  assert.equal(e.snake[0].x, x0 + 1);
  assert.equal(e.snake.length, 3);
});

test('continuous movement keeps grid alignment', () => {
  const e = new Engine('wrap', fixedRng());
  e.food = { x: 0, y: 0 };
  for (let i = 0; i < 40; i++) e.step();
  assert.equal(e.status, 'running');
  for (const s of e.snake) {
    assert.ok(Number.isInteger(s.x) && Number.isInteger(s.y));
    assert.ok(s.x >= 0 && s.x < COLS && s.y >= 0 && s.y < ROWS);
  }
});

test('all four turns work from a perpendicular heading', () => {
  const e = new Engine('wrap', fixedRng());
  e.food = { x: 0, y: 0 };
  assert.ok(e.turn('up')); e.step(); assert.deepEqual(e.dir, { x: 0, y: -1 });
  assert.ok(e.turn('left')); e.step(); assert.deepEqual(e.dir, { x: -1, y: 0 });
  assert.ok(e.turn('down')); e.step(); assert.deepEqual(e.dir, { x: 0, y: 1 });
  assert.ok(e.turn('right')); e.step(); assert.deepEqual(e.dir, { x: 1, y: 0 });
});

test('immediate reversal is rejected, even via queued turns', () => {
  const e = new Engine('classic', fixedRng());
  e.food = { x: 0, y: 0 };
  assert.equal(e.turn('left'), false); // heading right
  assert.ok(e.turn('up'));
  assert.equal(e.turn('down'), false); // would reverse the queued 'up'
  e.step();
  e.step();
  assert.equal(e.status, 'running');
});

test('classic mode: wall collision ends the game and stops movement', () => {
  const e = new Engine('classic', fixedRng());
  e.food = { x: 0, y: 0 };
  let result;
  for (let i = 0; i < COLS + 2 && e.status === 'running'; i++) result = e.step();
  assert.equal(result.event, 'wall');
  assert.equal(e.status, 'over');
  const before = JSON.stringify(e.snake);
  assert.equal(e.step().event, 'none');
  assert.equal(JSON.stringify(e.snake), before);
});

test('wrap and practice modes: edges wrap in every direction', () => {
  for (const mode of ['wrap', 'practice']) {
    const e = new Engine(mode, fixedRng());
    e.food = { x: 0, y: 0 };
    e.snake = [{ x: COLS - 1, y: 3 }, { x: COLS - 2, y: 3 }, { x: COLS - 3, y: 3 }];
    e.step();
    assert.deepEqual(e.snake[0], { x: 0, y: 3 }, mode + ' right edge');
    e.snake = [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }];
    e.dir = { x: 0, y: -1 };
    e.step();
    assert.deepEqual(e.snake[0], { x: 5, y: ROWS - 1 }, mode + ' top edge');
    assert.equal(e.status, 'running');
  }
});

test('self collision ends the game in every mode', () => {
  for (const mode of ['classic', 'wrap', 'practice']) {
    const e = new Engine(mode, fixedRng());
    e.food = { x: 0, y: 0 };
    e.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }];
    e.dir = { x: 0, y: -1 };
    e.queue = [];
    assert.ok(e.turn('left'));
    assert.equal(e.step().event, 'self', mode);
    assert.equal(e.status, 'over');
  }
});

test('moving into the vacating tail cell is safe', () => {
  const e = new Engine('classic', fixedRng());
  e.food = { x: 0, y: 0 };
  // 2x2 loop: head follows tail
  e.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];
  e.dir = { x: 0, y: -1 };
  e.queue = [];
  e.turn('right');
  assert.equal(e.step().event, 'move');
  assert.equal(e.status, 'running');
});

test('eating scores once, grows by one, and spawns new food off the snake', () => {
  const e = new Engine('classic', fixedRng(0.5));
  const h = e.snake[0];
  e.food = { x: h.x + 1, y: h.y };
  const len = e.snake.length;
  assert.equal(e.step().event, 'eat');
  assert.equal(e.score, 1);
  assert.equal(e.snake.length, len + 1);
  assert.ok(e.food);
  assert.ok(!e.snake.some((s) => s.x === e.food.x && s.y === e.food.y));
  e.step(); // moving on must not score again
  assert.equal(e.score, 1);
});

test('food never spawns on the snake (many random spawns)', () => {
  let seed = 12345;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const e = new Engine('wrap', rng);
  e.snake = [];
  for (let i = 0; i < 100; i++) e.snake.push({ x: i % COLS, y: Math.floor(i / COLS) });
  for (let i = 0; i < 2000; i++) {
    assert.ok(e.spawnFood());
    assert.ok(!e.snake.some((s) => s.x === e.food.x && s.y === e.food.y));
  }
});

test('board completely full ends in a win without crashing', () => {
  const e = new Engine('classic', fixedRng(), 4, 1);
  e.snake = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  e.dir = { x: 1, y: 0 };
  e.queue = [];
  e.food = { x: 2, y: 0 };
  assert.equal(e.step().event, 'eat');
  assert.deepEqual(e.food, { x: 3, y: 0 });
  assert.equal(e.step().event, 'won');
  assert.equal(e.status, 'won');
  assert.equal(e.score, 2);
  assert.equal(e.step().event, 'none');
});

test('reset restores all state', () => {
  const e = new Engine('classic', fixedRng());
  e.score = 9; e.status = 'over'; e.queue = [{ x: 0, y: 1 }]; e.snake = [{ x: 1, y: 1 }];
  e.reset('wrap');
  assert.equal(e.score, 0);
  assert.equal(e.status, 'running');
  assert.equal(e.queue.length, 0);
  assert.equal(e.snake.length, 3);
  assert.equal(e.mode.id, 'wrap');
  assert.ok(e.food);
});

test('difficulty ramps up, respects the minimum, practice stays steady', () => {
  assert.equal(intervalFor(0, 'classic'), START_INTERVAL);
  assert.ok(intervalFor(10, 'classic') < intervalFor(5, 'classic'));
  assert.equal(intervalFor(10000, 'classic'), MIN_INTERVAL);
  assert.equal(intervalFor(0, 'practice'), intervalFor(50, 'practice'));
});

function memoryStorage(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('storage persists best score and settings across "reloads"', () => {
  const backing = memoryStorage();
  const a = new Store(backing);
  a.setBest('classic', 12);
  a.setBest('classic', 5); // lower scores are ignored
  a.setSound(false);
  a.setVibration(false);
  a.setMode('wrap');
  const b = new Store(backing);
  assert.equal(b.best('classic'), 12);
  assert.equal(b.data.sound, false);
  assert.equal(b.data.vibration, false);
  assert.equal(b.data.mode, 'wrap');
});

test('storage survives corrupted data and unavailable storage', () => {
  const bad = new Store(memoryStorage({ 'tormaar.v1': '{not json' }));
  assert.equal(bad.best('classic'), 0);
  const weird = new Store(memoryStorage({ 'tormaar.v1': JSON.stringify({ best: { classic: 'x' }, sound: 'no', mode: 'zzz' }) }));
  assert.equal(weird.best('classic'), 0);
  assert.equal(weird.data.sound, true);
  assert.equal(weird.data.mode, 'classic');
  const none = new Store(null);
  none.setBest('wrap', 3);
  assert.equal(none.best('wrap'), 3);
  const throwing = new Store({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
  throwing.setSound(false);
  assert.equal(throwing.data.sound, false);
});
