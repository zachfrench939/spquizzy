/**
 * Slip
 * Rectangular lasagne trays and one meatball. A slide of any distance in one
 * straight gesture is a single move. Layouts are scrambled from a solved
 * board (meatball on the exit) and kept only when BFS par lands in range,
 * so every daily board is solvable and the par is the true minimum.
 */
import { int } from "../core.js";

const DIRS = {
  N: [-1, 0],
  S: [1, 0],
  W: [0, -1],
  E: [0, 1],
};

const CONFIG = {
  easy: {
    rows: 4,
    cols: 4,
    specs: [
      { w: 1, h: 1, ball: true },
      { w: 2, h: 2 },
      { w: 2, h: 1 },
      { w: 1, h: 2 },
      { w: 2, h: 1 },
    ],
    minPar: 3,
    maxPar: 8,
  },
  medium: {
    rows: 5,
    cols: 5,
    specs: [
      { w: 1, h: 1, ball: true },
      { w: 2, h: 2 },
      { w: 2, h: 2 },
      { w: 3, h: 1 },
      { w: 1, h: 3 },
      { w: 2, h: 1 },
      { w: 1, h: 2 },
    ],
    minPar: 4,
    maxPar: 9,
  },
  hard: {
    rows: 6,
    cols: 6,
    specs: [
      { w: 1, h: 1, ball: true },
      { w: 3, h: 2 },
      { w: 2, h: 3 },
      { w: 2, h: 2 },
      { w: 2, h: 2 },
      { w: 3, h: 1 },
      { w: 1, h: 2 },
      { w: 2, h: 1 },
    ],
    minPar: 4,
    maxPar: 9,
  },
};

export function clonePieces(pieces) {
  return pieces.map((p) => ({ ...p }));
}

function occupy(pieces, rows, cols) {
  const occ = new Uint8Array(rows * cols);
  pieces.forEach((p, i) => {
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) occ[(p.r + y) * cols + (p.c + x)] = i + 1;
    }
  });
  return occ;
}

function canPlace(occ, piece, index, r, c, rows, cols) {
  if (r < 0 || c < 0 || r + piece.h > rows || c + piece.w > cols) return false;
  for (let y = 0; y < piece.h; y++) {
    for (let x = 0; x < piece.w; x++) {
      const v = occ[(r + y) * cols + (c + x)];
      if (v && v !== index + 1) return false;
    }
  }
  return true;
}

export function slidePiece(pieces, rows, cols, index, dir, maxSteps = 99) {
  const [dr, dc] = DIRS[dir];
  const next = clonePieces(pieces);
  const occ = occupy(next, rows, cols);
  let steps = 0;
  while (steps < maxSteps) {
    const p = next[index];
    const nr = p.r + dr;
    const nc = p.c + dc;
    if (!canPlace(occ, p, index, nr, nc, rows, cols)) break;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) occ[(p.r + y) * cols + (p.c + x)] = 0;
    }
    p.r = nr;
    p.c = nc;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) occ[(p.r + y) * cols + (p.c + x)] = index + 1;
    }
    steps++;
  }
  if (!steps) return null;
  return { pieces: next, steps };
}

export function legalSlides(pieces, rows, cols) {
  const out = [];
  for (let i = 0; i < pieces.length; i++) {
    for (const dir of Object.keys(DIRS)) {
      let current = pieces;
      let steps = 0;
      while (true) {
        const moved = slidePiece(current, rows, cols, i, dir, 1);
        if (!moved) break;
        steps++;
        current = moved.pieces;
        out.push({ pieces: current, i, dir, steps });
      }
    }
  }
  return out;
}

export function pieceKey(pieces) {
  let s = "";
  for (const p of pieces) s += String.fromCharCode(65 + p.r, 65 + p.c);
  return s;
}

export function ballOnExit(pieces, exit) {
  return pieces[0].r === exit.r && pieces[0].c === exit.c;
}

export function solveSlip(pieces, rows, cols, exit, maxPar = 12, stateLimit = 80000) {
  const startKey = pieceKey(pieces);
  if (ballOnExit(pieces, exit)) return { par: 0, moves: [] };
  const dist = new Map([[startKey, 0]]);
  const prev = new Map();
  const q = [pieces];
  let head = 0;
  let goalKey = null;
  while (head < q.length) {
    if (dist.size > stateLimit) return null;
    const cur = q[head++];
    const d = dist.get(pieceKey(cur));
    if (d >= maxPar) continue;
    for (const slide of legalSlides(cur, rows, cols)) {
      const k = pieceKey(slide.pieces);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      prev.set(k, { from: pieceKey(cur), i: slide.i, dir: slide.dir, steps: slide.steps });
      if (ballOnExit(slide.pieces, exit)) {
        goalKey = k;
        head = q.length;
        break;
      }
      q.push(slide.pieces);
    }
  }
  if (!goalKey) return null;
  const moves = [];
  let k = goalKey;
  while (k !== startKey) {
    const step = prev.get(k);
    moves.push({ i: step.i, dir: step.dir, steps: step.steps });
    k = step.from;
  }
  moves.reverse();
  return { par: moves.length, moves, states: dist.size };
}

function edgeCells(rows, cols) {
  const cells = [];
  const seen = new Set();
  function add(r, c) {
    const k = r + "," + c;
    if (seen.has(k)) return;
    seen.add(k);
    cells.push({ r, c });
  }
  for (let r = 0; r < rows; r++) {
    add(r, 0);
    add(r, cols - 1);
  }
  for (let c = 0; c < cols; c++) {
    add(0, c);
    add(rows - 1, c);
  }
  return cells;
}

function arrowFor(exit, rows, cols, rng) {
  const opts = [];
  if (exit.r === 0) opts.push("N");
  if (exit.r === rows - 1) opts.push("S");
  if (exit.c === 0) opts.push("W");
  if (exit.c === cols - 1) opts.push("E");
  return opts[int(rng, opts.length)] || "E";
}

function randomSolved(cfg, exit, rng) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const occ = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0));
    const pieces = [];
    occ[exit.r][exit.c] = 1;
    pieces.push({ ...cfg.specs[0], r: exit.r, c: exit.c, ball: true });
    let ok = true;
    for (let i = 1; i < cfg.specs.length; i++) {
      const spec = cfg.specs[i];
      const spots = [];
      for (let r = 0; r <= cfg.rows - spec.h; r++) {
        for (let c = 0; c <= cfg.cols - spec.w; c++) {
          let free = true;
          for (let y = 0; y < spec.h && free; y++) {
            for (let x = 0; x < spec.w; x++) {
              if (occ[r + y][c + x]) {
                free = false;
                break;
              }
            }
          }
          if (free) spots.push([r, c]);
        }
      }
      if (!spots.length) {
        ok = false;
        break;
      }
      const [r, c] = spots[int(rng, spots.length)];
      for (let y = 0; y < spec.h; y++) {
        for (let x = 0; x < spec.w; x++) occ[r + y][c + x] = i + 1;
      }
      pieces.push({ ...spec, r, c, ball: false });
    }
    if (ok) return pieces;
  }
  return null;
}

function overlaps(pieces, rows, cols) {
  const occ = new Uint8Array(rows * cols);
  for (const p of pieces) {
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const r = p.r + y;
        const c = p.c + x;
        if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
        const i = r * cols + c;
        if (occ[i]) return true;
        occ[i] = 1;
      }
    }
  }
  return false;
}

function tryOnce(cfg, rng, minPar, maxPar) {
  const exit = edgeCells(cfg.rows, cfg.cols);
  const cell = exit[int(rng, exit.length)];
  const solved = randomSolved(cfg, cell, rng);
  if (!solved) return null;
  let state = solved;
  let prev = pieceKey(state);
  const steps = minPar + int(rng, Math.max(2, maxPar - minPar + 2));
  for (let s = 0; s < steps; s++) {
    const slides = legalSlides(state, cfg.rows, cfg.cols).filter((n) => pieceKey(n.pieces) !== prev);
    if (!slides.length) return null;
    const choice = slides[int(rng, slides.length)];
    prev = pieceKey(state);
    state = choice.pieces;
  }
  if (ballOnExit(state, cell)) return null;
  if (overlaps(state, cfg.rows, cfg.cols)) return null;
  const solvedPath = solveSlip(state, cfg.rows, cfg.cols, cell, maxPar);
  if (!solvedPath || solvedPath.par < minPar || solvedPath.par > maxPar) return null;
  return {
    rows: cfg.rows,
    cols: cfg.cols,
    exit: { r: cell.r, c: cell.c, dir: arrowFor(cell, cfg.rows, cfg.cols, rng) },
    pieces: state,
    par: solvedPath.par,
    solution: solvedPath.moves,
  };
}

export function generateSlip(difficulty, rng) {
  const cfg = CONFIG[difficulty] || CONFIG.easy;
  for (let attempt = 0; attempt < 36; attempt++) {
    const puzzle = tryOnce(cfg, rng, cfg.minPar, cfg.maxPar);
    if (puzzle) return { ...puzzle, difficulty };
  }
  for (let attempt = 0; attempt < 24; attempt++) {
    const puzzle = tryOnce(cfg, rng, Math.max(2, cfg.minPar - 1), cfg.maxPar + 2);
    if (puzzle) return { ...puzzle, difficulty };
  }
  throw new Error(`Slip could not deal ${difficulty}`);
}

export function applySolution(puzzle) {
  let pieces = clonePieces(puzzle.pieces);
  for (const move of puzzle.solution) {
    const moved = slidePiece(pieces, puzzle.rows, puzzle.cols, move.i, move.dir, move.steps);
    if (!moved || moved.steps !== move.steps) return null;
    pieces = moved.pieces;
  }
  return pieces;
}
