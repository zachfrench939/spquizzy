/**
 * Even Bowls
 * Numbers are dealt as groups that already share a total, then shuffled into
 * a pool. Any placement that evens the bowls (all of them non-empty) wins.
 */
import { int, shuffle } from "../core.js";

const SETUP = {
  easy: { sizes: [3, 3], maxN: 9 },
  medium: { sizes: [4, 4], maxN: 12 },
  hard: { sizes: [3, 3, 3], maxN: 12 },
};

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function sample(pool, k, rng) {
  const copy = pool.slice();
  const out = [];
  for (let i = 0; i < k && copy.length; i++) {
    const j = int(rng, copy.length);
    out.push(copy.splice(j, 1)[0]);
  }
  return out;
}

function groupSummingTo(size, target, used, maxN, rng) {
  const pool = [];
  for (let n = 1; n <= maxN; n++) if (!used.has(n) && n < target) pool.push(n);
  for (let t = 0; t < 60; t++) {
    if (pool.length < size) return null;
    const chosen = sample(pool, size - 1, rng);
    const last = target - sum(chosen);
    if (last >= 1 && last <= maxN && last < target && !used.has(last) && !chosen.includes(last)) {
      return chosen.concat(last);
    }
  }
  return null;
}

export function generateBowls(difficulty, rng) {
  const cfg = SETUP[difficulty] || SETUP.easy;
  for (let attempt = 0; attempt < 200; attempt++) {
    const used = new Set();
    const groups = [];
    const first = [];
    const pool = [];
    for (let n = 1; n <= cfg.maxN; n++) pool.push(n);
    const starter = sample(pool, cfg.sizes[0], rng);
    if (starter.length < cfg.sizes[0]) continue;
    starter.forEach((n) => used.add(n));
    first.push(...starter);
    const target = sum(first);
    if (target < cfg.sizes[0] + 2) continue;
    groups.push(first);
    let ok = true;
    for (let g = 1; g < cfg.sizes.length; g++) {
      const nums = groupSummingTo(cfg.sizes[g], target, used, cfg.maxN, rng);
      if (!nums) {
        ok = false;
        break;
      }
      nums.forEach((n) => used.add(n));
      groups.push(nums);
    }
    if (!ok) continue;
    if (groups.some((g) => sum(g) !== target)) continue;
    if (groups.some((g) => g.length < 2)) continue;
    const numbers = shuffle(groups.flat(), rng);
    const solution = numbers.map((n) => {
      for (let b = 0; b < groups.length; b++) if (groups[b].includes(n)) return b;
      return -1;
    });
    return {
      numbers,
      bowls: groups.length,
      target,
      groups,
      solution,
      par: numbers.length,
      difficulty,
    };
  }
  throw new Error(`Even Bowls could not deal ${difficulty}`);
}

export function bowlSums(numbers, assignment, bowls) {
  const sums = Array(bowls).fill(0);
  const counts = Array(bowls).fill(0);
  numbers.forEach((n, i) => {
    const b = assignment[i];
    if (b == null || b < 0) return;
    sums[b] += n;
    counts[b] += 1;
  });
  return { sums, counts };
}

export function bowlsSolved(puzzle, assignment) {
  if (!assignment || assignment.length !== puzzle.numbers.length) return false;
  if (assignment.some((b) => b == null || b < 0 || b >= puzzle.bowls)) return false;
  const { sums, counts } = bowlSums(puzzle.numbers, assignment, puzzle.bowls);
  if (counts.some((c) => c === 0)) return false;
  return sums.every((s) => s === sums[0]);
}
