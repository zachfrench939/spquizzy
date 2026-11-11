/** Pure stake rules for The Daily Drop. No DOM. */

export const START_COINS = 100;
export const QUESTION_MS = 25000;
export const GRACE_MS = 2000;
export const MINUS_STEP = 10;
export const LONG_PRESS_MS = 550;

export function submissionWindow(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "reject";
  if (elapsedMs <= QUESTION_MS + GRACE_MS) return "accept";
  return "clamp";
}

export function freshPots(total = START_COINS) {
  return { tray: total, doors: [0, 0, 0, 0] };
}

export function clonePots(pots) {
  return { tray: pots.tray, doors: pots.doors.slice() };
}

export function totalInPlay(pots) {
  return pots.tray + pots.doors.reduce((sum, count) => sum + count, 0);
}

export function stackCount(amount) {
  if (amount <= 0) return 0;
  if (amount <= 10) return 1;
  if (amount <= 30) return 2;
  if (amount <= 50) return 3;
  if (amount <= 80) return 4;
  return 5;
}

export function trayTokens(tray) {
  const tokens = [];
  const tens = Math.floor(tray / 10);
  for (let i = 0; i < tens; i += 1) tokens.push(10);
  const rem = tray % 10;
  if (rem) tokens.push(rem);
  return tokens;
}

export function addAmount(pots, door, amount) {
  const moved = Math.min(Math.max(0, amount), pots.tray);
  if (!moved) return pots;
  const doors = pots.doors.slice();
  doors[door] += moved;
  return { tray: pots.tray - moved, doors };
}

export function addRest(pots, door) {
  return addAmount(pots, door, pots.tray);
}

export function allIn(pots, door) {
  const live = totalInPlay(pots);
  const doors = [0, 0, 0, 0];
  doors[door] = live;
  return { tray: 0, doors };
}

export function minusStep(pots, door) {
  const have = pots.doors[door] || 0;
  const moved = Math.min(MINUS_STEP, have);
  if (!moved) return pots;
  const doors = pots.doors.slice();
  doors[door] = have - moved;
  return { tray: pots.tray + moved, doors };
}

export function clearDoor(pots, door) {
  const have = pots.doors[door] || 0;
  if (!have) return pots;
  const doors = pots.doors.slice();
  doors[door] = 0;
  return { tray: pots.tray + have, doors };
}

export function emptyDoorCount(pots) {
  return pots.doors.filter((count) => count === 0).length;
}

export function canManualLock(pots) {
  if (!pots || totalInPlay(pots) <= 0) return false;
  if (pots.tray > 0) return false;
  return emptyDoorCount(pots) >= 1;
}

export function chipState(pots, door) {
  const tray = pots.tray;
  const live = totalInPlay(pots);
  const onDoor = pots.doors[door] || 0;
  return {
    1: tray >= 1,
    10: tray >= 10,
    50: tray >= 50,
    rest: tray > 0,
    all: live > 0 && onDoor < live,
  };
}

/** Tray coins are lost. Coins already on answers stay to be judged. */
export function timeoutPots(pots) {
  return { tray: 0, doors: pots.doors.slice() };
}
