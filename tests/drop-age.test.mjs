import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return new Response('{"age_confirmed_at":"2026-11-14T12:00:00Z"}', { status: 200 });
};

const { AGE_COPY, needsAgeGate, showAgeTick } = await import("../js/drop/age.js");
const { confirmAge } = await import("../js/drop/api.js");

test("the 13+ tick is only on create account", () => {
  assert.equal(showAgeTick("signup"), true);
  assert.equal(showAgeTick("signin"), false);
  assert.equal(showAgeTick("magic"), false);
});

test("the gate waits only when the column exists, is empty, and this sign-in asked for it", () => {
  assert.equal(needsAgeGate({ username: "ada" }, true), false);
  assert.equal(needsAgeGate({ age_confirmed_at: null }, false), false);
  assert.equal(needsAgeGate({ age_confirmed_at: null }, true), true);
  assert.equal(needsAgeGate({ age_confirmed_at: "2026-11-14T12:00:00Z" }, true), false);
  assert.equal(needsAgeGate(null, true), false);
});

test("confirming age writes only the player's own confirmation", async () => {
  calls.length = 0;
  const saved = await confirmAge({ access_token: "token" });
  assert.equal(saved.age_confirmed_at, "2026-11-14T12:00:00Z");
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/dd_confirm_age$/);
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
});

test("the delete migration is marked not to apply and skips existing accounts", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261114000200_dd_age_unconfirmed_delete.sql", import.meta.url), "utf8");
  assert.match(sql, /DO NOT APPLY/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /age_confirmed_at is not null/);
  assert.match(sql, /created_at >= ship_cutoff/);
  assert.match(sql, /2099-01-01/);
  const confirm = readFileSync(new URL("../supabase/migrations/20261114000100_dd_age_confirmed.sql", import.meta.url), "utf8");
  assert.match(confirm, /auth\.uid\(\) = id/);
  assert.match(confirm, /grant update \(age_confirmed_at\)/);
  assert.match(confirm, /dd_confirm_age/);
});
