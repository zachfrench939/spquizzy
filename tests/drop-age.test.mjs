import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return new Response('{"age_confirmed_at":"2026-11-14T12:00:00Z"}', { status: 200 });
};

const { AGE_COPY, claimsAgeTick, needsAgeGate, showAgeTick, signupAgeMetadata, decodeJwtPayload } = await import("../js/drop/age.js");
const { confirmAge, deleteUnconfirmedAccount } = await import("../js/drop/api.js");
const { signUp } = await import("../js/drop/auth.js");

function jwt(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `aaa.${body}.sig`;
}

test("the 13+ tick is only on create account", () => {
  assert.equal(showAgeTick("signup"), true);
  assert.equal(showAgeTick("signin"), false);
  assert.equal(showAgeTick("magic"), false);
});

test("the gate waits on any session whose confirmation is still empty", () => {
  assert.equal(needsAgeGate({ username: "ada" }), false);
  assert.equal(needsAgeGate({ age_confirmed_at: null }), true);
  assert.equal(needsAgeGate({ age_confirmed_at: "2026-11-14T12:00:00Z" }), false);
  assert.equal(needsAgeGate(null), false);
});

test("create account records the tick in sign-up metadata", () => {
  assert.deepEqual(signupAgeMetadata(), { age_13_plus: true });
});

test("a verified sign-in can see the tick from the user or the access token", () => {
  assert.equal(claimsAgeTick({ user: { user_metadata: { age_13_plus: true } } }), true);
  assert.equal(claimsAgeTick({ access_token: jwt({ user_metadata: { age_13_plus: true } }) }), true);
  assert.equal(claimsAgeTick({ access_token: jwt({ user_metadata: {} }) }), false);
  assert.equal(claimsAgeTick(null), false);
  assert.equal(decodeJwtPayload("not-a-token"), null);
});

test("confirming age writes only the player's own confirmation", async () => {
  calls.length = 0;
  const saved = await confirmAge({ access_token: "token" });
  assert.equal(saved.age_confirmed_at, "2026-11-14T12:00:00Z");
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/dd_confirm_age$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.equal(calls[0].options.headers.Authorization, "Bearer token");
});

test("signing up posts the 13+ tick in user metadata", async () => {
  calls.length = 0;
  await signUp({
    email: "ada@example.com",
    password: "correct horse",
    options: { emailRedirectTo: "https://spiquizzy.com/sign-in/", data: signupAgeMetadata() },
  });
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.data.age_13_plus, true);
});

test("declining deletes only through the self-delete function", async () => {
  calls.length = 0;
  await deleteUnconfirmedAccount({ access_token: "token" });
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/dd_delete_my_unconfirmed_account$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.equal(calls[0].options.headers.Authorization, "Bearer token");
});

test("the gate copy says accounts are for players aged 13 and over", () => {
  assert.equal(AGE_COPY.gateTitle, "Are you 13 or over?");
  assert.equal(AGE_COPY.gateBody, "Accounts are for players aged 13 and over. Under 13s can play as a guest on this device.");
  assert.equal(AGE_COPY.confirm, "Yes, I’m 13 or over");
  assert.equal(AGE_COPY.decline, "No, sign me out");
  assert.equal(AGE_COPY.declined, "You were signed out. Accounts are for players aged 13 and over. You can still play as a guest.");
  assert.equal(AGE_COPY.tick, "I am 13 or over");
  const app = readFileSync(new URL("../js/drop/app.js", import.meta.url), "utf8");
  assert.equal(app.includes('id="age-gate-box"'), false);
  assert.equal((app.match(/class="age-choice"/g) || []).length, 2);
});

test("the delete migration is marked not to apply and skips existing accounts", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261114000200_dd_age_unconfirmed_delete.sql", import.meta.url), "utf8");
  assert.match(sql, /DO NOT APPLY/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /age_confirmed_at is not null/);
  assert.match(sql, /created_at >= ship_cutoff/);
  assert.match(sql, /dd_age_ship_cutoff\(\)/);
  assert.match(sql, /delete from public\.dd_profiles/);
  assert.match(sql, /delete from public\.dd_banks/);
  assert.match(sql, /delete from public\.dd_daily_runs/);
  assert.match(sql, /delete from public\.dd_stakes/);
  assert.match(sql, /delete from public\.dd_league_members/);
  assert.match(sql, /delete from auth\.users/);
  assert.doesNotMatch(sql, /daily_scores|spiquizzy_scores|spiquizzy_pageviews/);
  assert.match(sql, /raise log 'dd_delete_unconfirmed_accounts accounts=%/);
  assert.doesNotMatch(sql, /raise log[^;]*email/i);
  assert.match(sql, /0 \* \* \* \*/);
  assert.match(sql, /--\s+select cron\.schedule/);
  assert.match(sql, /security definer/);
  assert.match(sql, /uid uuid := auth\.uid\(\)/);
  assert.match(sql, /created < public\.dd_age_ship_cutoff\(\)/);
  assert.match(sql, /grant execute on function public\.dd_delete_my_unconfirmed_account\(\) to authenticated/);
  assert.match(sql, /revoke all on function public\.dd_delete_unconfirmed_accounts\(\) from authenticated/);
  const confirm = readFileSync(new URL("../supabase/migrations/20261114000100_dd_age_confirmed.sql", import.meta.url), "utf8");
  assert.match(confirm, /auth\.uid\(\) = id/);
  assert.match(confirm, /grant update \(age_confirmed_at\)/);
  assert.match(confirm, /dd_confirm_age/);
  assert.match(confirm, /2099-01-01/);
  assert.match(confirm, /dd_require_age_write/);
  assert.match(confirm, /dd_guard_age_write/);
  assert.match(confirm, /dd_banks/);
  assert.match(confirm, /dd_daily_runs/);
  assert.match(confirm, /dd_stakes/);
  assert.match(confirm, /username is not distinct from old\.username/);
  assert.match(confirm, /display_name is not distinct from old\.display_name/);
  const privacy = readFileSync(new URL("../privacy/index.html", import.meta.url), "utf8");
  assert.match(privacy, /When you create an account, we record that you confirmed you’re 13 or over and when\. If a new account isn’t confirmed within 24 hours, we delete it and everything linked to it\./);
});
