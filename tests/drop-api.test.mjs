import assert from "node:assert/strict";
import test from "node:test";

let nextResponse = new Response(null, { status: 204 });
globalThis.fetch = async () => nextResponse;

const { rpc } = await import("../js/drop/api.js");

test("rpc returns null when Supabase answers 204", async () => {
  nextResponse = new Response(null, { status: 204 });
  assert.equal(await rpc("dd_serve_guest", { p_guest: "x", p_position: 0 }, null), null);
});

test("rpc returns null when the body is empty", async () => {
  nextResponse = new Response("", { status: 200 });
  assert.equal(await rpc("dd_grade_question", {}, null), null);
});

test("rpc parses a JSON body", async () => {
  nextResponse = new Response('{"funFact":"Camels store fat."}', { status: 200 });
  assert.deepEqual(await rpc("dd_grade_question", {}, null), { funFact: "Camels store fat." });
});

test("rpc throws when the call fails", async () => {
  nextResponse = new Response("nope", { status: 400 });
  await assert.rejects(() => rpc("dd_grade_question", {}, null), /nope/);
});
