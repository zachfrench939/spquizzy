/** Shared daily-puzzle helpers. No DOM at import time. */

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(parts) {
  return mulberry32(hashString(parts.join("|")));
}

export function int(rng, n) {
  return Math.floor(rng() * n);
}

export function pick(rng, arr) {
  return arr[int(rng, arr.length)];
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || "")) return false;
  const [y, m, d] = str.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayString(dt);
}

export function compareDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function formatLong(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatShort(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()].slice(0, 3)} ${d} ${MONTHS[m - 1]}`;
}

/** Puzzle #1 is 1 Jan 2026, local calendar date. */
export function puzzleNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(2026, 0, 1);
  return Math.round((utc - epoch) / 86400000) + 1;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function plural(noun, n) {
  if (n === 1) return noun;
  if (noun === "try") return "tries";
  return noun + "s";
}

export function buildShare({ title, date, diff, noun, moves, par, seconds }) {
  const n = puzzleNumber(date);
  const label = diff.charAt(0).toUpperCase() + diff.slice(1);
  const mark = moves < par ? "🟩" : moves === par ? "🟨" : "🟥";
  return [
    `Spquizzy ${title} #${n}`,
    `${label} 🍝`,
    `${moves} ${plural(noun, moves)} (par ${par})`,
    `⏱ ${formatTime(seconds)}`,
    mark,
  ].join("\n");
}

const memory = new Map();
const fallbackStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};

export function getStorage(storage) {
  if (storage) return storage;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode */
  }
  return fallbackStorage;
}

export function emptyStats() {
  return { streak: 0, bestStreak: 0, lastWinDate: null, wins: {} };
}

export function statsKey(gameId) {
  return `spquizzy.stats.v1:${gameId}`;
}

export function runKey(gameId, diff, date) {
  return `spquizzy.run.v1:${gameId}:${diff}:${date}`;
}

export function loadStats(gameId, storage) {
  const raw = getStorage(storage).getItem(statsKey(gameId));
  if (!raw) return emptyStats();
  try {
    const data = JSON.parse(raw);
    return {
      streak: data.streak || 0,
      bestStreak: data.bestStreak || 0,
      lastWinDate: data.lastWinDate || null,
      wins: data.wins || {},
    };
  } catch {
    return emptyStats();
  }
}

export function saveStats(gameId, stats, storage) {
  getStorage(storage).setItem(statsKey(gameId), JSON.stringify(stats));
}

/**
 * Record a win. Streaks move only when the puzzle date is actually today.
 * Replaying a difficulty keeps the better (fewer moves, then faster) result.
 */
export function recordWin(gameId, puzzleDate, diff, result, today, storage) {
  const stats = loadStats(gameId, storage);
  const day = stats.wins[puzzleDate] || {};
  const prev = day[diff];
  const better = !prev || result.moves < prev.moves || (result.moves === prev.moves && result.seconds < prev.seconds);
  if (better) {
    day[diff] = {
      won: true,
      moves: result.moves,
      par: result.par,
      seconds: result.seconds,
    };
    stats.wins[puzzleDate] = day;
  }
  if (puzzleDate === today && stats.lastWinDate !== today) {
    const yesterday = shiftDate(today, -1);
    stats.streak = stats.lastWinDate === yesterday ? stats.streak + 1 : 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    stats.lastWinDate = today;
  }
  saveStats(gameId, stats, storage);
  return stats;
}

export function loadRun(gameId, diff, date, storage) {
  const raw = getStorage(storage).getItem(runKey(gameId, diff, date));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveRun(gameId, diff, date, run, storage) {
  getStorage(storage).setItem(runKey(gameId, diff, date), JSON.stringify(run));
}

export function clearRun(gameId, diff, date, storage) {
  getStorage(storage).removeItem(runKey(gameId, diff, date));
}

export function diffKey(gameId) {
  return `spquizzy.diff.v1:${gameId}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-999px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
