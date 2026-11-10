/**
 * Ravioli
 * A set of compound words whose halves cannot be recombined into any other
 * word in the dictionary. Tapping the intended pairs is the only full clear.
 */
import { shuffle } from "../core.js";
import { PAIR_SET, WORDS, pairKey } from "../words.js";

const COUNT = { easy: 4, medium: 5, hard: 6 };

function conflicts(chosen, word) {
  for (const w of chosen) {
    if (w.a === word.a || w.b === word.a || w.a === word.b || w.b === word.b) return true;
  }
  const halves = [];
  for (const w of chosen) halves.push(w.a, w.b);
  halves.push(word.a, word.b);
  const intended = new Set(chosen.map((w) => pairKey(w.a, w.b)));
  intended.add(pairKey(word.a, word.b));
  for (let i = 0; i < halves.length; i++) {
    for (let j = i + 1; j < halves.length; j++) {
      const key = pairKey(halves[i], halves[j]);
      if (!intended.has(key) && PAIR_SET.has(key)) return true;
    }
  }
  return false;
}

function greedy(n, rng) {
  const order = shuffle(WORDS, rng);
  const chosen = [];
  for (const word of order) {
    if (conflicts(chosen, word)) continue;
    chosen.push(word);
    if (chosen.length === n) return chosen;
  }
  return null;
}

export function crossPairs(words) {
  const halves = words.flatMap((w) => [w.a, w.b]);
  const intended = new Set(words.map((w) => pairKey(w.a, w.b)));
  const extra = [];
  for (let i = 0; i < halves.length; i++) {
    for (let j = i + 1; j < halves.length; j++) {
      const key = pairKey(halves[i], halves[j]);
      if (!intended.has(key) && PAIR_SET.has(key)) extra.push(key);
    }
  }
  return extra;
}

export function generateRavioli(difficulty, rng) {
  const n = COUNT[difficulty] || 4;
  for (let attempt = 0; attempt < 120; attempt++) {
    const words = greedy(n, rng);
    if (!words) continue;
    if (crossPairs(words).length) continue;
    const tiles = shuffle(
      words.flatMap((w) => [w.a, w.b]),
      rng
    );
    return { words, tiles, par: n, difficulty };
  }
  throw new Error(`Ravioli could not deal ${difficulty}`);
}

export function matchWord(words, a, b) {
  const key = pairKey(a, b);
  return words.find((w) => pairKey(w.a, w.b) === key) || null;
}
