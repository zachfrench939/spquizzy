/**
 * Pasta Pips
 * A domino tiling is dealt first, pips are written on it, then the board is
 * flooded into sauce regions. Each region's rule is read off that solution,
 * so the dealt tiling always works.
 */
import { int, shuffle } from "../core.js";

const SETUP = {
  easy: { rows: 4, cols: 4, regions: 5 },
  medium: { rows: 5, cols: 4, regions: 6 },
  hard: { rows: 6, cols: 4, regions: 8 },
};

function neigh(i, rows, cols) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const o = [];
  if (r > 0) o.push(i - cols);
  if (r + 1 < rows) o.push(i + cols);
  if (c > 0) o.push(i - 1);
  if (c + 1 < cols) o.push(i + 1);
  return o;
}

function randomTiling(rows, cols, rng) {
  const n = rows * cols;
  const used = new Uint8Array(n);
  const doms = [];
  function bt(pos) {
    while (pos < n && used[pos]) pos++;
    if (pos === n) return true;
    const r = Math.floor(pos / cols);
    const c = pos % cols;
    const opts = [];
    if (c + 1 < cols && !used[pos + 1]) opts.push(pos + 1);
    if (r + 1 < rows && !used[pos + cols]) opts.push(pos + cols);
    if (opts.length === 2 && rng() < 0.5) opts.reverse();
    used[pos] = 1;
    for (const nb of opts) {
      used[nb] = 1;
      doms.push([pos, nb]);
      if (bt(pos + 1)) return true;
      doms.pop();
      used[nb] = 0;
    }
    used[pos] = 0;
    return false;
  }
  if (!bt(0)) return null;
  return doms;
}

function growRegions(rows, cols, nReg, rng) {
  const n = rows * cols;
  const id = Array(n).fill(-1);
  const seeds = shuffle([...Array(n).keys()], rng).slice(0, nReg);
  seeds.forEach((s, i) => {
    id[s] = i;
  });
  let guard = 0;
  while (id.includes(-1) && guard++ < n * 20) {
    const candidates = [];
    for (let i = 0; i < n; i++) {
      if (id[i] < 0) continue;
      const open = neigh(i, rows, cols).filter((j) => id[j] < 0);
      if (open.length) candidates.push({ i, open, size: id.filter((x) => x === id[i]).length });
    }
    if (!candidates.length) break;
    candidates.sort((a, b) => a.size - b.size);
    const pool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 3)));
    const choice = pool[int(rng, pool.length)];
    const cell = choice.open[int(rng, choice.open.length)];
    id[cell] = id[choice.i];
  }
  return id.includes(-1) ? null : id;
}

function contiguous(cells, cols) {
  if (!cells.length) return false;
  const set = new Set(cells);
  const seen = new Set([cells[0]]);
  const q = [cells[0]];
  while (q.length) {
    const i = q.pop();
    for (const j of neigh(i, 99, cols)) {
      if (!set.has(j) || seen.has(j)) continue;
      seen.add(j);
      q.push(j);
    }
  }
  return seen.size === cells.length;
}

function pickConstraint(vals, rng) {
  const total = vals.reduce((a, b) => a + b, 0);
  const options = [{ type: "sum", n: total, w: 6 }];
  if (vals.length > 1 && vals.every((v) => v === vals[0])) options.push({ type: "equal", w: 4 });
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min >= 2) options.push({ type: "gt", n: min - 1, w: 2 });
  if (max <= 4) options.push({ type: "lt", n: max + 1, w: 2 });
  const weight = options.reduce((s, o) => s + o.w, 0);
  let roll = rng() * weight;
  for (const option of options) {
    roll -= option.w;
    if (roll <= 0) return { type: option.type, n: option.n };
  }
  return { type: "sum", n: total };
}

export function constraintHolds(constraint, vals) {
  if (!vals.length || vals.some((v) => v == null)) return false;
  if (constraint.type === "sum") return vals.reduce((a, b) => a + b, 0) === constraint.n;
  if (constraint.type === "equal") return vals.every((v) => v === vals[0]);
  if (constraint.type === "gt") return vals.every((v) => v > constraint.n);
  if (constraint.type === "lt") return vals.every((v) => v < constraint.n);
  return false;
}

export function constraintLabel(constraint) {
  if (constraint.type === "sum") return String(constraint.n);
  if (constraint.type === "equal") return "==";
  if (constraint.type === "gt") return ">" + constraint.n;
  if (constraint.type === "lt") return "<" + constraint.n;
  return "?";
}

export function regionStates(puzzle, values) {
  return puzzle.regions.map((region) => {
    const vals = region.cells.map((c) => values[c]);
    const filled = vals.every((v) => v != null);
    return {
      filled,
      ok: filled && constraintHolds(region, vals),
    };
  });
}

export function pipsSolved(puzzle, values) {
  if (!values || values.length !== puzzle.rows * puzzle.cols) return false;
  if (values.some((v) => v == null)) return false;
  return regionStates(puzzle, values).every((r) => r.ok);
}

function allDominoes() {
  const list = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) list.push([a, b]);
  }
  return list;
}

export function generatePips(difficulty, rng) {
  const cfg = SETUP[difficulty] || SETUP.easy;
  for (let attempt = 0; attempt < 30; attempt++) {
    const tiling = randomTiling(cfg.rows, cfg.cols, rng);
    if (!tiling) continue;
    const faces = shuffle(allDominoes(), rng).slice(0, tiling.length);
    const solution = Array(cfg.rows * cfg.cols).fill(0);
    const dominoes = tiling.map(([c0, c1], id) => {
      let [a, b] = faces[id];
      if (rng() < 0.5) [a, b] = [b, a];
      solution[c0] = a;
      solution[c1] = b;
      const low = Math.min(faces[id][0], faces[id][1]);
      const high = Math.max(faces[id][0], faces[id][1]);
      return { id, a: low, b: high, cells: [c0, c1], pips: [a, b] };
    });
    const ids = growRegions(cfg.rows, cfg.cols, cfg.regions, rng);
    if (!ids) continue;
    const regions = [];
    for (let r = 0; r < cfg.regions; r++) {
      const cells = [];
      ids.forEach((id, i) => {
        if (id === r) cells.push(i);
      });
      if (!cells.length || !contiguous(cells, cfg.cols)) {
        regions.length = 0;
        break;
      }
      const vals = cells.map((c) => solution[c]);
      const rule = pickConstraint(vals, rng);
      regions.push({ ...rule, cells });
    }
    if (regions.length !== cfg.regions) continue;
    const tray = shuffle(
      dominoes.map((d) => ({ id: d.id, a: d.a, b: d.b })),
      rng
    );
    return {
      rows: cfg.rows,
      cols: cfg.cols,
      regions,
      regionIds: ids,
      dominoes: tray,
      solution,
      tiling: dominoes.map((d) => ({ id: d.id, cells: d.cells, pips: d.pips })),
      par: tray.length,
      difficulty,
    };
  }
  throw new Error(`Pasta Pips could not deal ${difficulty}`);
}
