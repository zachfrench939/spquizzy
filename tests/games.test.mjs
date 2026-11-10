import assert from "node:assert/strict";
import test from "node:test";
import { makeRng, puzzleNumber, recordWin, shiftDate, buildShare } from "../js/core.js";
import { generateSauce, sauceReaches, alignPath, rotMask } from "../js/engines/sauce.js";
import { generateSlip, applySolution, ballOnExit } from "../js/engines/slip.js";
import { generateTwirl, pathIsSimple, twirlSolved } from "../js/engines/twirl.js";
import { generateBowls, bowlsSolved } from "../js/engines/bowls.js";
import { generateRavioli, crossPairs, matchWord } from "../js/engines/ravioli.js";
import { generatePips, pipsSolved, constraintHolds } from "../js/engines/pips.js";
import { WORDS } from "../js/words.js";

const DATES = Array.from({ length: 8 }, (_, i) => shiftDate("2026-11-01", i));
const DIFFS = ["easy", "medium", "hard"];

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
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

test("share text is time, rank, and squares", () => {
  const text = buildShare({
    title: "Sauce Pipes",
    date: "2026-11-10",
    diff: "easy",
    moves: 4,
    par: 6,
    seconds: 84,
    rank: "Faster than 10% of players today. 21 players. Median 0:40.",
  });
  assert.match(text, /1:24/);
  assert.match(text, /🟢🟢🟢🟢/);
  assert.match(text, /Faster than 10%/);
  assert.doesNotMatch(text, /Checking/);
  const pending = buildShare({
    title: "Sauce Pipes",
    date: "2026-11-10",
    diff: "easy",
    moves: 4,
    par: 6,
    seconds: 84,
    rank: "Checking today's times…",
  });
  assert.doesNotMatch(pending, /Checking/);
});

test("puzzle numbers increase one per day from 1 Jan 2026", () => {
  assert.equal(puzzleNumber("2026-01-01"), 1);
  assert.equal(puzzleNumber("2026-01-02"), 2);
  assert.equal(puzzleNumber("2026-11-10"), puzzleNumber("2026-11-09") + 1);
});

test("streaks count once per local day and ignore archive wins", () => {
  const store = memoryStorage();
  const today = "2026-11-10";
  let stats = recordWin("sauce", today, "easy", { moves: 8, par: 7, seconds: 40 }, today, store);
  assert.equal(stats.streak, 1);
  stats = recordWin("sauce", today, "medium", { moves: 9, par: 9, seconds: 50 }, today, store);
  assert.equal(stats.streak, 1);
  stats = recordWin("sauce", shiftDate(today, -3), "easy", { moves: 4, par: 4, seconds: 20 }, today, store);
  assert.equal(stats.streak, 1);
  const next = shiftDate(today, 1);
  stats = recordWin("sauce", next, "hard", { moves: 5, par: 6, seconds: 30 }, next, store);
  assert.equal(stats.streak, 2);
  assert.equal(stats.bestStreak, 2);
  stats = recordWin("sauce", today, "easy", { moves: 3, par: 7, seconds: 10 }, today, store);
  assert.equal(stats.wins[today].easy.moves, 3);
});

test("word list is joinable, unique, and long enough", () => {
  const seen = new Set();
  for (const w of WORDS) {
    assert.equal(w.word, w.a + w.b);
    assert.ok(w.a.length >= 3 && w.b.length >= 3);
    assert.ok(!seen.has(w.word), w.word);
    seen.add(w.word);
  }
  assert.ok(WORDS.length >= 80);
});

for (const diff of DIFFS) {
  for (const date of DATES) {
    test(`sauce ${diff} ${date}`, () => {
      const puzzle = generateSauce(diff, makeRng(["sauce", diff, date]));
      assert.equal(puzzle.tiles.length, puzzle.rows * puzzle.cols);
      const solved = puzzle.tiles.map((t) => ({ ...t, rot: 0 }));
      assert.equal(sauceReaches(solved, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate), true);
      assert.equal(sauceReaches(puzzle.tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate), false);
      assert.ok(puzzle.par >= 1);
      const onPath = new Set(puzzle.path);
      puzzle.tiles.forEach((tile, index) => {
        if (!onPath.has(index)) assert.equal(tile.rot, 0);
      });
      const aligned = alignPath(puzzle.tiles, puzzle.path, puzzle.cols);
      assert.equal(aligned.clicks, puzzle.par);
      assert.equal(sauceReaches(aligned.tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate), true);
      for (const tile of puzzle.tiles) assert.ok(rotMask(tile.mask, 0) <= 15);
      const again = generateSauce(diff, makeRng(["sauce", diff, date]));
      assert.deepEqual(again.tiles.map((t) => [t.mask, t.rot, t.kind]), puzzle.tiles.map((t) => [t.mask, t.rot, t.kind]));
    });

    test(`slip ${diff} ${date}`, () => {
      const t0 = performance.now();
      const puzzle = generateSlip(diff, makeRng(["slip", diff, date]));
      const ms = performance.now() - t0;
      assert.ok(ms < 800, `slow ${ms}`);
      assert.equal(overlaps(puzzle.pieces, puzzle.rows, puzzle.cols), false);
      assert.equal(ballOnExit(puzzle.pieces, puzzle.exit), false);
      assert.ok(puzzle.par >= 2);
      const end = applySolution(puzzle);
      assert.ok(end);
      assert.equal(ballOnExit(end, puzzle.exit), true);
      const again = generateSlip(diff, makeRng(["slip", diff, date]));
      assert.deepEqual(again.pieces.map((p) => [p.r, p.c, p.w, p.h]), puzzle.pieces.map((p) => [p.r, p.c, p.w, p.h]));
      assert.equal(again.par, puzzle.par);
    });

    test(`twirl ${diff} ${date}`, () => {
      const puzzle = generateTwirl(diff, makeRng(["twirl", diff, date]));
      const cells = new Set();
      for (const pair of puzzle.pairs) {
        assert.equal(pathIsSimple(pair.path, puzzle.cols), true);
        assert.ok(pair.path.length >= 3);
        assert.equal(pair.path[0], pair.a);
        assert.equal(pair.path[pair.path.length - 1], pair.b);
        for (const c of pair.path) {
          assert.equal(cells.has(c), false);
          cells.add(c);
        }
      }
      assert.equal(cells.size, puzzle.rows * puzzle.cols);
      assert.equal(puzzle.par, puzzle.pairs.length);
      assert.equal(twirlSolved(puzzle, puzzle.pairs.map((p) => p.path)), true);
      const broken = puzzle.pairs.map((p, i) => (i === 0 ? null : p.path));
      assert.equal(twirlSolved(puzzle, broken), false);
    });

    test(`bowls ${diff} ${date}`, () => {
      const puzzle = generateBowls(diff, makeRng(["bowls", diff, date]));
      const expectCount = diff === "easy" ? 6 : diff === "medium" ? 8 : 9;
      const expectBowls = diff === "hard" ? 3 : 2;
      assert.equal(puzzle.numbers.length, expectCount);
      assert.equal(puzzle.bowls, expectBowls);
      assert.equal(new Set(puzzle.numbers).size, puzzle.numbers.length);
      assert.ok(puzzle.numbers.every((n) => Number.isInteger(n) && n > 0));
      const sums = Array(puzzle.bowls).fill(0);
      puzzle.numbers.forEach((n, i) => {
        sums[puzzle.solution[i]] += n;
      });
      assert.ok(sums.every((s) => s === sums[0]));
      assert.equal(bowlsSolved(puzzle, puzzle.solution), true);
      assert.equal(bowlsSolved(puzzle, puzzle.numbers.map(() => 0)), false);
      assert.equal(bowlsSolved(puzzle, puzzle.numbers.map(() => -1)), false);
    });

    test(`ravioli ${diff} ${date}`, () => {
      const puzzle = generateRavioli(diff, makeRng(["ravioli", diff, date]));
      const n = diff === "easy" ? 4 : diff === "medium" ? 5 : 6;
      assert.equal(puzzle.words.length, n);
      assert.equal(puzzle.tiles.length, n * 2);
      assert.deepEqual(puzzle.tiles.slice().sort(), puzzle.words.flatMap((w) => [w.a, w.b]).sort());
      assert.equal(crossPairs(puzzle.words).length, 0);
      const halves = new Set(puzzle.tiles);
      assert.equal(halves.size, puzzle.tiles.length);
      for (const w of puzzle.words) assert.ok(matchWord(puzzle.words, w.b, w.a));
    });

    test(`pips ${diff} ${date}`, () => {
      const puzzle = generatePips(diff, makeRng(["pips", diff, date]));
      assert.equal(puzzle.solution.length, puzzle.rows * puzzle.cols);
      assert.equal(puzzle.dominoes.length * 2, puzzle.solution.length);
      const seen = new Set();
      for (const tile of puzzle.tiling) {
        assert.equal(puzzle.solution[tile.cells[0]], tile.pips[0]);
        assert.equal(puzzle.solution[tile.cells[1]], tile.pips[1]);
        const [c0, c1] = tile.cells;
        const r0 = Math.floor(c0 / puzzle.cols);
        const r1 = Math.floor(c1 / puzzle.cols);
        const d = Math.abs(r0 - r1) + Math.abs((c0 % puzzle.cols) - (c1 % puzzle.cols));
        assert.equal(d, 1);
        assert.equal(seen.has(c0) || seen.has(c1), false);
        seen.add(c0);
        seen.add(c1);
        const dom = puzzle.dominoes.find((x) => x.id === tile.id);
        assert.deepEqual([dom.a, dom.b].sort(), [...tile.pips].sort());
      }
      assert.equal(seen.size, puzzle.solution.length);
      for (const region of puzzle.regions) {
        const vals = region.cells.map((c) => puzzle.solution[c]);
        assert.equal(constraintHolds(region, vals), true);
      }
      assert.equal(pipsSolved(puzzle, puzzle.solution), true);
      const empty = puzzle.solution.map(() => null);
      assert.equal(pipsSolved(puzzle, empty), false);
    });
  }
}
