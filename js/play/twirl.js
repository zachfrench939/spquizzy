import { createKit } from "../playkit.js";
import { generateTwirl, twirlSolved } from "../engines/twirl.js";
import { toppingSvg } from "../art.js";

const COLORS = ["#e23b2f", "#e0a82e", "#2f8f4e", "#355f78", "#e07a4c", "#8d5a32", "#c46b9a", "#1e2a2a", "#b4532a", "#3d8b8b", "#6e4324", "#d64532"];
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
  const root = document.createElement("div");
  root.className = "twirl-board";
  root.style.setProperty("--n", puzzle.cols);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "links");
  svg.setAttribute("viewBox", `0 0 ${puzzle.cols} ${puzzle.rows}`);
  const drawList = paths.map((path, i) => ({ path, i, preview: false }));
  if (drawing) drawList.push({ path: drawing.cells, i: drawing.pair, preview: true });
  for (const item of drawList) {
    if (!item.path || item.path.length < 2) continue;
    const poly = document.createElementNS(svgNS, "polyline");
    poly.setAttribute("points", item.path.map((cell) => `${(cell % puzzle.cols) + 0.5},${Math.floor(cell / puzzle.cols) + 0.5}`).join(" "));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", COLORS[item.i % COLORS.length]);
    poly.setAttribute("stroke-width", item.preview ? "0.34" : "0.42");
    poly.setAttribute("stroke-linecap", "square");
    poly.setAttribute("stroke-linejoin", "miter");
    poly.setAttribute("opacity", item.preview ? "0.75" : "1");
    svg.append(poly);
  }
  root.append(svg);
  for (let i = 0; i < puzzle.rows * puzzle.cols; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "twirl-cell";
    cell.dataset.cell = String(i);
    const owner = pairAt(i);
    if (owner >= 0) {
      const icon = document.createElement("span");
      icon.className = "top";
      icon.innerHTML = toppingSvg(puzzle.pairs[owner].topping);
      cell.append(icon);
      cell.setAttribute("aria-label", puzzle.pairs[owner].topping);
    } else cell.setAttribute("aria-label", "Empty square");
    if (drawing?.cells.includes(i)) cell.classList.add("is-drawing");
    root.append(cell);
  }
  board.append(root);
  const left = puzzle.rows * puzzle.cols - filledCount();
  kit.note(left ? `${left} squares left to fill.` : "Grid full.");
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
  render();
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
    render();
    return;
  }
  if (!adjacent(last, cell) || cells.includes(cell)) return;
  const partner = drawing.cells[0] === puzzle.pairs[drawing.pair].a ? puzzle.pairs[drawing.pair].b : puzzle.pairs[drawing.pair].a;
  if (blocked(drawing.pair).has(cell) && cell !== partner) return;
  cells.push(cell);
  render();
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
}

window.addEventListener("pointerup", finishDraw);
window.addEventListener("pointercancel", finishDraw);

kit.onReset(start);
kit.onDiff(start);
start();
