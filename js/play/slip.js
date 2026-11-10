import { createKit } from "../playkit.js";
import { generateSlip, slidePiece, ballOnExit, clonePieces } from "../engines/slip.js";
import { arrowSvg } from "../art.js";

const COLORS = ["#f08a6a", "#7eb6d6", "#8fbf8a", "#d7a0c4", "#f2c14e", "#c4b49a", "#e07a4c", "#9aa5b1"];
const kit = createKit("slip");
const board = document.querySelector("#board");
let puzzle = null;
let pieces = [];
let selected = 0;
let flash = -1;
let drag = null;
let suppressUntil = 0;

function valid(list) {
  if (!list || list.length !== puzzle.pieces.length) return false;
  const occ = new Uint8Array(puzzle.rows * puzzle.cols);
  for (let i = 0; i < list.length; i++) {
    const p = puzzle.pieces[i];
    const r = list[i].r;
    const c = list[i].c;
    if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
    if (r < 0 || c < 0 || r + p.h > puzzle.rows || c + p.w > puzzle.cols) return false;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const cell = (r + y) * puzzle.cols + (c + x);
        if (occ[cell]) return false;
        occ[cell] = 1;
      }
    }
  }
  return true;
}

function snapshot() {
  return { pieces: pieces.map((p) => ({ r: p.r, c: p.c })) };
}

function start() {
  puzzle = generateSlip(kit.diff, kit.rng());
  const saved = kit.load();
  pieces = clonePieces(puzzle.pieces);
  if (valid(saved?.state?.pieces)) {
    pieces = pieces.map((p, i) => ({ ...p, r: saved.state.pieces[i].r, c: saved.state.pieces[i].c }));
  }
  selected = canMove(0) ? 0 : Math.max(0, pieces.findIndex((_, i) => canMove(i)));
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

function canMove(index) {
  return ["N", "E", "S", "W"].some((dir) => slidePiece(pieces, puzzle.rows, puzzle.cols, index, dir, 1));
}

function showHint() {
  if (kit.moves > 0) return false;
  try {
    return !localStorage.getItem("spquizzy.hint.v1:slip");
  } catch {
    return false;
  }
}

function clearHint() {
  try {
    localStorage.setItem("spquizzy.hint.v1:slip", "1");
  } catch {
    /* storage can be blocked */
  }
}

function render() {
  board.className = "board";
  board.replaceChildren();
  const root = document.createElement("div");
  root.className = "slip-board";
  const grid = document.createElement("div");
  grid.className = "slip-grid";
  grid.style.setProperty("--cols", puzzle.cols);
  grid.style.setProperty("--rows", puzzle.rows);
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      if (r === puzzle.exit.r && c === puzzle.exit.c) {
        slot.classList.add("is-exit");
        slot.innerHTML = arrowSvg(puzzle.exit.dir);
        slot.setAttribute("aria-label", "Green arrow. Put the yellow ball here.");
      }
      grid.append(slot);
    }
  }
  const hint = showHint();
  const hintIndex = hint ? selected : -1;
  pieces.forEach((p, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `piece${p.ball ? " ball" : ""}${i === selected ? " is-selected" : ""}${i === hintIndex ? " is-hint" : ""}${i === flash ? " pop" : ""}`;
    el.dataset.piece = String(i);
    el.style.setProperty("--c", p.c + 1);
    el.style.setProperty("--r", p.r + 1);
    el.style.setProperty("--w", p.w);
    el.style.setProperty("--h", p.h);
    el.innerHTML = `<span class="body" style="--fill:${p.ball ? "#f6c945" : COLORS[(i - 1) % COLORS.length]}"></span>`;
    el.setAttribute("aria-label", p.ball ? "Yellow ball" : `Block ${i}`);
    el.setAttribute("aria-pressed", i === selected ? "true" : "false");
    grid.append(el);
  });
  const pad = document.createElement("div");
  pad.className = `move-pad${hint ? " is-hint" : ""}`;
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "Slide the selected block one square");
  pad.innerHTML = `
    <button type="button" data-dir="N" aria-label="Up">↑</button>
    <button type="button" data-dir="W" aria-label="Left">←</button>
    <button type="button" data-dir="E" aria-label="Right">→</button>
    <button type="button" data-dir="S" aria-label="Down">↓</button>`;
  root.append(grid, pad);
  board.append(root);
  const out = ballOnExit(pieces, puzzle.exit);
  if (out) kit.note("The yellow ball is on the green arrow.");
  else if (hint && pieces[selected]?.ball) kit.note("The yellow ball is selected. Tap an arrow to slide it one square.");
  else if (hint) kit.note("This block can move. Tap an arrow to slide it one square.");
  else kit.note("Tap a block, then an arrow.");
}

function tryMove(index, dir, maxSteps) {
  if (kit.won) return false;
  const moved = slidePiece(pieces, puzzle.rows, puzzle.cols, index, dir, maxSteps);
  if (!moved) {
    kit.note("That way is blocked. Try another arrow, or tap a different block.");
    return false;
  }
  if (showHint()) clearHint();
  pieces = moved.pieces;
  selected = index;
  flash = index;
  kit.remember(snapshot());
  kit.addMove();
  render();
  if (ballOnExit(pieces, puzzle.exit)) kit.win();
  return true;
}

board.addEventListener("pointerdown", (event) => {
  const piece = event.target.closest("[data-piece]");
  if (!piece || kit.won) return;
  drag = {
    id: Number(piece.dataset.piece),
    x: event.clientX,
    y: event.clientY,
    pointer: event.pointerId,
  };
  piece.setPointerCapture?.(event.pointerId);
});

window.addEventListener("pointerup", (event) => {
  if (!drag || event.pointerId !== drag.pointer) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const id = drag.id;
  drag = null;
  if (Math.hypot(dx, dy) < 18) return;
  suppressUntil = performance.now() + 350;
  if (Math.abs(dx) > Math.abs(dy)) tryMove(id, dx > 0 ? "E" : "W", 1);
  else tryMove(id, dy > 0 ? "S" : "N", 1);
});

board.addEventListener("click", (event) => {
  const dir = event.target.closest("[data-dir]");
  if (dir && selected != null) {
    tryMove(selected, dir.dataset.dir, 1);
    return;
  }
  if (performance.now() < suppressUntil) return;
  const piece = event.target.closest("[data-piece]");
  if (!piece) return;
  selected = Number(piece.dataset.piece);
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, dialog")) return;
  const dir = { ArrowUp: "N", ArrowDown: "S", ArrowLeft: "W", ArrowRight: "E" }[event.key];
  if (!dir || selected == null) return;
  event.preventDefault();
  tryMove(selected, dir, 1);
});

kit.onReset(start);
kit.onDiff(start);
start();
