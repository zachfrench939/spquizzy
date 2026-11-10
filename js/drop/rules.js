/** Pure stake rules for The Daily Drop. No DOM. */

export const QUESTION_MS = 20000;
export const GRACE_MS = 2000;

export function submissionWindow(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "reject";
  if (elapsedMs <= QUESTION_MS + GRACE_MS) return "accept";
  return "clamp";
}

export function timeoutCoins(coins) {
  return coins.filter((coin) => coin.loc !== "tray").map((coin) => ({ ...coin }));
}

export function allIn(coins, door) {
  return coins.map((coin) => ({ ...coin, loc: door }));
}

export function addRest(coins, door) {
  return coins.map((coin) => (coin.loc === "tray" ? { ...coin, loc: door } : { ...coin }));
}

export function emptyDoorCount(coins) {
  const used = new Set(coins.filter((coin) => coin.loc !== "tray").map((coin) => coin.loc));
  return 4 - used.size;
}

export function canManualLock(coins) {
  if (!coins.length) return false;
  if (coins.some((coin) => coin.loc === "tray")) return false;
  return emptyDoorCount(coins) >= 1;
}
