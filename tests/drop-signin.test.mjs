import assert from "node:assert/strict";
import test from "node:test";

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return nextResponse;
};
let nextResponse = new Response("", { status: 200 });

const { magicLinkErrorMessage, readAuthHash, sendMagicLink, oauthUrl } = await import("../js/drop/api.js");

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
