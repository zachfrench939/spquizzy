/**
 * Sauce Pipes
 * A random spanning tree fills the grid. Two far-apart leaves become the pot
 * and the plate. Every other tile is rotated. Par is the clockwise turns
 * needed along the unique pot-to-plate path.
 */
import { int, shuffle } from "../core.js";

const DIRS = [
  { bit: 1, dr: -1, dc: 0, opp: 4 },
  { bit: 2, dr: 0, dc: 1, opp: 8 },
  { bit: 4, dr: 1, dc: 0, opp: 1 },
  { bit: 8, dr: 0, dc: -1, opp: 2 },
];

export function rotMask(mask, rot) {
  let m = mask & 15;
  const turns = ((rot % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    let n = 0;
    if (m & 1) n |= 2;
    if (m & 2) n |= 4;
    if (m & 4) n |= 8;
    if (m & 8) n |= 1;
    m = n;
  }
  return m;
}

export function effectiveMask(tile) {
  return rotMask(tile.mask, tile.rot);
}

function neighbors(i, rows, cols) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  if (r > 0) out.push(i - cols);
  if (r + 1 < rows) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c + 1 < cols) out.push(i + 1);
  return out;
}

function randomSpanningTree(rows, cols, rng) {
  const n = rows * cols;
  const adj = Array.from({ length: n }, () => []);
  const inn = new Uint8Array(n);
  const start = int(rng, n);
  inn[start] = 1;
  let frontier = neighbors(start, rows, cols).map((nb) => [start, nb]);
  let count = 1;
  while (count < n) {
    const valid = frontier.filter((e) => !inn[e[1]]);
    if (!valid.length) break;
    const edge = valid[int(rng, valid.length)];
    inn[edge[1]] = 1;
    adj[edge[0]].push(edge[1]);
    adj[edge[1]].push(edge[0]);
    count++;
    frontier = valid.filter((e) => e !== edge);
    for (const nb of neighbors(edge[1], rows, cols)) {
      if (!inn[nb]) frontier.push([edge[1], nb]);
    }
  }
  return adj;
}

function dirBit(from, to, cols) {
  const r = Math.floor(from / cols);
  const c = from % cols;
  const rr = Math.floor(to / cols);
  const cc = to % cols;
  if (rr === r - 1 && cc === c) return 1;
  if (rr === r && cc === c + 1) return 2;
  if (rr === r + 1 && cc === c) return 4;
  if (rr === r && cc === c - 1) return 8;
  return 0;
}

function maskFromAdj(i, adj, cols) {
  let m = 0;
  for (const j of adj[i]) m |= dirBit(i, j, cols);
  return m;
}

function pathBetween(adj, from, to) {
  const prev = new Map([[from, -1]]);
  const q = [from];
  while (q.length) {
    const i = q.shift();
    if (i === to) break;
    for (const j of adj[i]) {
      if (!prev.has(j)) {
        prev.set(j, i);
        q.push(j);
      }
    }
  }
  const path = [];
  let cur = to;
  while (cur !== -1 && cur !== undefined) {
    path.push(cur);
    if (cur === from) break;
    cur = prev.get(cur);
  }
  path.reverse();
  return path[0] === from ? path : null;
}

export function traceFlow(tiles, rows, cols, pot) {
  const masks = tiles.map(effectiveMask);
  const reached = new Set([pot]);
  const sauced = new Map();
  const q = [pot];
  while (q.length) {
    const i = q.shift();
    const r = Math.floor(i / cols);
    const c = i % cols;
    const m = masks[i];
    for (const dir of DIRS) {
      if (!(m & dir.bit)) continue;
      const rr = r + dir.dr;
      const cc = c + dir.dc;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
      const j = rr * cols + cc;
      if (!(masks[j] & dir.opp)) continue;
      sauced.set(i, (sauced.get(i) || 0) | dir.bit);
      sauced.set(j, (sauced.get(j) || 0) | dir.opp);
      if (!reached.has(j)) {
        reached.add(j);
        q.push(j);
      }
    }
  }
  return { reached, sauced };
}

export function sauceReaches(tiles, rows, cols, pot, plate) {
  return traceFlow(tiles, rows, cols, pot).reached.has(plate);
}

function requiredBits(path, index, cols) {
  const k = path.indexOf(index);
  let need = 0;
  if (k > 0) need |= dirBit(index, path[k - 1], cols);
  if (k < path.length - 1) need |= dirBit(index, path[k + 1], cols);
  return need;
}

export function parTurns(tiles, path, cols) {
  let par = 0;
  for (const i of path) {
    const tile = tiles[i];
    if (tile.fixed) continue;
    const need = requiredBits(path, i, cols);
    let best = 4;
    for (let r = 0; r < 4; r++) {
      if ((rotMask(tile.mask, r) & need) !== need) continue;
      const cw = (r - tile.rot + 4) % 4;
      if (cw < best) best = cw;
    }
    if (best < 4) par += best;
  }
  return par;
}

/** Rotate on-path tiles onto a connecting orientation. Returns click count. */
export function alignPath(tiles, path, cols) {
  const next = tiles.map((t) => ({ ...t }));
  let clicks = 0;
  for (const i of path) {
    if (next[i].fixed) continue;
    const need = requiredBits(path, i, cols);
    let best = 4;
    let bestR = next[i].rot;
    for (let r = 0; r < 4; r++) {
      if ((rotMask(next[i].mask, r) & need) !== need) continue;
      const cw = (r - next[i].rot + 4) % 4;
      if (cw < best) {
        best = cw;
        bestR = r;
      }
    }
    if (best < 4) {
      clicks += best;
      next[i].rot = bestR;
    }
  }
  return { tiles: next, clicks };
}

function leavesOf(adj) {
  const leaves = [];
  for (let i = 0; i < adj.length; i++) if (adj[i].length === 1) leaves.push(i);
  return leaves;
}

const SIZES = { easy: 5, medium: 6, hard: 7 };

export function generateSauce(difficulty, rng) {
  const rows = SIZES[difficulty] || 5;
  const cols = rows;
  for (let attempt = 0; attempt < 40; attempt++) {
    const adj = randomSpanningTree(rows, cols, rng);
    if (adj.some((a) => a.length === 0)) continue;
    const leaves = leavesOf(adj);
    if (leaves.length < 2) continue;
    let best = [];
    for (let a = 0; a < leaves.length; a++) {
      for (let b = a + 1; b < leaves.length; b++) {
        const path = pathBetween(adj, leaves[a], leaves[b]);
        if (!path) continue;
        best.push(path);
      }
    }
    best.sort((a, b) => b.length - a.length);
    const long = best.filter((p) => p.length >= Math.max(5, rows));
    const pool = (long.length ? long : best).slice(0, 4);
    if (!pool.length) continue;
    const path = shuffle(pool, rng)[0];
    const pot = path[0];
    const plate = path[path.length - 1];
    const tiles = adj.map((links, i) => ({
      mask: maskFromAdj(i, adj, cols),
      rot: 0,
      fixed: i === pot || i === plate,
      kind: i === pot ? "pot" : i === plate ? "plate" : "pipe",
    }));
    if (!sauceReaches(tiles, rows, cols, pot, plate)) continue;
    const limits = { easy: [4, 8], medium: [6, 12], hard: [8, 14] }[difficulty] || [4, 10];
    const onPath = new Set(path);
    const cost = (index) => {
      const tile = tiles[index];
      const need = requiredBits(path, index, cols);
      let best = 4;
      let bestR = tile.rot;
      for (let r = 0; r < 4; r++) {
        if ((rotMask(tile.mask, r) & need) !== need) continue;
        const cw = (r - tile.rot + 4) % 4;
        if (cw < best) {
          best = cw;
          bestR = r;
        }
      }
      return { best, bestR };
    };
    for (const i of path) {
      if (tiles[i].fixed) continue;
      const { bestR } = cost(i);
      tiles[i].rot = (bestR + 3) % 4;
    }
    let guard = 0;
    while (parTurns(tiles, path, cols) > limits[1] && guard++ < 40) {
      const pricey = path.find((i) => !tiles[i].fixed && cost(i).best > 0);
      if (pricey == null) break;
      tiles[pricey].rot = cost(pricey).bestR;
    }
    guard = 0;
    while (parTurns(tiles, path, cols) < limits[0] && guard++ < 40) {
      const idle = path.find((i) => !tiles[i].fixed && cost(i).best === 0);
      if (idle == null) break;
      tiles[idle].rot = (cost(idle).bestR + 3) % 4;
    }
    if (sauceReaches(tiles, rows, cols, pot, plate)) continue;
    const par = parTurns(tiles, path, cols);
    if (par < limits[0] || par > limits[1]) continue;
    for (let i = 0; i < tiles.length; i++) {
      if (!onPath.has(i)) tiles[i].rot = 0;
    }
    return { rows, cols, tiles, path, pot, plate, par, difficulty };
  }
  throw new Error(`Sauce Pipes could not deal ${difficulty}`);
}

export function rotateTile(tiles, index) {
  return tiles.map((tile, i) => (i === index && !tile.fixed ? { ...tile, rot: (tile.rot + 1) % 4 } : tile));
}
