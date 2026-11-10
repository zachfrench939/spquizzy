import { createKit } from "../playkit.js";
import { generateSauce, rotateTile, traceFlow, sauceReaches, rotMask } from "../engines/sauce.js";
import { fitCells, sauceUrl } from "../pieces.js";

const kit = createKit("sauce");
const board = document.querySelector("#board");
let puzzle = null;
let tiles = [];


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
  const cell = fitCells(puzzle.cols, board.parentElement?.clientWidth || 320, 128);
  board.className = "board pipe-grid is-art";
  board.style.setProperty("--n", String(puzzle.rows));
  board.style.setProperty("--cell", `${cell}px`);
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
    const filled = Boolean(flow.sauced.get(index));
    const src = tile.kind === "pot"
      ? "/assets/art/sauce/pot.png"
      : tile.kind === "plate"
        ? "/assets/art/sauce/plate.png"
        : sauceUrl(mask, filled);
    btn.innerHTML = `<img class="pixel-art" alt="" width="${cell}" height="${cell}" src="${src}">`;
    if (tile.kind === "plate" && open) btn.classList.add("is-fed");
    if (index === flash) btn.classList.add("pop");
    if (hint && !tile.fixed && !hinted) {
      btn.classList.add("is-hint");
      hinted = true;
    }
    btn.addEventListener("click", () => turn(index));
    board.append(btn);
  });
  if (open) kit.note("The sauce reached the plate.");
  else if (hint) kit.note("Tap the pulsing pipe.");
  else if (board.querySelector(".pipe.on")) kit.note("Red shows where the sauce can flow.");
  else kit.note("Turn pipes until the red sauce leaves the pot.");
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
