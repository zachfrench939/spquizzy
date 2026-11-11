const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

const BLOCKED = [
  "fuck", "shit", "cunt", "bitch", "asshole", "dick", "piss", "bastard",
  "wank", "cock", "tits", "slut", "whore", "nigger", "faggot", "retard",
];

export function usernameError(raw) {
  const name = String(raw || "").trim();
  if (!USERNAME_RE.test(name)) {
    return "Use 3 to 16 characters: letters, numbers and underscores.";
  }
  const lower = name.toLowerCase();
  if (BLOCKED.some((word) => lower.includes(word))) return "Pick a different username.";
  return "";
}

export function formatYouRank(you, total) {
  const count = (Number(total) || 0).toLocaleString("en-GB");
  if (!you || you.needsUsername) return "Pick a username to join the board.";
  if (!you.rank) return `You’re unranked of ${count}.`;
  return `You: #${Number(you.rank).toLocaleString("en-GB")} of ${count}`;
}
