import { createKit } from "../playkit.js";
import { generateSlip, slidePiece, ballOnExit, clonePieces } from "../engines/slip.js";
import { arrowSvg } from "../art.js";

const COLORS = ["#e23b2f", "#f08b78", "#c0392b", "#e7c07a", "#f3d2b5", "#b85c38", "#8c2f39", "#d98a4b"];
const kit = createKit("slip");
const board = document.querySelector("#board");
let puzzle = null;
let pieces = [];
let selected = 0;
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
  selected = 0;
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
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
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "slot";
      slot.dataset.r = String(r);
      slot.dataset.c = String(c);
      if (r === puzzle.exit.r && c === puzzle.exit.c) {
        slot.classList.add("is-exit");
        slot.innerHTML = arrowSvg(puzzle.exit.dir);
        slot.setAttribute("aria-label", "Exit");
      } else slot.setAttribute("aria-label", `Empty square row ${r + 1} column ${c + 1}`);
      grid.append(slot);
    }
  }
  pieces.forEach((p, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `piece${p.ball ? " ball" : ""}${i === selected ? " is-selected" : ""}`;
    el.dataset.piece = String(i);
    el.style.setProperty("--c", p.c + 1);
    el.style.setProperty("--r", p.r + 1);
    el.style.setProperty("--w", p.w);
    el.style.setProperty("--h", p.h);
    el.innerHTML = `<span class="body" style="--fill:${p.ball ? "#f6c945" : COLORS[(i - 1) % COLORS.length]}"></span>`;
    el.setAttribute("aria-label", p.ball ? "Meatball" : `Lasagne tray ${i}`);
    grid.append(el);
  });
  root.append(grid);
  board.append(root);
  const out = ballOnExit(pieces, puzzle.exit);
  kit.note(out ? "The meatball is on the arrow." : "Drag a tray toward an empty square.");
}

function tryMove(index, dir, maxSteps) {
  if (kit.won) return false;
  const moved = slidePiece(pieces, puzzle.rows, puzzle.cols, index, dir, maxSteps);
  if (!moved) return false;
  pieces = moved.pieces;
  selected = index;
  kit.remember(snapshot());
  kit.addMove();
  render();
  if (ballOnExit(pieces, puzzle.exit)) kit.win();
  return true;
}

function stepSize() {
  const a = board.querySelector('[data-r="0"][data-c="0"]');
  const b = board.querySelector('[data-r="0"][data-c="1"]');
  const c = board.querySelector('[data-r="1"][data-c="0"]');
  const ar = a.getBoundingClientRect();
  return {
    x: b.getBoundingClientRect().x - ar.x,
    y: c.getBoundingClientRect().y - ar.y,
  };
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
  if (Math.hypot(dx, dy) < 12) return;
  suppressUntil = performance.now() + 350;
  const step = stepSize();
  if (Math.abs(dx) > Math.abs(dy)) tryMove(id, dx > 0 ? "E" : "W", Math.max(1, Math.round(Math.abs(dx) / step.x)));
  else tryMove(id, dy > 0 ? "S" : "N", Math.max(1, Math.round(Math.abs(dy) / step.y)));
});

board.addEventListener("click", (event) => {
  if (performance.now() < suppressUntil) return;
  const piece = event.target.closest("[data-piece]");
  if (piece) {
    selected = Number(piece.dataset.piece);
    render();
    return;
  }
  const slot = event.target.closest("[data-r]");
  if (!slot || selected == null) return;
  const tr = Number(slot.dataset.r);
  const tc = Number(slot.dataset.c);
  const p = pieces[selected];
  const vert = tr >= p.r && tr < p.r + p.h;
  const horiz = tc >= p.c && tc < p.c + p.w;
  if (vert && tc >= p.c + p.w) tryMove(selected, "E", tc - (p.c + p.w) + 1);
  else if (vert && tc < p.c) tryMove(selected, "W", p.c - tc);
  else if (horiz && tr >= p.r + p.h) tryMove(selected, "S", tr - (p.r + p.h) + 1);
  else if (horiz && tr < p.r) tryMove(selected, "N", p.r - tr);
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
