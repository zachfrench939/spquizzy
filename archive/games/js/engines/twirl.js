/**
 * Twirl
 * A full cover of the grid by non-crossing orthogonal paths. Endpoints are
 * the matching toppings. The player has to reconnect them and fill every cell.
 * Built by growing random paths, then merging stubs and splitting long ones
 * until the pair count sits in the difficulty band.
 */
import { int, shuffle } from "../core.js";

export const TOPPINGS = [
  { id: "tomato", label: "tomato" },
  { id: "shell", label: "shell" },
  { id: "basil", label: "basil" },
  { id: "olive", label: "olive" },
  { id: "meatball", label: "meatball" },
  { id: "cheese", label: "cheese" },
  { id: "pepper", label: "pepper" },
  { id: "garlic", label: "garlic" },
  { id: "chili", label: "chili" },
  { id: "mushroom", label: "mushroom" },
  { id: "bow", label: "farfalle" },
  { id: "ravioli", label: "ravioli" },
];

const SETUP = {
  easy: { size: 5, minPairs: 4, maxPairs: 6 },
  medium: { size: 6, minPairs: 5, maxPairs: 8 },
  hard: { size: 7, minPairs: 7, maxPairs: 10 },
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

function adjacent(a, b, cols) {
  const r1 = Math.floor(a / cols);
  const c1 = a % cols;
  const r2 = Math.floor(b / cols);
  const c2 = b % cols;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function growCover(rows, cols, rng) {
  const total = rows * cols;
  const used = new Uint8Array(total);
  const segs = [];
  const cells = shuffle([...Array(total).keys()], rng);
  for (const start of cells) {
    if (used[start]) continue;
    used[start] = 1;
    const path = [start];
    while (true) {
      const nbs = neigh(path[path.length - 1], rows, cols).filter((n) => !used[n]);
      if (!nbs.length) break;
      if (path.length >= 3 && (path.length >= 7 || rng() < 0.24)) break;
      nbs.sort((a, b) => neigh(a, rows, cols).filter((n) => !used[n]).length - neigh(b, rows, cols).filter((n) => !used[n]).length);
      const pick = rng() < 0.62 ? nbs[0] : nbs[int(rng, nbs.length)];
      used[pick] = 1;
      path.push(pick);
    }
    if (path.length < 2) return null;
    segs.push(path);
  }
  if (segs.reduce((s, p) => s + p.length, 0) !== total) return null;
  return segs;
}

function mergeAtEnds(a, b, cols) {
  const variants = [
    [a, b],
    [a.slice().reverse(), b],
    [a, b.slice().reverse()],
    [a.slice().reverse(), b.slice().reverse()],
  ];
  for (const [p, q] of variants) {
    if (adjacent(p[p.length - 1], q[0], cols)) return p.concat(q);
  }
  return null;
}

function normalize(segs, cols, minPairs, maxPairs, rng) {
  let paths = segs.map((p) => p.slice());
  let guard = 0;
  while (guard++ < 80 && (paths.some((p) => p.length < 3) || paths.length > maxPairs)) {
    let merged = false;
    const order = shuffle(paths.map((_, i) => i), rng);
    for (const i of order) {
      for (let j = 0; j < paths.length; j++) {
        if (i === j) continue;
        const joined = mergeAtEnds(paths[i], paths[j], cols);
        if (!joined) continue;
        const next = paths.filter((_, k) => k !== i && k !== j);
        next.push(joined);
        paths = next;
        merged = true;
        break;
      }
      if (merged) break;
    }
    if (!merged) break;
  }
  guard = 0;
  while (paths.length < minPairs && guard++ < 20) {
    const long = paths
      .map((p, i) => ({ p, i }))
      .filter((x) => x.p.length >= 6)
      .sort((a, b) => b.p.length - a.p.length);
    if (!long.length) break;
    const { p, i } = long[0];
    const at = 3 + int(rng, p.length - 5);
    const left = p.slice(0, at);
    const right = p.slice(at);
    if (left.length < 3 || right.length < 3) break;
    paths = paths.filter((_, k) => k !== i).concat([left, right]);
  }
  if (paths.some((p) => p.length < 3)) return null;
  if (paths.length < minPairs || paths.length > maxPairs) return null;
  return paths;
}

export function pathIsSimple(path, cols) {
  const seen = new Set();
  for (let i = 0; i < path.length; i++) {
    if (seen.has(path[i])) return false;
    seen.add(path[i]);
    if (i > 0 && !adjacent(path[i - 1], path[i], cols)) return false;
  }
  return path.length >= 2;
}

export function generateTwirl(difficulty, rng) {
  const cfg = SETUP[difficulty] || SETUP.easy;
  const { size, minPairs, maxPairs } = cfg;
  for (let attempt = 0; attempt < 80; attempt++) {
    const grown = growCover(size, size, rng);
    if (!grown) continue;
    const paths = normalize(grown, size, minPairs, maxPairs, rng);
    if (!paths) continue;
    const covered = new Set(paths.flat());
    if (covered.size !== size * size) continue;
    if (paths.some((p) => !pathIsSimple(p, size))) continue;
    const toppings = shuffle(TOPPINGS, rng);
    const pairs = paths.map((path, i) => ({
      topping: toppings[i % toppings.length].id,
      path,
      a: path[0],
      b: path[path.length - 1],
    }));
    return {
      rows: size,
      cols: size,
      pairs,
      par: pairs.length,
      difficulty,
    };
  }
  throw new Error(`Twirl could not deal ${difficulty}`);
}

export function twirlSolved(puzzle, paths) {
  if (!paths || paths.length !== puzzle.pairs.length) return false;
  const seen = new Set();
  for (let i = 0; i < puzzle.pairs.length; i++) {
    const path = paths[i];
    const pair = puzzle.pairs[i];
    if (!path || path.length < 2) return false;
    if (!pathIsSimple(path, puzzle.cols)) return false;
    const ends = new Set([path[0], path[path.length - 1]]);
    if (!ends.has(pair.a) || !ends.has(pair.b)) return false;
    for (const cell of path) {
      if (seen.has(cell)) return false;
      seen.add(cell);
    }
  }
  return seen.size === puzzle.rows * puzzle.cols;
}
