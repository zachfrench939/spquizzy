import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BANK_NUDGE_KEY, COPY, clearDropLocal } from "../js/drop/copy.js";
import { clearLocalAuth } from "../js/drop/auth-storage.js";
import { gradePractice, PRACTICE } from "../js/drop/practice.js";
import { playStats } from "../js/drop/stats.js";
import { shareTrail, shareTrailLabel } from "../js/drop/trail.js";

test("stats stay at zero when nothing is stored", () => {
  const stats = playStats([], "2026-11-13");
  assert.deepEqual(stats, { daysPlayed: 0, streak: 0, bestBanked: 0, spark: [] });
  assert.deepEqual(playStats(null, "2026-11-13").spark, []);
});

test("streak counts finished drops only, and only real stored days", () => {
  const days = [
    { date: "2026-11-10", banked: 40, status: "completed" },
    { date: "2026-11-11", banked: 0, status: "busted" },
    { date: "2026-11-12", banked: 0, status: "completed" },
    { date: "2026-11-13", banked: 80, status: "completed" },
  ];
  const stats = playStats(days, "2026-11-13");
  assert.equal(stats.daysPlayed, 4);
  assert.equal(stats.streak, 2);
  assert.equal(stats.bestBanked, 80);
  assert.deepEqual(stats.spark.map((day) => day.date), [
    "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
  ]);
});

test("a missed day ends the streak, and today still open keeps yesterday", () => {
  const days = [
    { date: "2026-11-10", banked: 10, status: "completed" },
    { date: "2026-11-12", banked: 20, status: "completed" },
  ];
  assert.equal(playStats(days, "2026-11-13").streak, 1);
  assert.equal(playStats(days, "2026-11-12").streak, 1);
  assert.equal(playStats([{ date: "2026-11-01", banked: 5, status: "completed" }], "2026-11-13").streak, 0);
});

test("a duplicate day is counted once and the spark never grows past ten real days", () => {
  const days = [];
  for (let n = 1; n <= 12; n += 1) {
    const day = String(n).padStart(2, "0");
    days.push({ date: `2026-10-${day}`, banked: n, status: "completed" });
  }
  days.push({ date: "2026-10-12", banked: 3, status: "forfeited" });
  const stats = playStats(days, "2026-10-12");
  assert.equal(stats.daysPlayed, 12);
  assert.equal(stats.spark.length, 10);
  assert.equal(stats.spark[0].date, "2026-10-03");
  assert.equal(stats.spark.at(-1).banked, 3);
  assert.equal(stats.streak, 11);
});

test("the share trail is ten cells and does not invent a name", () => {
  const perfect = shareTrail({ history: [100, 100, 90, 90, 80, 80, 70, 70, 60, 60, 50] });
  assert.equal(perfect.length, 10);
  assert.equal(perfect.every((cell) => cell.state === "safe"), true);
  assert.equal(perfect[9].coins, 50);
  const bust = shareTrail({ history: [100, 80, 0] });
  assert.equal(bust[0].state, "safe");
  assert.equal(bust[1].state, "dropped");
  assert.equal(bust[2].state, "missed");
  assert.equal(bust.filter((cell) => cell.state === "missed").length, 8);
  const label = shareTrailLabel(bust);
  assert.equal(label.includes("Question 2 dropped"), true);
  assert.equal(/\bname\b/i.test(label), false);
  assert.equal(shareTrail({}).length, 10);
});

test("practice is graded on this device and does not describe a network call", () => {
  const right = gradePractice([0, 40, 60, 0]);
  assert.equal(right.correct, 1);
  assert.equal(right.kept, 40);
  assert.equal(right.wiped, false);
  const wrong = gradePractice([100, 0, 0, 0]);
  assert.equal(wrong.wiped, true);
  assert.equal(PRACTICE.answers[PRACTICE.correct], "Triangle");
  const source = readFileSync(new URL("../js/drop/practice.js", import.meta.url), "utf8");
  assert.equal(source.includes("fetch"), false);
  assert.equal(source.includes("guest"), false);
  assert.equal(source.includes("localStorage"), false);
});

test("clear local data removes the bank-nudge key and the keep-me-logged-in choice", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  storage.setItem(BANK_NUDGE_KEY, "2026-11-13");
  storage.setItem("spquizzy.drop.run", "{}");
  storage.setItem("spquizzy.drop.bank", "{}");
  storage.setItem("spquizzy.drop.settings", "{}");
  storage.setItem("dd_remember", "1");
  storage.setItem("spquizzy.drop.session", "token");
  clearDropLocal(storage);
  clearLocalAuth(storage, storage);
  assert.equal(storage.getItem(BANK_NUDGE_KEY), null);
  assert.equal(storage.getItem("spquizzy.drop.run"), null);
  assert.equal(storage.getItem("spquizzy.drop.bank"), null);
  assert.equal(storage.getItem("spquizzy.drop.settings"), null);
  assert.equal(storage.getItem("dd_remember"), null);
  assert.equal(storage.getItem("spquizzy.drop.session"), null);
  const cookies = readFileSync(new URL("../cookies/index.html", import.meta.url), "utf8");
  assert.equal(cookies.includes("spquizzy.drop.bank-nudge</code> — Remembers the date we last showed the note about saving your bank, so you see it at most once a day. Stays on this device and is never sent to us. Removed by Clear local data. Needed for the site to work, so no consent is needed."), true);
  assert.equal(cookies.includes(COPY.clearLocal), true);
});

test("the streak is only a stored count", () => {
  const files = ["../js/drop/copy.js", "../js/drop/stats.js", "../js/drop/app.js", "../docs/round9-WORDING.md"];
  const banned = ["lose your streak", "streak reward", "streak freeze", "streak notification"];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8").toLowerCase();
    for (const phrase of banned) assert.equal(source.includes(phrase), false, `${file} ${phrase}`);
  }
});

test("the wording doc quotes the cleared lines and the new storage key", () => {
  const doc = readFileSync(new URL("../docs/round9-WORDING.md", import.meta.url), "utf8");
  for (const line of [
    COPY.nudge,
    COPY.nudgeYes,
    COPY.nudgeNo,
    COPY.plus,
    COPY.coinsLine,
    COPY.archive,
    COPY.leagueEmpty,
    COPY.leagueEmptySigned,
    COPY.leagueGuest,
    COPY.realName,
    COPY.pitch,
    COPY.seeYou,
    COPY.how1,
    COPY.how2,
    COPY.how3,
    BANK_NUDGE_KEY,
  ]) {
    assert.equal(doc.includes(line), true, line);
  }
  assert.equal(doc.includes("Ad-free play"), false);
  assert.equal(doc.includes("Skip ads"), false);
  assert.equal(doc.includes("Bet your coins"), false);
});
