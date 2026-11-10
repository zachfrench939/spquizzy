import { createKit } from "../playkit.js";
import { generateSauce, rotateTile, traceFlow, sauceReaches, rotMask } from "../engines/sauce.js";

const kit = createKit("sauce");
const board = document.querySelector("#board");
let puzzle = null;
let tiles = [];

const TILE = "/assets/pipes";
// Built sprites face these openings. rot is clockwise turns of that art.
const SHAPES = {
  10: ["straight", 0],
  5: ["straight", 1],
  12: ["corner", 0],
  9: ["corner", 1],
  3: ["corner", 2],
  6: ["corner", 3],
  14: ["tee", 0],
  13: ["tee", 1],
  11: ["tee", 2],
  7: ["tee", 3],
  15: ["cross", 0],
};
const SAUCE_CLIP = {
  1: "inset(0 31% 50% 31%)",
  2: "inset(31% 0 31% 42%)",
  4: "inset(42% 31% 0 31%)",
  8: "inset(31% 42% 31% 0)",
};

function unrot(mask, rot) {
  return rotMask(mask, (4 - (rot % 4)) % 4);
}

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
    if (tile.kind === "pot") {
      btn.innerHTML = `<img class="bg" alt="" src="${TILE}/pot.webp">`;
    } else if (tile.kind === "plate") {
      btn.innerHTML = `<img class="bg" alt="" src="${TILE}/goal.webp">`;
      if (open) btn.classList.add("is-fed");
    } else {
      const [file, rot] = SHAPES[mask] || ["straight", 0];
      const local = unrot(sauced, rot);
      const sauce = [1, 2, 4, 8]
        .filter((bit) => local & bit)
        .map((bit) => `<img class="pipe on" alt="" src="${TILE}/${file}-sauce.svg" style="clip-path:${SAUCE_CLIP[bit]}">`)
        .join("");
      btn.innerHTML = `<img class="bg" alt="" src="${TILE}/board.webp"><span class="spin" style="--turn:${rot * 90}deg"><img class="pipe" alt="" src="${TILE}/${file}.svg">${sauce}</span>`;
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
