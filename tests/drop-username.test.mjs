import test from "node:test";
import assert from "node:assert/strict";
import { formatYouRank, usernameError } from "../js/drop/names.js";

test("a username is 3 to 16 letters, numbers or underscores", () => {
  assert.equal(usernameError("ada"), "");
  assert.equal(usernameError("Player_1"), "");
  assert.equal(usernameError("ab"), "Use 3 to 16 characters: letters, numbers and underscores.");
  assert.equal(usernameError("has space"), "Use 3 to 16 characters: letters, numbers and underscores.");
  assert.equal(usernameError("this_name_is_too_long"), "Use 3 to 16 characters: letters, numbers and underscores.");
});

test("a basic profanity list blocks a username", () => {
  assert.equal(usernameError("ohshit"), "Pick a different username.");
});

test("your rank stays visible when you are outside the top list", () => {
  assert.equal(formatYouRank({ rank: 123, name: "ada" }, 4567), "You: #123 of 4,567");
  assert.equal(formatYouRank({ rank: null }, 12), "You’re unranked of 12.");
  assert.equal(formatYouRank({ needsUsername: true }, 4), "Pick a username to join the board.");
});
