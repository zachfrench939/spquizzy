import { createKit } from "../playkit.js";
import { generateBowls, bowlsSolved, bowlSums } from "../engines/bowls.js";
import { bowlUrl, numberUrl, fitCells } from "../pieces.js";

const NAMES = ["Left", "Right", "Middle"];
const kit = createKit("bowls");
const board = document.querySelector("#board");
let puzzle = null;
let assignment = [];
let selected = -1;

function snapshot() {
  return { assignment: assignment.slice() };
}

function start() {
  puzzle = generateBowls(kit.diff, kit.rng());
  const saved = kit.load();
  assignment = puzzle.numbers.map(() => -1);
  if (Array.isArray(saved?.state?.assignment) && saved.state.assignment.length === puzzle.numbers.length) {
    assignment = saved.state.assignment.map((b) => (Number.isInteger(b) && b >= -1 && b < puzzle.bowls ? b : -1));
  }
  selected = -1;
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

let hintOn = false;
document.querySelector("#hint")?.addEventListener("click", () => {
  hintOn = true;
  render();
});

function showHint() {
  if (!hintOn || kit.moves > 0) return false;
  try {
    return !localStorage.getItem("spquizzy.hint.v1:bowls");
  } catch {
    return false;
  }
}

function clearHint() {
  try {
    localStorage.setItem("spquizzy.hint.v1:bowls", "1");
  } catch {
    /* storage can be blocked */
  }
}

function render() {
  board.className = "board";
  board.replaceChildren();
  const rule = document.querySelector("#rule");
  if (rule) rule.textContent = `Make each bowl add up to ${puzzle.target}.`;
  const bowlPx = fitCells(puzzle.bowls, (board.parentElement?.clientWidth || 320) - 16, 256);
  const row = document.createElement("div");
  row.className = "bowl-row is-art";
  row.style.setProperty("--bowls", puzzle.bowls);
  row.style.setProperty("--bowl", `${bowlPx}px`);
  const { sums, counts } = bowlSums(puzzle.numbers, assignment, puzzle.bowls);
  const placed = assignment.every((b) => b >= 0);
  const even = placed && sums.every((s) => s === sums[0]) && counts.every((c) => c > 0);
  const hint = showHint();
  const firstFree = assignment.findIndex((place) => place < 0);
  for (let b = 0; b < puzzle.bowls; b++) {
    const bowl = document.createElement("div");
    bowl.className = `bowl${even ? " is-even" : ""}`;
    const name = document.createElement("p");
    name.className = "bowl-name";
    name.textContent = puzzle.bowls === 2 ? NAMES[b] : `Bowl ${b + 1}`;
    const bin = document.createElement("button");
    bin.type = "button";
    bin.className = "bowl-bin is-art";
    if (hint && selected >= 0) bin.classList.add("is-hint");
    bin.dataset.bowl = String(b);
    bin.setAttribute("aria-label", `${name.textContent}, total ${sums[b]}`);
    const art = document.createElement("img");
    art.className = "pixel-art bowl-pic";
    art.alt = "";
    art.src = bowlUrl(counts[b]);
    const chips = document.createElement("span");
    chips.className = "bowl-chips";
    assignment.forEach((place, i) => {
      if (place !== b) return;
      chips.append(tileButton(i, false));
    });
    bin.append(art, chips);
    const sum = document.createElement("p");
    sum.className = "bowl-sum";
    sum.textContent = `Total ${sums[b]}`;
    bowl.append(name, bin, sum);
    row.append(bowl);
  }
  const pool = document.createElement("div");
  pool.className = "pool";
  const label = document.createElement("p");
  label.textContent = "Numbers left";
  const tiles = document.createElement("div");
  tiles.className = "pool-tiles";
  tiles.dataset.pool = "1";
  assignment.forEach((place, i) => {
    if (place < 0) tiles.append(tileButton(i, hint && selected < 0 && i === firstFree));
  });
  pool.append(label, tiles);
  board.append(row, pool);
  if (even) kit.note("The totals match.");
  else if (placed) kit.note("Those totals do not match yet. Tap a number to move it.");
  else if (selected >= 0) kit.note("Now tap a bowl.");
  else kit.note(`Each bowl adds up to ${puzzle.target}.`);
}

function tileButton(i, hint) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `num is-art${i === selected ? " is-selected" : ""}${hint ? " is-hint" : ""}`;
  btn.dataset.num = String(i);
  btn.textContent = "";
  const art = document.createElement("img");
  art.className = "pixel-art";
  art.alt = String(puzzle.numbers[i]);
  art.src = numberUrl(puzzle.numbers[i]);
  btn.append(art);
  btn.setAttribute("aria-pressed", i === selected ? "true" : "false");
  return btn;
}

board.addEventListener("click", (event) => {
  if (kit.won) return;
  const num = event.target.closest("[data-num]");
  if (num) {
    const i = Number(num.dataset.num);
    if (selected === i) {
      if (assignment[i] >= 0) assignment[i] = -1;
      selected = -1;
      kit.remember(snapshot());
    } else selected = i;
    render();
    return;
  }
  const bowl = event.target.closest("[data-bowl]");
  if (bowl && selected >= 0) {
    const b = Number(bowl.dataset.bowl);
    if (assignment[selected] === b) return;
    assignment[selected] = b;
    selected = -1;
    if (showHint()) clearHint();
    kit.remember(snapshot());
    kit.addMove();
    render();
    if (bowlsSolved(puzzle, assignment)) kit.win();
  }
});

kit.onUndo((state) => {
  if (!state?.assignment) return;
  assignment = state.assignment.slice();
  selected = -1;
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
