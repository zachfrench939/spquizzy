import assert from "node:assert/strict";
import test from "node:test";
import {
  START_COINS,
  addAmount,
  addRest,
  allIn,
  canManualLock,
  chipState,
  clearDoor,
  emptyDoorCount,
  freshPots,
  minusStep,
  stackCount,
  submissionWindow,
  timeoutPots,
  totalInPlay,
  trayTokens,
} from "../js/drop/rules.js";

test("a late lock-in is clamped after 25 seconds plus grace", () => {
  assert.equal(submissionWindow(24000), "accept");
  assert.equal(submissionWindow(27000), "accept");
  assert.equal(submissionWindow(27001), "clamp");
});

test("a day starts with 100 coins in the tray", () => {
  const pots = freshPots();
  assert.equal(START_COINS, 100);
  assert.equal(totalInPlay(pots), 100);
  assert.equal(pots.tray, 100);
  assert.deepEqual(trayTokens(100), [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  assert.deepEqual(trayTokens(23), [10, 10, 3]);
});

test("chips add from the tray, and All sweeps every coin onto the selected card", () => {
  let pots = addAmount(freshPots(), 0, 10);
  pots = addAmount(pots, 1, 20);
  assert.deepEqual(pots.doors, [10, 20, 0, 0]);
  assert.equal(pots.tray, 70);
  pots = addRest(pots, 2);
  assert.equal(pots.tray, 0);
  assert.equal(pots.doors[2], 70);
  pots = allIn(pots, 0);
  assert.deepEqual(pots, { tray: 0, doors: [100, 0, 0, 0] });
  assert.equal(canManualLock(pots), true);
  assert.equal(chipState(pots, 0).all, false);
  assert.equal(chipState(pots, 1).all, true);
});

test("chips disable when the tray cannot cover them", () => {
  const pots = { tray: 9, doors: [91, 0, 0, 0] };
  const chips = chipState(pots, 0);
  assert.equal(chips[1], true);
  assert.equal(chips[10], false);
  assert.equal(chips[50], false);
  assert.equal(chips.rest, true);
  const empty = chipState({ tray: 0, doors: [50, 50, 0, 0] }, 0);
  assert.equal(empty[1], false);
  assert.equal(empty.rest, false);
  assert.equal(empty.all, true);
});

test("minus takes 10 back, and a clear returns the whole card", () => {
  const pots = { tray: 0, doors: [10, 20, 70, 0] };
  const stepped = minusStep(pots, 1);
  assert.deepEqual(stepped, { tray: 10, doors: [10, 10, 70, 0] });
  const cleared = clearDoor(pots, 2);
  assert.deepEqual(cleared, { tray: 70, doors: [10, 20, 0, 0] });
  assert.equal(minusStep({ tray: 0, doors: [0, 0, 0, 4] }, 3).tray, 4);
});

test("manual lock needs every coin placed and one answer empty", () => {
  assert.equal(canManualLock({ tray: 0, doors: [10, 20, 70, 0] }), true);
  assert.equal(canManualLock({ tray: 5, doors: [95, 0, 0, 0] }), false);
  assert.equal(canManualLock({ tray: 0, doors: [25, 25, 25, 25] }), false);
  assert.equal(emptyDoorCount({ tray: 0, doors: [10, 20, 70, 0] }), 1);
  assert.equal(canManualLock(freshPots()), false);
});

test("a timeout drops only the coins still in the tray", () => {
  const left = timeoutPots({ tray: 30, doors: [10, 20, 40, 0] });
  assert.deepEqual(left, { tray: 0, doors: [10, 20, 40, 0] });
  assert.equal(totalInPlay(left), 70);
  assert.equal(totalInPlay(timeoutPots(freshPots())), 0);
});

test("stacks stay between one and five coins", () => {
  assert.equal(stackCount(0), 0);
  assert.equal(stackCount(1), 1);
  assert.equal(stackCount(10), 1);
  assert.equal(stackCount(11), 2);
  assert.equal(stackCount(30), 2);
  assert.equal(stackCount(31), 3);
  assert.equal(stackCount(50), 3);
  assert.equal(stackCount(51), 4);
  assert.equal(stackCount(80), 4);
  assert.equal(stackCount(81), 5);
  assert.equal(stackCount(100), 5);
});
