import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { formatTime, getStorage } from "./core.js";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function scoreKey(slug, difficulty, date) {
  return `spquizzy.score.v1:${slug}:${difficulty}:${date}`;
}

export function rankMessage(rank) {
  if (!rank || !Number.isFinite(Number(rank.players))) return "";
  const players = Number(rank.players);
  if (players <= 1) return "You're the first to solve today!";
  const slower = Number(rank.slower) || 0;
  const pct = Math.round((slower / (players - 1)) * 100);
  const median = formatTime(Number(rank.median_seconds) || 0);
  return `Faster than ${pct}% of players today. ${players} players. Median ${median}.`;
}

export async function submitAndRank({ slug, difficulty, date, seconds, moves }) {
  const storage = getStorage();
  const key = scoreKey(slug, difficulty, date);
  const safeSeconds = Math.max(1, Math.min(7200, Math.round(Number(seconds) || 1)));
  const safeMoves = Math.max(0, Math.round(Number(moves) || 0));
  if (!storage.getItem(key)) {
    try {
      const posted = await fetch(`${SUPABASE_URL}/rest/v1/spiquizzy_scores`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          game: slug,
          difficulty,
          puzzle_date: date,
          seconds: safeSeconds,
          moves: safeMoves,
        }),
      });
      if (posted.ok) storage.setItem(key, "1");
    } catch {
      /* offline or blocked; the solved card still shows your own time */
    }
  }
  try {
    const ranked = await fetch(`${SUPABASE_URL}/rest/v1/rpc/spiquizzy_rank`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_game: slug,
        p_difficulty: difficulty,
        p_date: date,
        p_seconds: safeSeconds,
      }),
    });
    if (!ranked.ok) return null;
    const data = await ranked.json();
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}
