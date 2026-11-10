import { createKit } from "../playkit.js";
import { generateBowls, bowlsSolved, bowlSums } from "../engines/bowls.js";

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

function render() {
  board.className = "board";
  board.replaceChildren();
  const row = document.createElement("div");
  row.className = "bowl-row";
  row.style.setProperty("--bowls", puzzle.bowls);
  const { sums, counts } = bowlSums(puzzle.numbers, assignment, puzzle.bowls);
  const placed = assignment.every((b) => b >= 0);
  const even = placed && sums.every((s) => s === sums[0]) && counts.every((c) => c > 0);
  for (let b = 0; b < puzzle.bowls; b++) {
    const bowl = document.createElement("div");
    bowl.className = `bowl${even ? " is-even" : ""}`;
    const name = document.createElement("p");
    name.className = "bowl-name";
    name.textContent = puzzle.bowls === 2 ? NAMES[b] : `Bowl ${b + 1}`;
    const bin = document.createElement("button");
    bin.type = "button";
    bin.className = "bowl-bin";
    bin.dataset.bowl = String(b);
    bin.setAttribute("aria-label", `${name.textContent}, total ${sums[b]}`);
    assignment.forEach((place, i) => {
      if (place !== b) return;
      bin.append(tileButton(i));
    });
    const sum = document.createElement("p");
    sum.className = "bowl-sum";
    sum.textContent = String(sums[b]);
    bowl.append(name, bin, sum);
    row.append(bowl);
  }
  const pool = document.createElement("div");
  pool.className = "pool";
  const label = document.createElement("p");
  label.textContent = "On the counter";
  const tiles = document.createElement("div");
  tiles.className = "pool-tiles";
  tiles.dataset.pool = "1";
  assignment.forEach((place, i) => {
    if (place < 0) tiles.append(tileButton(i));
  });
  pool.append(label, tiles);
  board.append(row, pool);
  if (even) kit.note("The bowls match.");
  else if (placed) kit.note("Not even yet.");
  else kit.note("Tap a number, then a bowl.");
}

function tileButton(i) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `num${i === selected ? " is-selected" : ""}`;
  btn.dataset.num = String(i);
  btn.textContent = String(puzzle.numbers[i]);
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
    kit.remember(snapshot());
    kit.addMove();
    render();
    if (bowlsSolved(puzzle, assignment)) kit.win();
  }
});

kit.onReset(start);
kit.onDiff(start);
start();
