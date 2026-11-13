/** 13+ gate copy. docs/age-gate-WORDING.md quotes these strings. */
export const AGE_COPY = {
  rule: "You must be 13 or over to create an account. Under 13s can play as a guest on this device.",
  tick: "I am 13 or over",
  need: "Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.",
  gateTitle: "Are you 13 or over?",
  gateBody: "Accounts are for players aged 13 and over. Under 13s can play as a guest on this device.",
  confirm: "Yes, I’m 13 or over",
  decline: "No, sign me out",
  declined: "You were signed out. Accounts are for players aged 13 and over. You can still play as a guest.",
  saveError: "That didn’t save. Try again, or sign out and play as a guest.",
};

export const AGE_GATE_KEY = "spquizzy.drop.needs-age-gate";
export const AGE_TICKED_KEY = "spquizzy.drop.age-ticked";

/** The 13+ tick is only for creating an account, not for a returning sign-in. */
export function showAgeTick(mode) {
  return mode === "signup";
}

/**
 * Google and magic-link arrivals wait on the gate when the profile has the
 * new column and it is still empty. A missing column means the migration
 * is not applied yet, so the app does not block.
 */
export function needsAgeGate(profile, pending) {
  if (!pending) return false;
  if (!profile || !Object.prototype.hasOwnProperty.call(profile, "age_confirmed_at")) return false;
  return profile.age_confirmed_at == null;
}
