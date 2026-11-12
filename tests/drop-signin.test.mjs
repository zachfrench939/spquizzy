import assert from "node:assert/strict";
import test from "node:test";

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return nextResponse;
};
let nextResponse = new Response("", { status: 200 });

const { magicLinkErrorMessage, readAuthHash, sendMagicLink, oauthUrl, setBoardOptOut, readSession, saveSession, clearSession } = await import("../js/drop/api.js");
const {
  AUTH_COPY,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  passwordTooShort,
  resend,
  resendCooldownLeft,
  sessionFromAuth,
  signUp,
  signupScreenState,
} = await import("../js/drop/auth.js");
const { REMEMBER_KEY, SESSION_KEY, chooseRemember, clearLocalAuth, createAuthStorage } = await import("../js/drop/auth-storage.js");

function memoryStore() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("a rate limit gets a friendly guest message", () => {
  const message = "Email sign-in is having trouble right now. You can still play as a guest and your coins stay on this device.";
  assert.equal(magicLinkErrorMessage(429, ""), message);
  assert.equal(magicLinkErrorMessage(400, '{"error_code":"over_email_send_rate_limit"}'), message);
});

test("any other sign-in failure stays friendly", () => {
  assert.equal(
    magicLinkErrorMessage(500, "database down"),
    "We couldn’t send the sign-in email. You can still play as a guest.",
  );
});

test("the magic-link redirect is a query param, not an SDK option", async () => {
  calls.length = 0;
  nextResponse = new Response("", { status: 200 });
  await sendMagicLink("player@example.com", "https://spiquizzy.com/sign-in/");
  assert.equal(calls.length, 1);
  const sent = calls[0];
  assert.match(sent.url, /\/auth\/v1\/otp\?redirect_to=https%3A%2F%2Fspiquizzy\.com%2Fsign-in%2F$/);
  const body = JSON.parse(sent.options.body);
  assert.equal(body.email, "player@example.com");
  assert.equal(body.options, undefined);
});

test("oauth still puts redirect_to on the query string", () => {
  globalThis.location = { origin: "https://spiquizzy.com" };
  const url = oauthUrl("google");
  assert.match(url, /\/auth\/v1\/authorize\?provider=google&redirect_to=https%3A%2F%2Fspiquizzy\.com%2Fsign-in%2F$/);
});

test("hiding from the board sends only the opt-out flag", async () => {
  calls.length = 0;
  nextResponse = new Response('{"username":"ada","opted_out_of_boards":true}', { status: 200 });
  const saved = await setBoardOptOut(true, { access_token: "token" });
  assert.equal(saved.opted_out_of_boards, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/dd_set_board_opt_out$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_hide: true });
  assert.equal(calls[0].options.headers.Authorization, "Bearer token");
});

test("the storage adapter keeps a remembered session in localStorage", () => {
  const local = memoryStore();
  const session = memoryStore();
  session.setItem(SESSION_KEY, "stale");
  const storage = createAuthStorage({ localArea: local, sessionArea: session });
  storage.setItem(SESSION_KEY, "kept");
  assert.equal(storage.getItem(SESSION_KEY), "kept");
  assert.equal(local.getItem(SESSION_KEY), "kept");
  assert.equal(session.getItem(SESSION_KEY), null);
});

test("an unticked remember flag routes the session to sessionStorage and clears the other copy", () => {
  const local = memoryStore();
  const session = memoryStore();
  local.setItem(REMEMBER_KEY, "0");
  local.setItem(SESSION_KEY, "stale-local");
  const storage = createAuthStorage({ localArea: local, sessionArea: session });
  storage.setItem(SESSION_KEY, "tab-only");
  assert.equal(storage.getItem(SESSION_KEY), "tab-only");
  assert.equal(session.getItem(SESSION_KEY), "tab-only");
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.equal(local.getItem(REMEMBER_KEY), "0");
});

test("choosing remember before Google clears the store that will not be used", () => {
  const local = memoryStore();
  const session = memoryStore();
  local.setItem(SESSION_KEY, "old-local");
  session.setItem(SESSION_KEY, "old-tab");
  chooseRemember(false, local, session);
  assert.equal(local.getItem(REMEMBER_KEY), "0");
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.equal(session.getItem(SESSION_KEY), "old-tab");
  chooseRemember(true, local, session);
  assert.equal(local.getItem(REMEMBER_KEY), "1");
  assert.equal(session.getItem(SESSION_KEY), null);
});

test("clear local data drops the remember flag and the session in both stores", () => {
  const local = memoryStore();
  const session = memoryStore();
  local.setItem(REMEMBER_KEY, "0");
  local.setItem(SESSION_KEY, "local-token");
  session.setItem(SESSION_KEY, "tab-token");
  clearLocalAuth(local, session);
  assert.equal(local.getItem(REMEMBER_KEY), null);
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.equal(session.getItem(SESSION_KEY), null);
});

test("a password shorter than 8 characters is rejected on the client", () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(AUTH_COPY.weakPassword, "Use at least 8 characters for the password.");
  assert.equal(passwordTooShort("sevench"), true);
  assert.equal(passwordTooShort("eightchr"), false);
});

test("sign-out removes the session from both stores", () => {
  const local = memoryStore();
  const session = memoryStore();
  const storage = createAuthStorage({ localArea: local, sessionArea: session });
  local.setItem(SESSION_KEY, "local-token");
  session.setItem(SESSION_KEY, "tab-token");
  storage.removeItem(SESSION_KEY);
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.equal(session.getItem(SESSION_KEY), null);
});

test("saveSession and clearSession follow the remember flag", () => {
  const local = memoryStore();
  const session = memoryStore();
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  chooseRemember(false);
  saveSession({ access_token: "abc", expires_at: 9_999_999_999 });
  assert.match(session.getItem(SESSION_KEY), /abc/);
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.equal(readSession().access_token, "abc");
  clearSession();
  assert.equal(readSession(), null);
  assert.equal(session.getItem(SESSION_KEY), null);
  assert.equal(local.getItem(SESSION_KEY), null);
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

test("signup without a session is the inbox screen, and a session stays signed in", () => {
  assert.equal(signupScreenState({ id: "user-1", email: "ada@example.com" }), "inbox");
  assert.equal(sessionFromAuth({ id: "user-1", email: "ada@example.com" }), null);
  assert.equal(signupScreenState({ session: null, user: { email: "ada@example.com" } }), "inbox");
  const signedIn = { access_token: "tok", refresh_token: "ref", expires_in: 3600, token_type: "bearer" };
  assert.equal(signupScreenState(signedIn), "signed-in");
  const session = sessionFromAuth(signedIn);
  assert.equal(session.access_token, "tok");
  assert.equal(session.refresh_token, "ref");
  assert.ok(session.expires_at > Math.floor(Date.now() / 1000));
});

test("the inbox screen copy names the address and the resend wait", () => {
  assert.equal(AUTH_COPY.inboxHeading, "Check your inbox");
  assert.equal(AUTH_COPY.inboxSent("ada@example.com"), "We’ve sent a verification email to ada@example.com.");
  assert.equal(AUTH_COPY.inboxHint, "Click the link in that email to verify your address. Check your spam or junk folder if it doesn’t arrive.");
  assert.equal(AUTH_COPY.resend, "Resend email");
  assert.equal(AUTH_COPY.resendWait(60), "Resend email in 60s");
  assert.equal(AUTH_COPY.resent, "Verification email sent again.");
  assert.equal(AUTH_COPY.back, "Back to sign in");
  assert.equal(AUTH_COPY.different, "Use a different email");
  assert.equal(AUTH_COPY.remember, "Keep me logged in");
  assert.equal(resendCooldownLeft(1_000, 1_000), 60);
  assert.equal(resendCooldownLeft(1_000, 61_000), 0);
});

test("resend asks Supabase for a signup verification email", async () => {
  calls.length = 0;
  nextResponse = new Response("{}", { status: 200 });
  await resend({
    type: "signup",
    email: "ada@example.com",
    options: { emailRedirectTo: "https://spiquizzy.com/sign-in/" },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/v1\/resend\?redirect_to=https%3A%2F%2Fspiquizzy\.com%2Fsign-in%2F$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "ada@example.com", type: "signup" });
});

test("signup posts the email and password, and a confirm-first response stays on the inbox", async () => {
  calls.length = 0;
  nextResponse = new Response(JSON.stringify({ id: "user-1", email: "ada@example.com", identities: [{}] }), { status: 200 });
  const created = await signUp({
    email: "ada@example.com",
    password: "correct horse",
    options: { emailRedirectTo: "https://spiquizzy.com/sign-in/" },
  });
  assert.equal(signupScreenState(created), "inbox");
  assert.match(calls[0].url, /\/auth\/v1\/signup\?redirect_to=https%3A%2F%2Fspiquizzy\.com%2Fsign-in%2F$/);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.email, "ada@example.com");
  assert.equal(body.password, "correct horse");
});

test("resend and sign-up failures stay friendly", () => {
  const rate = { status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" };
  assert.equal(authErrorMessage("resend", rate), "Too many emails just now. Wait a minute, then try Resend email.");
  assert.equal(authErrorMessage("signup", rate), "Too many emails just now. Wait a minute, then try again.");
  assert.equal(authErrorMessage("resend", { status: 500, message: "nope" }), "We couldn’t resend the verification email. Wait a moment and try again.");
  assert.equal(authErrorMessage("signin", { code: "email_not_confirmed", message: "Email not confirmed" }), AUTH_COPY.unconfirmed);
});

test("an expired link hash is a friendly message, and a token hash is a session", () => {
  const expired = readAuthHash("#error=access_denied&error_code=otp_expired");
  assert.equal(expired.message, "That link has expired, send a new one.");
  assert.equal(expired.access_token, undefined);
  const session = readAuthHash("#access_token=abc&refresh_token=def&expires_at=99&token_type=bearer");
  assert.equal(session.access_token, "abc");
  assert.equal(session.refresh_token, "def");
  assert.equal(session.expires_at, 99);
  assert.equal(readAuthHash(""), null);
});
