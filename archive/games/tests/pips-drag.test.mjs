import assert from "node:assert/strict";
import test from "node:test";
import { nearestPair, nextRotation, swingCell, validPairs } from "../js/pips-drag.js";

test("empty pairs are the horizontal and vertical neighbours", () => {
  const pairs = validPairs(2, 2, () => false);
  assert.deepEqual(pairs, [[0, 1], [0, 2], [1, 3], [2, 3]]);
});

test("a filled cell is not part of a pair", () => {
  const pairs = validPairs(2, 2, (cell) => cell === 1);
  assert.deepEqual(pairs, [[0, 2], [2, 3]]);
});

test("nearest pair is the closer midpoint", () => {
  const centers = {
    0: { cx: 0, cy: 0 },
    1: { cx: 10, cy: 0 },
    2: { cx: 0, cy: 10 },
  };
  const found = nearestPair([[0, 1], [0, 2]], 9, 1, (cell) => centers[cell]);
  assert.deepEqual(found.pair, [0, 1]);
});

test("a clockwise turn swings the free half", () => {
  assert.equal(swingCell(0, 1, 4, 4), 4);
  const next = nextRotation(0, 1, 2, 5, 4, 4, () => false);
  assert.deepEqual(next, { cells: [0, 4], values: [2, 5] });
});

test("a blocked turn swaps the halves in place", () => {
  const next = nextRotation(0, 1, 2, 5, 4, 4, (cell) => cell === 4 || cell === 5);
  assert.deepEqual(next, { cells: [0, 1], values: [5, 2] });
});
