import { createKit } from "../playkit.js";
import { generateRavioli, matchWord } from "../engines/ravioli.js";
import { fitCells } from "../pieces.js";

const kit = createKit("ravioli");
const board = document.querySelector("#board");
let puzzle = null;
let locked = [];
let selected = null;

function key(a, b) {
  return [a, b].sort().join("|");
}

function snapshot() {
  return { locked: locked.map((pair) => pair.slice()) };
}

function start() {
  puzzle = generateRavioli(kit.diff, kit.rng());
  const saved = kit.load();
  locked = [];
  if (Array.isArray(saved?.state?.locked)) {
    locked = saved.state.locked.filter((pair) => Array.isArray(pair) && matchWord(puzzle.words, pair[0], pair[1]));
  }
  selected = null;
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

function isLocked(half) {
  return locked.some((pair) => pair.includes(half));
}

function halfButton(half, lockedHalf, side) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `half is-art side-${side}${lockedHalf ? " is-locked" : ""}${selected === half ? " is-selected" : ""}`;
  btn.dataset.half = half;
  btn.disabled = Boolean(lockedHalf);
  btn.setAttribute("aria-pressed", selected === half ? "true" : "false");
  const scale = half.length >= 5 ? 0.11 : 0.15;
  btn.innerHTML = `<img class="pixel-art" alt="" src="/assets/art/ravioli/half-${side}${lockedHalf ? "-basil" : ""}.png"><span class="ravioli-word" style="font-size:calc(var(--half, 64px) * ${scale})">${half}</span>`;
  return btn;
}

function render() {
  board.className = "board";
  board.replaceChildren();
  const loose = puzzle.tiles.filter((half) => !isLocked(half));
  const width = fitCells(Math.min(4, Math.max(2, loose.length)), board.parentElement?.clientWidth || 320, 128);
  const grid = document.createElement("div");
  grid.className = "half-grid is-art";
  grid.style.setProperty("--half", `${width}px`);
  for (const half of loose) {
    grid.append(halfButton(half, false, grid.childElementCount % 2 ? "right" : "left"));
  }
  const words = document.createElement("div");
  words.className = "word-list is-art";
  for (const pair of locked) {
    const found = matchWord(puzzle.words, pair[0], pair[1]);
    const joined = document.createElement("div");
    joined.className = "ravioli-joined";
    joined.append(halfButton(pair[0], true, "left"), halfButton(pair[1], true, "right"));
    joined.setAttribute("aria-label", found?.word || `${pair[0]} ${pair[1]}`);
    words.append(joined);
  }
  board.append(words, grid);
  if (selected) kit.note(`${selected} is selected. Tap the half that finishes the word.`);
  else kit.note(`${puzzle.words.length - locked.length} words still to make.`);
}

board.addEventListener("click", (event) => {
  if (kit.won) return;
  const btn = event.target.closest("[data-half]");
  if (!btn || btn.disabled) return;
  const half = btn.dataset.half;
  if (!selected) {
    selected = half;
    render();
    return;
  }
  if (selected === half) {
    selected = null;
    render();
    return;
  }
  const match = matchWord(puzzle.words, selected, half);
  const already = locked.some((pair) => key(pair[0], pair[1]) === key(selected, half));
  if (match && !already) {
    locked.push([selected, half]);
    selected = null;
    kit.remember(snapshot());
    kit.addMove();
    render();
    if (locked.length === puzzle.words.length) kit.win();
    return;
  }
  selected = null;
  kit.remember(snapshot());
  kit.addMove();
  render();
  board.querySelector(`[data-half="${half}"]`)?.classList.add("shake");
  const miss = "Those halves do not make one of today's words.";
  kit.announce(miss);
  kit.note(miss);
});

kit.onUndo((state) => {
  if (!state?.locked) return;
  locked = state.locked.map((pair) => pair.slice());
  selected = null;
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
