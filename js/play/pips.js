import { createKit } from "../playkit.js";
import { generatePips, pipsSolved, regionStates, constraintLabel } from "../engines/pips.js";
import { faceUrl, regionUrl, fitCells } from "../pieces.js";

const COLORS = ["#f08a6a", "#f6c945", "#8fd19a", "#f6ecd1", "#f0a0b8", "#e0a45a", "#b7d36a", "#f0b27a", "#e08a72", "#9ec6e6"];
const DOTS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8],
};

const kit = createKit("pips");
const board = document.querySelector("#board");
let puzzle = null;
let values = [];
let owners = [];
let selected = null;
let flipped = false;
let anchor = null;

function snapshot() {
  return { values: values.slice(), owners: owners.slice() };
}

function domino(id) {
  return puzzle.dominoes.find((item) => item.id === id);
}

function adjacent(a, b) {
  const cols = puzzle.cols;
  return Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;
}

function remaining() {
  const used = new Set(owners.filter((id) => id != null));
  return puzzle.dominoes.filter((item) => !used.has(item.id));
}

function validSave(state) {
  if (!state || !Array.isArray(state.values) || state.values.length !== puzzle.rows * puzzle.cols) return false;
  if (!Array.isArray(state.owners) || state.owners.length !== state.values.length) return false;
  const seen = new Map();
  for (let i = 0; i < state.owners.length; i++) {
    const id = state.owners[i];
    if (id == null) {
      if (state.values[i] != null) return false;
      continue;
    }
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id).push(i);
  }
  for (const [id, cells] of seen) {
    if (cells.length !== 2 || !adjacent(cells[0], cells[1])) return false;
    const tile = domino(id);
    if (!tile) return false;
    const pips = cells.map((c) => state.values[c]).sort();
    if (pips[0] !== tile.a || pips[1] !== tile.b) return false;
  }
  return true;
}

function start() {
  puzzle = generatePips(kit.diff, kit.rng());
  const saved = kit.load();
  values = Array(puzzle.rows * puzzle.cols).fill(null);
  owners = Array(puzzle.rows * puzzle.cols).fill(null);
  if (validSave(saved?.state)) {
    values = saved.state.values.slice();
    owners = saved.state.owners.slice();
  }
  selected = null;
  flipped = false;
  anchor = null;
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

function face(value) {
  const img = document.createElement("img");
  img.className = "pixel-art pip-face";
  img.alt = "";
  img.src = faceUrl(value);
  return img;
}

function render() {
  board.className = "board pips-layout";
  board.replaceChildren();
  const cell = fitCells(puzzle.cols, board.parentElement?.clientWidth || 320, 128);
  const grid = document.createElement("div");
  grid.className = "pips-board is-art";
  grid.style.setProperty("--cols", puzzle.cols);
  grid.style.setProperty("--cell", `${cell}px`);
  const states = regionStates(puzzle, values);
  const labelAt = new Map();
  puzzle.regions.forEach((region, index) => {
    const cell = region.cells.slice().sort((a, b) => a - b)[0];
    labelAt.set(cell, { text: constraintLabel(region), index });
  });
  for (let i = 0; i < values.length; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "region-cell";
    cell.dataset.cell = String(i);
    const regionId = puzzle.regionIds[i];
    cell.classList.add("is-art");
    cell.style.backgroundImage = `url("${regionUrl(regionId)}")`;
    const state = states[regionId];
    if (state.filled) cell.classList.add(state.ok ? "is-good" : "is-bad");
    if (anchor === i) cell.classList.add("is-anchor");
    if (labelAt.has(i)) {
      const rule = document.createElement("span");
      rule.className = "rule";
      rule.textContent = labelAt.get(i).text;
      cell.append(rule);
    }
    if (values[i] != null) {
      const pip = document.createElement("span");
      pip.className = "face is-art";
      pip.append(face(values[i]));
      const cols = puzzle.cols;
      if (owners[i] != null && owners[i + 1] === owners[i] && i % cols !== cols - 1) cell.classList.add("link-e");
      if (owners[i] != null && owners[i - 1] === owners[i] && i % cols !== 0) cell.classList.add("link-w");
      if (owners[i] != null && owners[i + cols] === owners[i]) cell.classList.add("link-s");
      if (owners[i] != null && owners[i - cols] === owners[i]) cell.classList.add("link-n");
      cell.append(pip);
      cell.setAttribute("aria-label", `Pip ${values[i]}`);
    } else cell.setAttribute("aria-label", "Empty square");
    grid.append(cell);
  }
  const tray = document.createElement("div");
  tray.className = "tray-row";
  tray.setAttribute("aria-label", "Dominoes");
  for (const item of remaining()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `domino-btn is-art${item.id === selected ? " is-selected" : ""}`;
    btn.dataset.domino = String(item.id);
    const first = item.id === selected && flipped ? item.b : item.a;
    const second = item.id === selected && flipped ? item.a : item.b;
    btn.append(face(first), face(second));
    btn.setAttribute("aria-label", `Domino ${item.a} ${item.b}`);
    tray.append(btn);
  }
  board.append(grid, tray);
  const left = remaining().length;
  const ready = states.filter((region) => region.ok).length;
  kit.note(left ? `${left} dominoes left. ${ready} of ${puzzle.regions.length} areas are correct.` : "Check every colored area.");
}

function lift(cell) {
  const id = owners[cell];
  if (id == null) return;
  owners.forEach((owner, i) => {
    if (owner === id) {
      owners[i] = null;
      values[i] = null;
    }
  });
  selected = id;
  flipped = false;
  anchor = null;
  kit.remember(snapshot());
}

function place(a, b) {
  const tile = domino(selected);
  const first = flipped ? tile.b : tile.a;
  const second = flipped ? tile.a : tile.b;
  values[a] = first;
  values[b] = second;
  owners[a] = tile.id;
  owners[b] = tile.id;
  selected = null;
  flipped = false;
  anchor = null;
  kit.remember(snapshot());
  kit.addMove();
  render();
  if (pipsSolved(puzzle, values)) kit.win();
}

board.addEventListener("click", (event) => {
  if (kit.won) return;
  const dominoBtn = event.target.closest("[data-domino]");
  if (dominoBtn) {
    const id = Number(dominoBtn.dataset.domino);
    if (selected === id) flipped = !flipped;
    else {
      selected = id;
      flipped = false;
    }
    anchor = null;
    render();
    return;
  }
  const cellBtn = event.target.closest("[data-cell]");
  if (!cellBtn) return;
  const cell = Number(cellBtn.dataset.cell);
  if (owners[cell] != null) {
    lift(cell);
    render();
    return;
  }
  if (selected == null) {
    kit.toast("Pick a domino first");
    return;
  }
  if (anchor == null) {
    anchor = cell;
    render();
    return;
  }
  if (anchor === cell) {
    anchor = null;
    render();
    return;
  }
  if (!adjacent(anchor, cell) || owners[cell] != null) {
    anchor = cell;
    render();
    return;
  }
  place(anchor, cell);
});

kit.onUndo((state) => {
  if (!state?.values || !state?.owners) return;
  values = state.values.slice();
  owners = state.owners.slice();
  selected = null;
  anchor = null;
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
