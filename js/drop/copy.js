/** User-facing Daily Drop strings for this round. The wording doc quotes these. */

export const BANK_NUDGE_KEY = "spquizzy.drop.bank-nudge";

export const DROP_LOCAL_KEYS = [
  "spquizzy.drop.run",
  "spquizzy.drop.bank",
  "spquizzy.drop.settings",
  BANK_NUDGE_KEY,
];

/** Keys Clear local data removes from this device, apart from the sign-in token and dd_remember. */
export function clearDropLocal(storage) {
  for (const key of DROP_LOCAL_KEYS) storage.removeItem(key);
}

export const COPY = {
  pitch: "Put your coins on the answers you trust. Finish all 10 to bank what’s left.",
  ogLine: "10 questions a day. Put your coins on the answers you trust.",
  coinsLine: "Put your coins on the answers you trust.",
  nudge: "Want to keep your bank? Accounts are for players 13 and over.",
  nudgeYes: "Sign in / Create account",
  nudgeNo: "No thanks",
  plus: "Spiquizzy Plus is coming soon.",
  archive: "The archive of past official days isn’t open yet.",
  archivePlus: "Spiquizzy Plus is coming soon.",
  leagueEmpty: "No scores on this board yet. Finish today’s drop, and if you’re 13 or over, sign in to be first.",
  leagueEmptySigned: "No scores on this board yet. Finish today’s drop to be first.",
  leagueGuest: "Players 13 and over can sign in to appear on this week’s board.",
  realName: "Don’t use your real name.",
  seeYou: "See you at midnight UK time.",
  safeEmpty: "Safe, no coins on it",
  how1: "Tap an answer and put your coins on the ones you trust. Leave at least one empty.",
  how2: "Lock in. Wrong answers drop. Coins on the right answer stay.",
  how3: "Finish all 10 to bank what’s left. Leave early or go to 0, and you bank 0 today.",
  chipHint: "All puts everything on this answer. Rest puts what’s left in the tray.",
  allAria: "All, everything onto this answer",
  restAria: "Rest, what’s left in the tray",
  labels: "Keep the Safe and Dropped stickers on screen after you lock in.",
  clearLocal: "Clear local data removes today’s drop, your guest bank, your sound and motion settings and your keep me logged in choice from this device. It also signs you out here, and clears the note about saving your bank. It does not change your page-view choice, and it does not delete an account.",
  practiceCta: "Practice question",
  practiceTry: "Try a practice question",
  practiceTitle: "Practice complete",
  practiceSub: "This stayed on this device. Today’s bank is unchanged.",
  practiceBack: "Back to today’s drop",
  practiceBanner: "Practice. This does not touch today’s bank.",
  statsEmpty: "Finish a drop and these update from the days stored on this device.",
  statsFrom: "Counted from the days stored on this device.",
  daysPlayed: "Days played",
  streak: "Streak",
  streakHint: "Finished drops in a row",
  bestBanked: "Best banked",
  settingsLink: "Settings",
  pickAnswer: "Pick an answer",
  boardUnavailable: "The board isn’t available right now.",
};
