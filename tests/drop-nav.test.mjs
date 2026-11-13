import assert from "node:assert/strict";
import test from "node:test";
import { navAction } from "../js/drop/nav.js";

test("header and home buttons navigate", () => {
  assert.deepEqual(navAction("league"), { type: "go", href: "/leagues/" });
  assert.deepEqual(navAction("settings"), { type: "go", href: "/settings/" });
  assert.deepEqual(navAction("howto"), { type: "howto" });
  assert.deepEqual(navAction("play"), { type: "go", href: "/play/" });
  assert.deepEqual(navAction("home"), { type: "go", href: "/" });
  assert.deepEqual(navAction("bank"), { type: "go", href: "/bank/" });
  assert.deepEqual(navAction("profile"), { type: "go", href: "/profile/" });
  assert.deepEqual(navAction("signin"), { type: "go", href: "/sign-in/" });
  assert.deepEqual(navAction("plus"), { type: "go", href: "/plus/" });
  assert.deepEqual(navAction("missing"), { type: "go", href: "/404.html" });
  assert.deepEqual(navAction("archive"), { type: "go", href: "/archive/" });
  assert.deepEqual(navAction("practice"), { type: "practice" });
});

test("leaving an open run asks before going home", () => {
  assert.deepEqual(navAction("home", { inPlay: true }), { type: "leave" });
  assert.deepEqual(navAction("league", { inPlay: true }), { type: "go", href: "/leagues/" });
});

test("an unknown data-nav value does not navigate", () => {
  assert.deepEqual(navAction(""), { type: "none" });
  assert.deepEqual(navAction("nope"), { type: "none" });
});
