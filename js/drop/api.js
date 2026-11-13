import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";
import { isFreshAccount } from "./age.js";
import { SESSION_KEY, authStorage } from "./auth-storage.js";

const SESSION = SESSION_KEY;

export function readStoredSession() {
  try {
    const raw = authStorage.getItem(SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.access_token && !session?.refresh_token) return null;
    return session;
  } catch {
    return null;
  }
}

export function readSession() {
  const session = readStoredSession();
  if (!session?.access_token) return null;
  if (session.expires_at && session.expires_at * 1000 < Date.now()) return null;
  return session;
}

export function saveSession(session) {
  authStorage.setItem(SESSION, JSON.stringify(session));
}

export function clearSession() {
  authStorage.removeItem(SESSION);
}

function headers(session) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function rpc(name, body, session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(session),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function serveQuestion(index, session) {
  return rpc("dd_serve_question", { p_index: index }, session);
}

export function lockIn(index, dist, timeout, session) {
  return rpc("dd_lock_in", { p_index: index, p_dist: dist, p_timeout: timeout }, session);
}

export function serveGuest(guestId, position) {
  return rpc("dd_serve_guest", { p_guest: guestId, p_position: position }, null);
}

export function gradeQuestion(packIndex, position, dist, timeout, guestId) {
  return rpc("dd_grade_question", {
    p_pack: packIndex,
    p_position: position,
    p_dist: dist,
    p_timeout: timeout,
    p_guest: guestId,
  }, null);
}

export function weeklyLeague(session) {
  return rpc("dd_weekly_league", {}, session);
}

export function myProfile(session) {
  return rpc("dd_my_profile", {}, session);
}

export function setUsername(name, session) {
  return rpc("dd_set_username", { p_name: name }, session);
}

export function setBoardOptOut(hide, session) {
  return rpc("dd_set_board_opt_out", { p_hide: hide }, session);
}

export function confirmAge(session) {
  return rpc("dd_confirm_age", {}, session);
}

export function deleteUnconfirmedAccount(session) {
  return rpc("dd_delete_my_unconfirmed_account", {}, session);
}

function metadataMarksSpiquizzy(meta) {
  if (!meta || typeof meta !== "object") return false;
  return meta.app === "spiquizzy" || meta.age_13_plus === true || meta.age_13_plus === "true";
}

/**
 * Google sign-up cannot put user metadata on the authorize URL.
 * Stamp app=spiquizzy only when this auth user was created in the last 15 minutes
 * and does not already carry a Spiquizzy marker. An older account is left alone.
 */
const APP_MARKED_KEY = "spquizzy.drop.app-marked";

function rememberAppCheck() {
  try { sessionStorage.setItem(APP_MARKED_KEY, "1"); } catch { /* private mode */ }
}

export async function markFreshSpiquizzyAccount(session, now = Date.now()) {
  if (!session?.access_token) return false;
  try {
    if (sessionStorage.getItem(APP_MARKED_KEY) === "1") return false;
  } catch { /* private mode */ }
  if (metadataMarksSpiquizzy(session.user?.user_metadata)) {
    rememberAppCheck();
    return false;
  }
  let user = session.user;
  if (!user?.created_at) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(session) });
    if (!res.ok) return false;
    user = await res.json();
  }
  if (metadataMarksSpiquizzy(user?.user_metadata) || !isFreshAccount(user?.created_at, now)) {
    rememberAppCheck();
    return false;
  }
  const saved = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: headers(session),
    body: JSON.stringify({ data: { app: "spiquizzy" } }),
  });
  if (saved.ok) rememberAppCheck();
  return saved.ok;
}

export function leaderboard(period, session) {
  return rpc("dd_leaderboard", { p_period: period }, session);
}

export function forfeitRun(session) {
  return rpc("dd_forfeit_run", {}, session);
}

export function magicLinkErrorMessage(status, body = "") {
  const text = String(body || "");
  if (status === 429 || text.includes("over_email_send_rate_limit")) {
    return "Email sign-in is having trouble right now. You can still play as a guest and your coins stay on this device.";
  }
  return "We couldn’t send the sign-in email. You can still play as a guest.";
}

export function readAuthHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const error = params.get("error");
  const errorCode = params.get("error_code");
  if (error || errorCode) {
    const expired = errorCode === "otp_expired" || error === "access_denied";
    return {
      error,
      error_code: errorCode,
      message: expired
        ? "That link has expired, send a new one."
        : "That sign-in link didn’t work. Send a new one. You can still play as a guest.",
    };
  }
  const access = params.get("access_token");
  if (!access) return null;
  return {
    access_token: access,
    refresh_token: params.get("refresh_token"),
    expires_at: Number(params.get("expires_at") || 0),
    token_type: params.get("token_type") || "bearer",
  };
}

export async function sendMagicLink(email, redirectTo = `${location.origin}/sign-in/`) {
  const redirect = encodeURIComponent(redirectTo);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${redirect}`, {
    method: "POST",
    headers: headers(null),
    body: JSON.stringify({ email, create_user: true, data: { app: "spiquizzy" } }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(magicLinkErrorMessage(res.status, text));
    err.status = res.status;
    throw err;
  }
}

export function oauthUrl(provider) {
  const redirect = encodeURIComponent(`${location.origin}/sign-in/`);
  return `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirect}`;
}

export function captureHashSession() {
  const parsed = readAuthHash(location.hash);
  if (!parsed) return null;
  history.replaceState(null, "", location.pathname + location.search);
  if (parsed.access_token) saveSession(parsed);
  return parsed;
}
