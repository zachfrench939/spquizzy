import { createKit } from "../playkit.js";
import { generateSauce, rotateTile, traceFlow, sauceReaches, rotMask } from "../engines/sauce.js";

const kit = createKit("sauce");
const board = document.querySelector("#board");
let puzzle = null;
let tiles = [];

const ARMS = [
  ["n", 1],
  ["e", 2],
  ["s", 4],
  ["w", 8],
];

function start() {
  puzzle = generateSauce(kit.diff, kit.rng());
  const saved = kit.load();
  tiles = puzzle.tiles.map((tile) => ({ ...tile }));
  if (saved?.state?.rots?.length === tiles.length) {
    tiles = tiles.map((tile, i) => ({ ...tile, rot: saved.state.rots[i] % 4 }));
  }
  kit.setPar(puzzle.par);
  kit.begin(saved);
  kit.remember(snapshot());
  render();
}

function snapshot() {
  return { rots: tiles.map((tile) => tile.rot) };
}

function showHint() {
  if (kit.moves > 0) return false;
  try {
    return !localStorage.getItem("spquizzy.hint.v1:sauce");
  } catch {
    return false;
  }
}

function clearHint() {
  try {
    localStorage.setItem("spquizzy.hint.v1:sauce", "1");
  } catch {
    /* storage can be blocked */
  }
}

function render(flash = -1) {
  const flow = traceFlow(tiles, puzzle.rows, puzzle.cols, puzzle.pot);
  board.style.setProperty("--n", puzzle.rows);
  board.className = "board pipe-grid";
  board.style.setProperty("--n", String(puzzle.rows));
  board.replaceChildren();
  const open = sauceReaches(tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate);
  const hint = showHint() && !open;
  let hinted = false;
  tiles.forEach((tile, index) => {
    const mask = rotMask(tile.mask, tile.rot);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pipe-cell";
    btn.dataset.cell = String(index);
    btn.dataset.kind = tile.kind;
    const r = Math.floor(index / puzzle.cols) + 1;
    const c = (index % puzzle.cols) + 1;
    btn.setAttribute("aria-label", tile.fixed ? `${tile.kind} row ${r} column ${c}` : `Rotate pipe row ${r} column ${c}`);
    const sauced = flow.sauced.get(index) || 0;
    for (const [name, bit] of ARMS) {
      const arm = document.createElement("span");
      arm.className = `arm ${name}`;
      if (mask & bit) arm.classList.add("show");
      if (sauced & bit) arm.classList.add("on");
      btn.append(arm);
    }
    const hub = document.createElement("span");
    hub.className = "hub show";
    if (sauced) hub.classList.add("on");
    btn.append(hub);
    if (tile.kind !== "pipe") {
      const glyph = document.createElement("span");
      glyph.className = `glyph glyph-${tile.kind}`;
      btn.append(glyph);
    }
    if (index === flash) btn.classList.add("pop");
    if (hint && !tile.fixed && !hinted) {
      btn.classList.add("is-hint");
      hinted = true;
    }
    btn.addEventListener("click", () => turn(index));
    board.append(btn);
  });
  if (open) kit.note("The sauce reached the plate.");
  else if (hint) kit.note("Tap the pulsing pipe. Each tap turns it.");
  else kit.note("Red shows where the sauce can flow.");
}

function turn(index) {
  if (kit.won || tiles[index].fixed) return;
  if (showHint()) clearHint();
  tiles = rotateTile(tiles, index);
  kit.remember(snapshot());
  kit.addMove();
  render(index);
  if (sauceReaches(tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate)) kit.win();
}

kit.onUndo((state) => {
  if (!state?.rots) return;
  tiles = tiles.map((tile, i) => ({ ...tile, rot: state.rots[i] % 4 }));
  render();
});
kit.onReset(start);
kit.onDiff(start);
start();
