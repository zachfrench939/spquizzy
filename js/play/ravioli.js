import { createKit } from "../playkit.js";
import { generateRavioli, matchWord } from "../engines/ravioli.js";

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

function render() {
  board.className = "board";
  board.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "half-grid";
  for (const half of puzzle.tiles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "half";
    btn.dataset.half = half;
    btn.dataset.len = String(half.length);
    btn.textContent = half;
    btn.setAttribute("aria-pressed", selected === half ? "true" : "false");
    if (selected === half) btn.classList.add("is-selected");
    if (isLocked(half)) {
      btn.classList.add("is-locked");
      btn.disabled = true;
      const tick = document.createElement("span");
      tick.className = "tick";
      btn.append(tick);
    }
    grid.append(btn);
  }
  const words = document.createElement("div");
  words.className = "word-list";
  for (const pair of locked) {
    const found = matchWord(puzzle.words, pair[0], pair[1]);
    const chip = document.createElement("span");
    chip.textContent = found.word;
    words.append(chip);
  }
  board.append(grid, words);
  kit.note(`${puzzle.words.length - locked.length} words still to make.`);
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
  kit.announce("Those halves do not make one of today's words.");
  render();
  board.querySelector(`[data-half="${half}"]`)?.classList.add("shake");
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
