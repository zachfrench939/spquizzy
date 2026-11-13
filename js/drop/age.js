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

/** Stored on the sign-up user so the first verified sign-in can stamp age_confirmed_at. */
export const AGE_META_KEY = "age_13_plus";

/** The 13+ tick is only for creating an account, not for a returning sign-in. */
export function showAgeTick(mode) {
  return mode === "signup";
}

/** Sent as sign-up user metadata when the required tick is on. */
export function signupAgeMetadata() {
  return { [AGE_META_KEY]: true, app: "spiquizzy" };
}

/** A brand-new auth user, so a Google sign-up can be marked without touching an older Wick account. */
export function isFreshAccount(createdAt, now = Date.now()) {
  const created = Date.parse(createdAt || "");
  return Number.isFinite(created) && now >= created && now - created <= 15 * 60 * 1000;
}

export function decodeJwtPayload(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function metaSaysYes(meta) {
  if (!meta || typeof meta !== "object") return false;
  const value = meta[AGE_META_KEY];
  return value === true || value === "true";
}

/** True when this sign-up recorded the required 13+ tick. */
export function claimsAgeTick(session) {
  if (metaSaysYes(session?.user?.user_metadata)) return true;
  return metaSaysYes(decodeJwtPayload(session?.access_token)?.user_metadata);
}

/**
 * Any signed-in session with an empty age_confirmed_at waits on the gate.
 * A missing column means the migration is not applied yet, so the app does not block.
 */
export function needsAgeGate(profile) {
  if (!profile || !Object.prototype.hasOwnProperty.call(profile, "age_confirmed_at")) return false;
  return profile.age_confirmed_at == null;
}
