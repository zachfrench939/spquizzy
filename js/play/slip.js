import { createKit } from "../playkit.js";
import { generateSlip, slidePiece, ballOnExit, clonePieces } from "../engines/slip.js";
import { arrowSvg } from "../art.js";

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
  board.replaceChildren();
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

function face(p, i) {
  if (p.ball) return `<span class="body meat"><img class="sprite" alt="" src="/assets/food/meatball.webp"></span>`;
  if (p.w > 1 && p.h > 1) return `<span class="body ravi"><img class="sprite" alt="" src="/assets/food/ravioli.webp"></span>`;
  if (p.h > p.w || p.w > p.h) return `<span class="body tube"><img class="sprite" alt="" src="/assets/food/penne.webp"></span>`;
  return `<span class="body lasagna"><img class="sprite" alt="" src="/assets/food/lasagna.webp"></span>`;
}

function paintPiece(el, p, i) {
  const hint = showHint();
  el.className = `piece${p.ball ? " ball" : ""}${i === selected ? " is-selected" : ""}${hint && i === selected ? " is-hint" : ""}${i === flash ? " pop" : ""}`;
  el.style.left = `${(p.c / puzzle.cols) * 100}%`;
  el.style.top = `${(p.r / puzzle.rows) * 100}%`;
  el.style.width = `${(p.w / puzzle.cols) * 100}%`;
  el.style.height = `${(p.h / puzzle.rows) * 100}%`;
  el.setAttribute("aria-pressed", i === selected ? "true" : "false");
}

function render() {
  const grid = board.querySelector(".slip-grid");
  if (!grid || grid.querySelectorAll(".piece").length !== pieces.length) build();
  else sync();
  const out = ballOnExit(pieces, puzzle.exit);
  const hint = showHint();
  const pad = board.querySelector(".move-pad");
  if (pad) pad.classList.toggle("is-hint", hint);
  if (out) kit.note("The meatball reached the green exit gate.");
  else if (hint && pieces[selected]?.ball) kit.note("The meatball is selected. Tap an arrow to slide it one square.");
  else if (hint) kit.note("This block can move. Tap an arrow to slide it one square.");
  else kit.note("Tap a block, then an arrow.");
}

function build() {
  board.className = "board";
  board.replaceChildren();
  const root = document.createElement("div");
  root.className = "slip-board";
  const frame = document.createElement("div");
  frame.className = "slip-frame";
  frame.style.setProperty("--cols", puzzle.cols);
  frame.style.setProperty("--rows", puzzle.rows);
  frame.style.setProperty("--er", puzzle.exit.r);
  frame.style.setProperty("--ec", puzzle.exit.c);
  const grid = document.createElement("div");
  grid.className = "slip-grid";
  grid.style.setProperty("--cols", puzzle.cols);
  grid.style.setProperty("--rows", puzzle.rows);
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      grid.append(slot);
    }
  }
  pieces.forEach((p, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset.piece = String(i);
    el.innerHTML = face(p, i);
    el.setAttribute("aria-label", p.ball ? "Meatball" : `Pasta block ${i}`);
    paintPiece(el, p, i);
    grid.append(el);
  });
  const pad = document.createElement("div");
  pad.className = "move-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "Slide the selected block one square");
  pad.innerHTML = `
    <button type="button" data-dir="N" aria-label="Up">↑</button>
    <button type="button" data-dir="W" aria-label="Left">←</button>
    <button type="button" data-dir="E" aria-label="Right">→</button>
    <button type="button" data-dir="S" aria-label="Down">↓</button>`;
  const gate = document.createElement("div");
  gate.className = `exit-gate dir-${puzzle.exit.dir}`;
  gate.innerHTML = `<span class="glow">${arrowSvg(puzzle.exit.dir)}</span>`;
  gate.setAttribute("aria-label", "Green exit gate");
  frame.append(grid, gate);
  root.append(frame, pad);
  board.append(root);
}

function sync() {
  pieces.forEach((p, i) => {
    const el = board.querySelector(`[data-piece="${i}"]`);
    if (el) paintPiece(el, p, i);
  });
}

function tryMove(index, dir, maxSteps) {
  if (kit.won) return false;
  const moved = slidePiece(pieces, puzzle.rows, puzzle.cols, index, dir, maxSteps);
  if (!moved) {
    kit.note("That way is blocked. Try another arrow, or tap a different block.");
    kit.shake();
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

kit.onUndo((state) => {
  if (!state?.pieces) return;
  pieces = pieces.map((p, i) => ({ ...p, r: state.pieces[i].r, c: state.pieces[i].c }));
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
