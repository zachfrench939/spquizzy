import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return new Response('{"age_confirmed_at":"2026-11-14T12:00:00Z"}', { status: 200 });
};

const { AGE_COPY, claimsAgeTick, isFreshAccount, needsAgeGate, showAgeTick, signupAgeMetadata, decodeJwtPayload } = await import("../js/drop/age.js");
const { confirmAge, deleteUnconfirmedAccount, markFreshSpiquizzyAccount, sendMagicLink } = await import("../js/drop/api.js");
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

test("create account records the tick and the Spiquizzy marker", () => {
  assert.deepEqual(signupAgeMetadata(), { age_13_plus: true, app: "spiquizzy" });
  assert.equal(isFreshAccount(new Date().toISOString()), true);
  assert.equal(isFreshAccount("2020-01-01T00:00:00Z"), false);
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
  assert.equal(body.data.app, "spiquizzy");
});

test("a magic-link sign-up carries the Spiquizzy marker", async () => {
  calls.length = 0;
  await sendMagicLink("ada@example.com", "https://spiquizzy.com/sign-in/");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.create_user, true);
  assert.equal(body.data.app, "spiquizzy");
  assert.equal(body.options, undefined);
});

test("only a brand-new unmarked account is stamped as Spiquizzy", async () => {
  const seen = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    seen.push({ url: String(url), method: options?.method || "GET" });
    if (options?.method === "PUT") return new Response("{}", { status: 200 });
    return new Response(JSON.stringify({ created_at: new Date().toISOString(), user_metadata: {} }), { status: 200 });
  };
  assert.equal(await markFreshSpiquizzyAccount({ access_token: "token" }), true);
  assert.equal(seen.some((call) => call.method === "PUT"), true);

  globalThis.fetch = async () => new Response(JSON.stringify({
    created_at: "2020-01-01T00:00:00.000Z",
    user_metadata: {},
  }), { status: 200 });
  assert.equal(await markFreshSpiquizzyAccount({ access_token: "token" }), false);
  assert.equal(await markFreshSpiquizzyAccount({
    access_token: "token",
    user: { created_at: new Date().toISOString(), user_metadata: { app: "spiquizzy" } },
  }), false);
  globalThis.fetch = previous;
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
  assert.match(sql, /join public\.dd_profiles p on p\.id = u\.id/);
  assert.match(sql, /p\.age_confirmed_at is null/);
  assert.doesNotMatch(sql, /not exists \([\s\S]*age_confirmed_at is not null/);
  assert.match(sql, /raw_user_meta_data->>'age_13_plus'/);
  assert.match(sql, /raw_user_meta_data->>'app'/);
  assert.match(sql, /spiquizzy/);
  assert.match(sql, /created_at >= ship_cutoff/);
  assert.match(sql, /dd_age_ship_cutoff\(\)/);
  assert.match(sql, /dry_run boolean default true/);
  assert.match(sql, /would_delete_auth/);
  assert.match(sql, /dd_rows_only/);
  assert.match(sql, /not like 'dd\\_%'/);
  assert.match(sql, /delete from auth\.refresh_tokens where user_id = p_uid/);
  assert.match(sql, /delete from auth\.sessions where user_id = p_uid/);
  assert.match(sql, /delete from public\.dd_profiles/);
  assert.match(sql, /delete from public\.dd_banks/);
  assert.match(sql, /delete from public\.dd_daily_runs/);
  assert.match(sql, /delete from public\.dd_stakes/);
  assert.match(sql, /delete from public\.dd_league_members/);
  assert.match(sql, /delete from auth\.users where id = p_uid/);
  assert.match(sql, /dd_delete_my_unconfirmed_account[\s\S]*dd_is_unconfirmed_spiquizzy\(uid\)/);
  assert.match(sql, /dd_apply_unconfirmed_delete\(uid, false\)/);
  assert.doesNotMatch(sql, /daily_scores|spiquizzy_scores|spiquizzy_pageviews/);
  assert.match(sql, /raise log 'dd_delete_unconfirmed_accounts dry_run=% would_delete_auth=% dd_rows_only=%'/);
  assert.doesNotMatch(sql, /raise log[^;]*email/i);
  assert.match(sql, /0 \* \* \* \*/);
  assert.match(sql, /--\s+select cron\.schedule/);
  assert.match(sql, /dd_delete_unconfirmed_accounts\(false\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /uid uuid := auth\.uid\(\)/);
  assert.match(sql, /created < public\.dd_age_ship_cutoff\(\)/);
  assert.match(sql, /grant execute on function public\.dd_delete_my_unconfirmed_account\(\) to authenticated/);
  assert.match(sql, /revoke all on function public\.dd_delete_unconfirmed_accounts\(boolean\) from authenticated/);
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
