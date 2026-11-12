import { SUPABASE_KEY, SUPABASE_URL } from "../config.js";

/** User-facing auth copy. docs/signup-WORDING.md quotes these strings. */
export const AUTH_COPY = {
  inboxHeading: "Check your inbox",
  inboxSent: (email) => `We’ve sent a verification email to ${email}.`,
  inboxHint: "Click the link in that email to verify your address. Check your spam or junk folder if it doesn’t arrive.",
  resend: "Resend email",
  resendWait: (seconds) => `Resend email in ${seconds}s`,
  resent: "Verification email sent again.",
  back: "Back to sign in",
  different: "Use a different email",
  remember: "Keep me logged in",
  rememberHint: "Untick this on a shared device. You’ll be signed out when the browser closes.",
  signInTitle: "Keep your bank",
  signUpTitle: "Create an account",
  signInSubmit: "Sign in",
  signUpSubmit: "Create account",
  magicInstead: "Email me a link instead",
  needEmail: "Enter an email address.",
  weakPassword: "Use at least 6 characters for the password.",
  invalidLogin: "That email or password doesn’t match. Try again.",
  alreadyRegistered: "An account with that email already exists. Sign in instead.",
  unconfirmed: "That email still needs verifying. Use Resend email if the link didn’t arrive.",
  resendError: "We couldn’t resend the verification email. Wait a moment and try again.",
  resendRate: "Too many emails just now. Wait a minute, then try Resend email.",
  signupRate: "Too many emails just now. Wait a minute, then try again.",
  signupError: "We couldn’t create the account. Try again. You can still play as a guest.",
  signinError: "We couldn’t sign you in. Try again. You can still play as a guest.",
};

export const RESEND_COOLDOWN_MS = 60_000;

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
  if (
    code === "user_already_exists"
    || code === "email_exists"
    || lower.includes("already registered")
    || lower.includes("already been registered")
  ) {
    return AUTH_COPY.alreadyRegistered;
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

/** Same call as supabase.auth.resend({ type: 'signup', email, options }). */
export function resend({ type, email, options } = {}) {
  return postAuth("resend", { email, type }, options?.emailRedirectTo);
}
