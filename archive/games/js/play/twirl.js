import { createKit } from "../playkit.js";
import { generateTwirl, twirlSolved } from "../engines/twirl.js";
import { toppingUrl, pathFile, fitCells } from "../pieces.js";

const kit = createKit("twirl");
const board = document.querySelector("#board");
let puzzle = null;
let paths = [];
let drawing = null;

function adjacent(a, b) {
  const cols = puzzle.cols;
  return Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;
}

function pairAt(cell) {
  return puzzle.pairs.findIndex((pair) => pair.a === cell || pair.b === cell);
}

function blocked(except) {
  const set = new Set();
  puzzle.pairs.forEach((pair, i) => {
    if (i === except) return;
    set.add(pair.a);
    set.add(pair.b);
    (paths[i] || []).forEach((cell) => set.add(cell));
  });
  return set;
}

function filledCount() {
  const seen = new Set();
  paths.forEach((path) => path && path.forEach((cell) => seen.add(cell)));
  return seen.size;
}

function snapshot() {
  return { paths };
}

function start() {
  puzzle = generateTwirl(kit.diff, kit.rng());
  const saved = kit.load();
  paths = puzzle.pairs.map(() => null);
  if (Array.isArray(saved?.state?.paths) && saved.state.paths.length === puzzle.pairs.length) {
    paths = saved.state.paths.map((path) => (Array.isArray(path) ? path.slice() : null));
  }
  drawing = null;
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

function render() {
  board.className = "board";
  board.replaceChildren();
  const cell = fitCells(puzzle.cols, board.parentElement?.clientWidth || 320, 128);
  const root = document.createElement("div");
  root.className = "twirl-board is-art";
  root.style.setProperty("--n", puzzle.cols);
  root.style.setProperty("--cell", `${cell}px`);
  for (let i = 0; i < puzzle.rows * puzzle.cols; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "twirl-cell";
    cell.dataset.cell = String(i);
    const owner = pairAt(i);
    if (owner >= 0) {
      const icon = document.createElement("span");
      icon.className = "top";
      icon.innerHTML = `<img class="pixel-art" alt="" src="${toppingUrl(puzzle.pairs[owner].topping)}">`;
      cell.append(icon);
      cell.setAttribute("aria-label", puzzle.pairs[owner].topping);
    } else cell.setAttribute("aria-label", "Empty square");
    if (drawing?.cells.includes(i)) cell.classList.add("is-drawing");
    root.append(cell);
  }
  board.append(root);
  applyPaths();
  const left = puzzle.rows * puzzle.cols - filledCount();
  const joined = paths.filter(Boolean).length;
  kit.note(left ? `${joined} of ${puzzle.pairs.length} pairs joined. ${left} squares open.` : "Every square is covered.");
}

function dirsOf(cell, list) {
  const cols = puzzle.cols;
  const at = list.indexOf(cell);
  if (at < 0) return [];
  const dirs = [];
  for (const next of [list[at - 1], list[at + 1]]) {
    if (next == null) continue;
    const dr = Math.floor(next / cols) - Math.floor(cell / cols);
    const dc = (next % cols) - (cell % cols);
    if (dr === -1 && dc === 0) dirs.push("n");
    if (dr === 1 && dc === 0) dirs.push("s");
    if (dc === -1 && dr === 0) dirs.push("w");
    if (dc === 1 && dr === 0) dirs.push("e");
  }
  return dirs;
}

function applyPaths() {
  const layers = new Map();
  const paint = (list, preview) => {
    if (!list || list.length < 2) return;
    for (const cell of list) {
      const file = pathFile(dirsOf(cell, list), preview);
      if (file) layers.set(cell, file);
    }
  };
  paths.forEach((path) => paint(path, false));
  if (drawing) paint(drawing.cells, true);
  board.querySelectorAll(".twirl-cell").forEach((el) => {
    const index = Number(el.dataset.cell);
    const file = layers.get(index) || "/assets/art/twirl/cell-empty.png";
    el.style.backgroundImage = `url("${file}")`;
    el.classList.toggle("is-drawing", Boolean(drawing?.cells.includes(index)));
  });
}

function paintLinks() {
  if (!board.querySelector(".twirl-cell")) {
    render();
    return;
  }
  applyPaths();
}

function cellFrom(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  const cell = el?.closest?.("[data-cell]");
  return cell ? Number(cell.dataset.cell) : null;
}

board.addEventListener("pointerdown", (event) => {
  if (kit.won) return;
  const cell = cellFrom(event);
  if (cell == null) return;
  const pair = pairAt(cell);
  if (pair < 0) return;
  paths[pair] = null;
  drawing = { pair, cells: [cell], pointer: event.pointerId };
  paintLinks();
});

window.addEventListener("pointermove", (event) => {
  if (!drawing || event.pointerId !== drawing.pointer) return;
  const cell = cellFrom(event);
  if (cell == null) return;
  const cells = drawing.cells;
  const last = cells[cells.length - 1];
  if (cell === last) return;
  if (cells.length > 1 && cell === cells[cells.length - 2]) {
    cells.pop();
    paintLinks();
    return;
  }
  if (!adjacent(last, cell) || cells.includes(cell)) return;
  const partner = drawing.cells[0] === puzzle.pairs[drawing.pair].a ? puzzle.pairs[drawing.pair].b : puzzle.pairs[drawing.pair].a;
  if (blocked(drawing.pair).has(cell) && cell !== partner) return;
  cells.push(cell);
  paintLinks();
});

function finishDraw(event) {
  if (!drawing || (event && event.pointerId !== drawing.pointer)) return;
  const { pair, cells } = drawing;
  drawing = null;
  const ends = puzzle.pairs[pair];
  const partner = cells[0] === ends.a ? ends.b : ends.a;
  if (cells.length >= 2 && cells[cells.length - 1] === partner && cells[0] !== partner) {
    paths[pair] = cells.slice();
    kit.remember(snapshot());
    kit.addMove();
    render();
    if (twirlSolved(puzzle, paths)) kit.win();
    return;
  }
  render();
  kit.note(cells.length < 2
    ? "Press a picture and drag to the matching picture."
    : "The line has to end on the matching picture.");
}

window.addEventListener("pointerup", finishDraw);
window.addEventListener("pointercancel", finishDraw);

kit.onUndo((state) => {
  if (!state?.paths) return;
  paths = state.paths.map((path) => (Array.isArray(path) ? path.slice() : null));
  drawing = null;
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
