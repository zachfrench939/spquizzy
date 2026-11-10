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

function render() {
  const flow = traceFlow(tiles, puzzle.rows, puzzle.cols, puzzle.pot);
  board.style.setProperty("--n", puzzle.rows);
  board.className = "board pipe-grid";
  board.style.setProperty("--n", String(puzzle.rows));
  board.replaceChildren();
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
      else if (flow.reached.has(index) && mask & bit) arm.classList.add("leak");
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
    btn.addEventListener("click", () => turn(index));
    board.append(btn);
  });
  const open = sauceReaches(tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate);
  kit.note(open ? "The sauce made it." : "Sauce is still looking for the plate.");
}

function turn(index) {
  if (kit.won || tiles[index].fixed) return;
  tiles = rotateTile(tiles, index);
  kit.remember(snapshot());
  kit.addMove();
  render();
  if (sauceReaches(tiles, puzzle.rows, puzzle.cols, puzzle.pot, puzzle.plate)) kit.win();
}

kit.onReset(start);
kit.onDiff(start);
start();
