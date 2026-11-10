import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";

const SESSION = "spquizzy.drop.session";

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.access_token) return null;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION);
}

function headers(session) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function rpc(name, body, session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(session),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

export function forfeitRun(session) {
  return rpc("dd_forfeit_run", {}, session);
}

export async function sendMagicLink(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: headers(null),
    body: JSON.stringify({
      email,
      create_user: true,
      options: { email_redirect_to: `${location.origin}/sign-in/` },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function oauthUrl(provider) {
  const redirect = encodeURIComponent(`${location.origin}/sign-in/`);
  return `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirect}`;
}

export function captureHashSession() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const access = hash.get("access_token");
  if (!access) return null;
  const session = {
    access_token: access,
    refresh_token: hash.get("refresh_token"),
    expires_at: Number(hash.get("expires_at") || 0),
    token_type: hash.get("token_type") || "bearer",
  };
  saveSession(session);
  history.replaceState(null, "", location.pathname + location.search);
  return session;
}
