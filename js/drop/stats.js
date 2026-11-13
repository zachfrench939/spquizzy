/** Stats from stored play days only. Never fills in a day the player did not record. */

function prevIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function finishedStreak(dates, today) {
  if (!dates.size || typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return 0;
  let cursor = dates.has(today) ? today : prevIso(today);
  if (!dates.has(cursor)) return 0;
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = prevIso(cursor);
  }
  return count;
}

/**
 * days: { date, banked, status } from the on-device bank.
 * A finished drop is status "completed" (all 10 questions), even if nothing was banked.
 * The streak stays alive through today if yesterday was finished and today is not yet.
 */
export function playStats(days, today) {
  const byDate = new Map();
  for (const day of Array.isArray(days) ? days : []) {
    if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
    byDate.set(day.date, day);
  }
  const unique = [...byDate.values()];
  const daysPlayed = unique.length;
  const bestBanked = unique.reduce((max, day) => Math.max(max, Number(day.banked) || 0), 0);
  const finished = new Set(unique.filter((day) => day.status === "completed").map((day) => day.date));
  const spark = unique
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-10)
    .map((day) => ({ date: day.date, banked: Number(day.banked) || 0 }));
  return {
    daysPlayed,
    streak: finishedStreak(finished, today),
    bestBanked,
    spark,
  };
}
