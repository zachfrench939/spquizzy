import assert from "node:assert/strict";
import test from "node:test";
import { addRest, allIn, canManualLock, submissionWindow, timeoutCoins } from "../js/drop/rules.js";

const coins = [
  { id: 0, loc: "tray" },
  { id: 1, loc: 0 },
  { id: 2, loc: 2 },
];

test("a late lock-in is clamped after 20 seconds plus grace", () => {
  assert.equal(submissionWindow(19000), "accept");
  assert.equal(submissionWindow(22000), "accept");
  assert.equal(submissionWindow(22001), "clamp");
});

test("a timeout drops coins still in the tray", () => {
  const left = timeoutCoins(coins);
  assert.deepEqual(left.map((coin) => coin.id), [1, 2]);
});

test("all in stacks every coin on one answer", () => {
  const next = allIn(coins, 3);
  assert.ok(next.every((coin) => coin.loc === 3));
  assert.equal(canManualLock(next), true);
});

test("add rest moves only the tray", () => {
  const next = addRest(coins, 1);
  assert.equal(next[0].loc, 1);
  assert.equal(next[1].loc, 0);
  assert.equal(next[2].loc, 2);
});
