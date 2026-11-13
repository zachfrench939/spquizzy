import { SUPABASE_KEY, SUPABASE_URL } from "../config.js";

/** User-facing auth copy. docs/signup-WORDING.md quotes these strings. */
export const AUTH_COPY = {
  inboxHeading: "Check your inbox",
  inboxNew: (email) => `If this is a new email address, we’ve sent a verification link to ${email}. Click it to finish creating your account. Already have an account? Sign in instead.`,
  inboxMagic: (email) => `We’ve sent a sign-in link to ${email}.`,
  inboxHint: "Check your spam or junk folder if it doesn’t arrive.",
  inboxMagicHint: "Click the link in that email to sign in. Check your spam or junk folder if it doesn’t arrive.",
  resend: "Resend email",
  resendWait: (seconds) => `Resend email in ${seconds}s`,
  resent: "Verification email sent again.",
  inboxSignIn: "Sign in",
  different: "Use a different email",
  remember: "Keep me logged in",
  rememberHint: "Untick this on a shared device. You’ll be signed out when you close this tab.",
  signInTitle: "Keep your bank",
  signUpTitle: "Create an account",
  signInSubmit: "Sign in",
  signUpSubmit: "Create account",
  magicInstead: "Email me a link instead",
  needEmail: "Enter an email address.",
  weakPassword: "Use at least 8 characters for the password.",
  invalidLogin: "That email or password doesn’t match. Try again.",
  unconfirmed: "That email still needs verifying. Use Resend email if the link didn’t arrive.",
  resendError: "We couldn’t resend the verification email. Wait a moment and try again.",
  resendRate: "Too many emails just now. Wait a minute, then try Resend email.",
  signupRate: "Too many emails just now. Wait a minute, then try again.",
  signupError: "We couldn’t create the account. Try again. You can still play as a guest.",
  signinError: "We couldn’t sign you in. Try again. You can still play as a guest.",
};

export const MIN_PASSWORD_LENGTH = 8;
export const RESEND_COOLDOWN_MS = 60_000;
/** Refresh this long before the access token expires. */
export const REFRESH_SKEW_MS = 60_000;

export function passwordTooShort(password) {
  return String(password ?? "").length < MIN_PASSWORD_LENGTH;
}

export function sessionNeedsRefresh(session, now = Date.now(), skewMs = REFRESH_SKEW_MS) {
  if (!session?.refresh_token) return false;
  const at = Number(session.expires_at);
  if (!Number.isFinite(at) || at <= 0) return false;
  return at * 1000 - now <= skewMs;
}

export function refreshDelayMs(session, now = Date.now(), skewMs = REFRESH_SKEW_MS) {
  const at = Number(session?.expires_at);
  if (!Number.isFinite(at) || at <= 0) return null;
  return Math.max(0, at * 1000 - now - skewMs);
}

export function isInvalidRefresh(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toLowerCase();
  const text = String(error?.message || "").toLowerCase();
  if (status === 401 || status === 403) return true;
  if (code.includes("invalid_grant") || code.includes("refresh_token") || code.includes("session_not_found") || code.includes("bad_jwt")) return true;
  if (text.includes("invalid refresh") || text.includes("refresh token not found") || text.includes("invalid refresh token")) return true;
  if (status === 400 && (code.includes("invalid") || text.includes("refresh") || text.includes("grant"))) return true;
  return false;
}

export function isAlreadyRegistered(error) {
  const code = String(error?.code || "").toLowerCase();
  const text = String(error?.message || "").toLowerCase();
  return code === "user_already_exists"
    || code === "email_exists"
    || text.includes("already registered")
    || text.includes("already been registered");
}

/**
 * Refresh a stored session. Invalid tokens clear it. A network failure keeps it.
 * `save` and `clear` are the storage adapter writes.
 */
export async function refreshStoredSession(stored, { refresh, save, clear }) {
  try {
    const next = sessionFromAuth(await refresh(stored?.refresh_token));
    if (!next?.access_token) {
      const error = new Error("No session");
      error.status = 401;
      throw error;
    }
    if (!next.refresh_token && stored?.refresh_token) next.refresh_token = stored.refresh_token;
    save(next);
    return { action: "save", session: next };
  } catch (error) {
    if (isInvalidRefresh(error)) {
      clear();
      return { action: "clear", error };
    }
    return { action: "keep", error };
  }
}

export function resendCooldownLeft(startedAt, now = Date.now()) {
  const started = Number(startedAt || 0);
  if (!started) return 0;
  return Math.max(0, Math.ceil((started + RESEND_COOLDOWN_MS - now) / 1000));
}

function expiry(raw) {
  const at = Number(raw?.expires_at);
  if (Number.isFinite(at) && at > 0) return at;
  const span = Number(raw?.expires_in);
  if (Number.isFinite(span) && span > 0) return Math.floor(Date.now() / 1000) + span;
  return 0;
}

/** A GoTrue session, or null when sign-up still needs the email link. */
export function sessionFromAuth(payload) {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload.access_token ? payload : payload.session;
  if (!raw?.access_token) return null;
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token || "",
    expires_at: expiry(raw),
    token_type: raw.token_type || "bearer",
    user: raw.user || payload.user || null,
  };
}

/** Confirmation still required → inbox. Autoconfirm session → stay signed in. */
export function signupScreenState(payload) {
  return sessionFromAuth(payload) ? "signed-in" : "inbox";
}

export function isUnconfirmed(error) {
  const code = String(error?.code || "");
  const text = String(error?.message || "").toLowerCase();
  return code === "email_not_confirmed" || text.includes("email not confirmed");
}

export function authErrorMessage(kind, error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = String(error?.message || "");
  const lower = text.toLowerCase();
  const rateLimited = status === 429 || code.includes("over_email_send_rate_limit") || lower.includes("over_email_send_rate_limit");
  if (rateLimited) return kind === "resend" ? AUTH_COPY.resendRate : AUTH_COPY.signupRate;
  if (kind === "resend") return AUTH_COPY.resendError;
  if (isUnconfirmed(error)) return AUTH_COPY.unconfirmed;
  if (code === "invalid_credentials" || lower.includes("invalid login") || lower.includes("invalid email or password")) {
    return AUTH_COPY.invalidLogin;
  }
  if (code === "weak_password" || lower.includes("weak password") || /at least \d+/.test(lower)) {
    return AUTH_COPY.weakPassword;
  }
  return kind === "signup" ? AUTH_COPY.signupError : AUTH_COPY.signinError;
}

async function postAuth(path, body, redirectTo) {
  const url = new URL(`${SUPABASE_URL}/auth/v1/${path}`);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }
  if (!res.ok) {
    const error = new Error(payload?.msg || payload?.error_description || payload?.message || payload?.error || "Request failed");
    error.status = res.status;
    error.code = payload?.error_code || payload?.code || payload?.error || "";
    throw error;
  }
  return payload;
}

/** Same call as supabase.auth.signUp({ email, password, options: { emailRedirectTo } }). */
export function signUp({ email, password, options } = {}) {
  return postAuth("signup", {
    email,
    password,
    data: options?.data || {},
  }, options?.emailRedirectTo);
}

/** Same call as supabase.auth.signInWithPassword({ email, password }). */
export function signInWithPassword({ email, password } = {}) {
  return postAuth("token?grant_type=password", { email, password });
}

/** POST /auth/v1/token?grant_type=refresh_token */
export function refreshAccessToken(refreshToken) {
  return postAuth("token?grant_type=refresh_token", { refresh_token: refreshToken });
}

/** Same call as supabase.auth.resend({ type: 'signup', email, options }). */
export function resend({ type, email, options } = {}) {
  return postAuth("resend", { email, type }, options?.emailRedirectTo);
}
