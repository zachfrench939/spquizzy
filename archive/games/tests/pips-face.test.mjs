import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../css/site.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, selector);
  return css.slice(start, css.indexOf("}", start));
}

test("a placed art face fills its cell instead of the old inset grid", () => {
  const face = block(".face.is-art {");
  assert.match(face, /display:\s*block/);
  assert.match(face, /width:\s*100%/);
  assert.match(face, /height:\s*100%/);
  assert.match(face, /right:\s*auto/);
  assert.doesNotMatch(face, /grid-template-columns/);
});

test("horizontal link rules no longer squeeze the face between left and right", () => {
  const links = block(".region-cell.is-art.link-e .face.is-art,");
  assert.match(links, /right:\s*auto/);
  assert.match(links, /left:\s*0/);
  const east = block(".region-cell.is-art.link-e .face.is-art {");
  assert.match(east, /width:\s*calc\(100% \+ 2px\)/);
});
