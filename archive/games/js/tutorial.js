import { rotMask, traceFlow, sauceReaches } from "./engines/sauce.js";
import { slidePiece } from "./engines/slip.js";
import { sauceUrl, slipUrl, gateUrl, toppingUrl, pathFile, bowlUrl, numberUrl, faceUrl, regionUrl } from "./pieces.js";
import { bindDominoDrag, nextRotation } from "./pips-drag.js";

const TILE = "/assets/pipes";
const SHAPES = {
  10: ["straight", 0], 5: ["straight", 1],
  12: ["corner", 0], 9: ["corner", 1], 3: ["corner", 2], 6: ["corner", 3],
  14: ["tee", 0], 13: ["tee", 1], 11: ["tee", 2], 7: ["tee", 3],
  15: ["cross", 0],
};
const SAUCE_CLIP = {
  1: "inset(-6% 27% 48% 27%)",
  2: "inset(27% -6% 27% 48%)",
  4: "inset(48% 27% -6% 27%)",
  8: "inset(27% 48% 27% -6%)",
};
const PIP_DOTS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8],
};
const PIP_COLORS = ["#f08a6a", "#f6c945", "#8fd19a", "#f6ecd1"];

function unrot(mask, rot) {
  return rotMask(mask, (4 - (rot % 4)) % 4);
}

function spoutTurn(mask) {
  if (mask & 2) return 0;
  if (mask & 4) return 90;
  if (mask & 8) return 180;
  if (mask & 1) return 270;
  return 0;
}

function inletTurn(mask) {
  if (mask & 8) return 0;
  if (mask & 1) return 90;
  if (mask & 2) return 180;
  if (mask & 4) return 270;
  return 0;
}

function shake(root) {
  root.classList.remove("is-shake");
  void root.offsetWidth;
  root.classList.add("is-shake");
}

function note(root, text) {
  let line = root.querySelector(".how-status");
  if (!line) {
    line = document.createElement("p");
    line.className = "how-status";
    root.append(line);
  }
  line.textContent = text || "";
}

function cheer(root, onSolved) {
  const wombat = document.querySelector("#how .how-wombat");
  if (wombat) {
    wombat.src = "/assets/wombat/cheering.webp";
    wombat.alt = "Wombat cheering";
  }
  note(root, "That’s it");
  document.querySelector("#how-done")?.classList.add("is-ready");
  onSolved?.();
}

function facePips(value) {
  const img = document.createElement("img");
  img.className = "pixel-art pip-face";
  img.alt = "";
  img.draggable = false;
  img.dataset.pip = String(value);
  img.src = faceUrl(value);
  return img;
}

function numberTile(index, numbers, selected, interactive) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = `num is-art${selected === index ? " is-selected" : ""}`;
  tile.dataset.num = String(index);
  tile.disabled = !interactive;
  tile.innerHTML = `<img class="pixel-art" alt="${numbers[index]}" src="${numberUrl(numbers[index])}">`;
  return tile;
}

function mountSauce(root, { interactive, solved, onSolved }) {
  const rows = 1;
  const cols = 3;
  let rot = solved ? 0 : 1;
  let done = false;
  const pot = 0;
  const plate = 2;
  const paint = () => {
    const tiles = [
      { mask: 2, rot: 0, kind: "pot" },
      { mask: 10, rot, kind: "pipe" },
      { mask: 8, rot: 0, kind: "plate" },
    ];
    const flow = traceFlow(tiles, rows, cols, pot);
    const open = sauceReaches(tiles, rows, cols, pot, plate);
    const grid = document.createElement("div");
    grid.className = "pipe-grid is-art tutorial-sauce";
    grid.style.setProperty("--n", String(cols));
    grid.style.setProperty("--cell", "64px");
    tiles.forEach((tile, index) => {
      const mask = rotMask(tile.mask, tile.rot);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pipe-cell";
      btn.dataset.kind = tile.kind;
      const filled = Boolean(flow.sauced.get(index));
      const src = tile.kind === "pot"
        ? "/assets/art/sauce/pot.png"
        : tile.kind === "plate"
          ? "/assets/art/sauce/plate.png"
          : sauceUrl(mask, filled);
      btn.innerHTML = `<img class="pixel-art" alt="" src="${src}">`;
      if (tile.kind === "pot") {
        btn.setAttribute("aria-label", "Pot");
        btn.disabled = true;
      } else if (tile.kind === "plate") {
        btn.setAttribute("aria-label", "Plate");
        btn.disabled = true;
        if (open) btn.classList.add("is-fed");
      } else {
        btn.setAttribute("aria-label", "Turn the middle pipe");
        btn.disabled = !interactive;
        if (interactive) {
          btn.addEventListener("click", () => {
            rot = (rot + 1) % 4;
            paint();
          });
        }
      }
      grid.append(btn);
    });
    const status = root.querySelector(".how-status");
    root.replaceChildren(grid);
    if (status) root.append(status);
    if (open) {
      if (!done) {
        done = true;
        if (interactive) cheer(root, onSolved);
        else note(root, "That’s it");
      } else note(root, "That’s it");
    } else if (interactive) note(root, "Tap the middle pipe.");
  };
  paint();
}

function mountSlip(root, { interactive, solved, onSolved }) {
  const rows = 3;
  const cols = 3;
  const exit = { r: 1, c: 2, dir: "E" };
  let pieces = solved
    ? [{ r: 1, c: 2, w: 1, h: 1, ball: true }, { r: 0, c: 0, w: 1, h: 1, ball: false }]
    : [{ r: 1, c: 1, w: 1, h: 1, ball: true }, { r: 0, c: 0, w: 1, h: 1, ball: false }];
  let selected = 0;
  let done = false;
  const paint = () => {
    const board = document.createElement("div");
    board.className = "slip-board";
    const frame = document.createElement("div");
    frame.className = "slip-frame is-art";
    frame.style.setProperty("--cell", "48px");
    frame.style.setProperty("--cols", cols);
    frame.style.setProperty("--rows", rows);
    frame.style.setProperty("--er", exit.r);
    frame.style.setProperty("--ec", exit.c);
    const grid = document.createElement("div");
    grid.className = "slip-grid";
    grid.style.setProperty("--cols", cols);
    grid.style.setProperty("--rows", rows);
    for (let i = 0; i < rows * cols; i++) {
      const slot = document.createElement("div");
      slot.className = "slot is-art";
      grid.append(slot);
    }
    pieces.forEach((piece, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `piece${piece.ball ? " ball" : ""}${index === selected ? " is-selected" : ""}`;
      el.style.left = `${(piece.c / cols) * 100}%`;
      el.style.top = `${(piece.r / rows) * 100}%`;
      el.style.width = `${(1 / cols) * 100}%`;
      el.style.height = `${(1 / rows) * 100}%`;
      el.innerHTML = `<span class="body art-piece"><img class="pixel-art" alt="" src="${slipUrl(piece)}"></span>`;
      el.setAttribute("aria-label", piece.ball ? "Meatball" : "Lasagne block");
      el.disabled = !interactive;
      el.addEventListener("click", () => {
        selected = index;
        paint();
      });
      grid.append(el);
    });
    const gate = document.createElement("div");
    gate.className = "exit-gate is-art dir-E";
    gate.innerHTML = `<img class="pixel-art" alt="" src="${gateUrl("E")}">`;
    gate.setAttribute("aria-label", "Green exit gate");
    frame.append(grid, gate);
    const pad = document.createElement("div");
    pad.className = "move-pad";
    pad.setAttribute("role", "group");
    pad.setAttribute("aria-label", "Slide the selected block one square");
    for (const [dir, label] of [["N", "Up"], ["W", "Left"], ["E", "Right"], ["S", "Down"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.dir = dir;
      button.setAttribute("aria-label", label);
      const glyph = document.createElement("img");
      glyph.className = "pixel-art";
      glyph.alt = "";
      glyph.width = 21;
      glyph.height = 21;
      glyph.src = `/assets/art/slip/chevron-${dir.toLowerCase()}.svg`;
      button.append(glyph);
      button.disabled = !interactive;
      button.addEventListener("click", () => {
        const moved = slidePiece(pieces, rows, cols, selected, dir, 1);
        if (!moved) {
          shake(root);
          note(root, "That square is blocked.");
          return;
        }
        pieces = moved.pieces;
        paint();
      });
      pad.append(button);
    }
    board.append(frame, pad);
    const status = root.querySelector(".how-status");
    root.replaceChildren(board);
    if (status) root.append(status);
    const onGate = pieces[0].r === exit.r && pieces[0].c === exit.c;
    if (onGate && !done) {
      done = true;
      if (interactive) cheer(root, onSolved);
      else note(root, "That’s it");
    } else if (!onGate) note(root, interactive ? "Slide the meatball toward the gate." : "");
  };
  paint();
}

function mountTwirl(root, { interactive, solved, onSolved }) {
  const cols = 3;
  const garlic = [0, 6];
  const basil = [2, 8];
  const tops = { 0: "garlic", 6: "garlic", 2: "basil", 8: "basil" };
  const paths = solved ? [[0, 3, 6], [2, 5, 8]] : [null, null];
  let drawing = null;
  let done = false;
  const pairAt = (cell) => (garlic.includes(cell) ? 0 : basil.includes(cell) ? 1 : -1);
  const blocked = (except) => {
    const set = new Set();
    [garlic, basil].forEach((pair, index) => {
      if (index === except) return;
      pair.forEach((cell) => set.add(cell));
      (paths[index] || []).forEach((cell) => set.add(cell));
    });
    return set;
  };
  const board = document.createElement("div");
  board.className = "twirl-board is-art";
  board.style.setProperty("--n", cols);
  board.style.setProperty("--cell", "56px");
  for (let cell = 0; cell < 9; cell++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "twirl-cell";
    button.dataset.cell = String(cell);
    if (tops[cell]) {
        button.innerHTML = `<span class="top"><img class="pixel-art" alt="" src="${toppingUrl(tops[cell])}"></span>`;
      button.setAttribute("aria-label", tops[cell]);
    } else button.setAttribute("aria-label", "Empty square");
    button.disabled = !interactive;
    board.append(button);
  }
  root.replaceChildren(board);
  const drawLines = () => {
    const layers = new Map();
    const paint = (list, preview) => {
      if (!list || list.length < 2) return;
      list.forEach((cell, at) => {
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
        const file = pathFile(dirs, preview);
        if (file) layers.set(cell, file);
      });
    };
    paths.forEach((path) => paint(path, false));
    if (drawing) paint(drawing, true);
    board.querySelectorAll(".twirl-cell").forEach((button) => {
      const index = Number(button.dataset.cell);
      const file = layers.get(index) || "/assets/art/twirl/cell-empty.png";
      button.style.backgroundImage = `url("${file}")`;
    });
  };
  const finishCheck = () => {
    if (paths[0] && !done) {
      done = true;
      if (interactive) cheer(root, onSolved);
      else note(root, "That’s it");
    } else if (!paths[0] && interactive) note(root, "Drag from one garlic to the other.");
    else if (paths[0] && !interactive) note(root, "That’s it");
  };
  drawLines();
  finishCheck();
  if (!interactive) return;
  const cellAt = (event) => {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const button = hit?.closest?.(".twirl-cell");
    return button ? Number(button.dataset.cell) : -1;
  };
  const extend = (cell) => {
    if (!drawing || cell < 0) return;
    const pair = pairAt(drawing[0]);
    const last = drawing[drawing.length - 1];
    if (cell === last) return;
    if (cell === drawing[drawing.length - 2]) {
      drawing.pop();
      drawLines();
      return;
    }
    const neighbour = Math.abs(Math.floor(cell / cols) - Math.floor(last / cols)) + Math.abs((cell % cols) - (last % cols)) === 1;
    if (!neighbour || drawing.includes(cell) || blocked(pair).has(cell)) return;
    const other = pairAt(cell);
    if (other >= 0 && other !== pair) return;
    drawing.push(cell);
    const goal = pair === 0 ? garlic : basil;
    if (cell === goal.find((item) => item !== drawing[0])) {
      paths[pair] = drawing.slice();
      drawing = null;
      finishCheck();
    }
    drawLines();
  };
  board.addEventListener("pointerdown", (event) => {
    const cell = cellAt(event);
    const pair = pairAt(cell);
    if (pair < 0 || paths[pair]) return;
    drawing = [cell];
    board.setPointerCapture?.(event.pointerId);
    drawLines();
  });
  board.addEventListener("pointermove", (event) => extend(cellAt(event)));
  board.addEventListener("pointerup", () => {
    if (!drawing) return;
    const pair = pairAt(drawing[0]);
    const goal = pair === 0 ? garlic : basil;
    const end = drawing[drawing.length - 1];
    const start = drawing[0];
    drawing = null;
    if (!goal.includes(end) || end === start) shake(root);
    drawLines();
  });
}

function mountBowls(root, { interactive, solved, onSolved }) {
  const numbers = [2, 3, 5];
  let assignment = solved ? [0, 0, 1] : [-1, -1, -1];
  let selected = -1;
  let done = false;
  const paint = () => {
    const sums = [0, 0];
    assignment.forEach((bowl, index) => {
      if (bowl >= 0) sums[bowl] += numbers[index];
    });
    const row = document.createElement("div");
    row.className = "bowl-row is-art";
    row.style.setProperty("--bowls", "2");
    row.style.setProperty("--bowl", "112px");
    ["Left", "Right"].forEach((name, bowl) => {
      const wrap = document.createElement("div");
      wrap.className = "bowl";
      const title = document.createElement("p");
      title.className = "bowl-name";
      title.textContent = name;
      const bin = document.createElement("button");
      bin.type = "button";
      bin.className = "bowl-bin is-art";
      bin.dataset.bowl = String(bowl);
      bin.setAttribute("aria-label", `${name}, total ${sums[bowl]}`);
      bin.disabled = !interactive;
      const count = assignment.filter((place) => place === bowl).length;
      bin.innerHTML = `<img class="pixel-art bowl-pic" alt="" src="${bowlUrl(count)}">`;
      const chips = document.createElement("span");
      chips.className = "bowl-chips";
      assignment.forEach((place, index) => {
        if (place !== bowl) return;
        chips.append(numberTile(index, numbers, selected, interactive));
      });
      bin.append(chips);
      const sum = document.createElement("p");
      sum.className = "bowl-sum";
      sum.textContent = `Total ${sums[bowl]}`;
      wrap.append(title, bin, sum);
      row.append(wrap);
    });
    const pool = document.createElement("div");
    pool.className = "pool";
    const label = document.createElement("p");
    label.textContent = "Each bowl adds up to 5.";
    const tiles = document.createElement("div");
    tiles.className = "pool-tiles";
    assignment.forEach((place, index) => {
      if (place >= 0) return;
      tiles.append(numberTile(index, numbers, selected, interactive));
    });
    pool.append(label, tiles);
    const status = root.querySelector(".how-status");
    root.replaceChildren(row, pool);
    if (status) root.append(status);
    const matched = assignment.every((bowl) => bowl >= 0) && sums[0] === 5 && sums[1] === 5;
    if (interactive) {
      root.querySelectorAll("[data-num]").forEach((button) => {
        button.addEventListener("click", () => {
          selected = Number(button.dataset.num);
          paint();
        });
      });
      root.querySelectorAll("[data-bowl]").forEach((button) => {
        button.addEventListener("click", () => {
          if (selected < 0) return;
          assignment[selected] = Number(button.dataset.bowl);
          selected = -1;
          paint();
        });
      });
    }
    if (matched && !done) {
      done = true;
      if (interactive) cheer(root, onSolved);
      else note(root, "That’s it");
    } else if (!matched && assignment.every((bowl) => bowl >= 0)) {
      note(root, "Those totals do not match.");
      shake(root);
    } else if (!matched) note(root, interactive ? "Tap a number, then a bowl." : "");
  };
  paint();
}

function mountRavioli(root, { interactive, solved, onSolved }) {
  const halves = ["SUN", "FLOWER", "RAIN", "BOW"];
  const word = (a, b) => {
    const key = [a, b].sort().join("|");
    return key === "FLOWER|SUN" ? "SUNFLOWER" : "";
  };
  let locked = solved ? [["SUN", "FLOWER"]] : [];
  let selected = null;
  let done = false;
  const paint = () => {
    const grid = document.createElement("div");
    grid.className = "half-grid is-art";
    grid.style.setProperty("--half", "72px");
    const joined = document.createElement("div");
    joined.className = "word-list is-art";
    for (const pair of locked) {
      const row = document.createElement("div");
      row.className = "ravioli-joined";
      pair.forEach((half, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "half is-art is-locked";
        button.disabled = true;
        const side = index === 0 ? "left" : "right";
        const scale = half.length >= 5 ? 0.11 : 0.15;
        button.innerHTML = `<img class="pixel-art" alt="" src="/assets/art/ravioli/half-${side}-basil.png"><span class="ravioli-word" style="font-size:calc(var(--half, 64px) * ${scale})">${half}</span>`;
        row.append(button);
      });
      joined.append(row);
    }
    for (const [index, half] of halves.entries()) {
      if (locked.some((pair) => pair.includes(half))) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "half is-art";
      button.dataset.half = half;
      const side = index % 2 ? "right" : "left";
      const scale = half.length >= 5 ? 0.11 : 0.15;
      button.innerHTML = `<img class="pixel-art" alt="" src="/assets/art/ravioli/half-${side}.png"><span class="ravioli-word" style="font-size:calc(var(--half, 64px) * ${scale})">${half}</span>`;
      if (selected === half) button.classList.add("is-selected");
      button.disabled = button.disabled || !interactive;
      button.addEventListener("click", () => {
        if (!selected) {
          selected = half;
          paint();
          return;
        }
        if (selected === half) {
          selected = null;
          paint();
          return;
        }
        const made = word(selected, half);
        if (!made) {
          selected = null;
          shake(root);
          note(root, "Those halves do not make a word.");
          paint();
          return;
        }
        locked.push([selected, half]);
        selected = null;
        paint();
      });
      grid.append(button);
    }
    const status = root.querySelector(".how-status");
    root.replaceChildren(joined, grid);
    if (status) root.append(status);
    if (locked.length && !done) {
      done = true;
      if (interactive) cheer(root, onSolved);
      else note(root, "That’s it");
    } else if (!locked.length) note(root, interactive ? "Tap SUN, then FLOWER." : "");
  };
  paint();
}

function mountPips(root, { interactive, solved, onSolved }) {
  const cols = 2;
  const regions = [
    { cells: [0, 1], type: "sum", n: 3 },
    { cells: [2, 3], type: "sum", n: 3 },
  ];
  const regionIds = [0, 0, 1, 1];
  const dominoes = [
    { id: 0, a: 1, b: 2 },
    { id: 1, a: 0, b: 6 },
  ];
  let values = solved ? [1, 2, null, null] : [null, null, null, null];
  let owners = solved ? [0, 0, null, null] : [null, null, null, null];
  let selected = null;
  let flipped = false;
  let anchor = null;
  let done = false;
  const label = (region) => `Add to ${region.n}`;
  const regionOk = (region) => {
    const vals = region.cells.map((cell) => values[cell]);
    if (vals.some((value) => value == null)) return null;
    return vals.reduce((sum, value) => sum + value, 0) === region.n;
  };
  const paint = () => {
    const grid = document.createElement("div");
    grid.className = "pips-board is-art";
    grid.dataset.cols = String(cols);
    grid.dataset.rows = "2";
    grid.style.setProperty("--cols", cols);
    grid.style.setProperty("--cell", "56px");
    for (let cell = 0; cell < 4; cell++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "region-cell is-art";
      button.dataset.cell = String(cell);
      button.dataset.owner = owners[cell] == null ? "" : String(owners[cell]);
      button.style.backgroundImage = `url("${regionUrl(regionIds[cell])}")`;
      const region = regions[regionIds[cell]];
      const ok = regionOk(region);
      if (ok === true) button.classList.add("is-good");
      if (ok === false) button.classList.add("is-bad");
      if (anchor === cell) button.classList.add("is-anchor");
      if (cell === region.cells[0]) {
        const rule = document.createElement("span");
        rule.className = "rule";
        rule.textContent = label(region);
        button.append(rule);
      }
      if (values[cell] != null) {
        const pip = document.createElement("span");
        pip.className = "face is-art";
        pip.append(facePips(values[cell]));
        if (owners[cell] != null && owners[cell + 1] === owners[cell] && cell % cols !== cols - 1) button.classList.add("link-e");
        if (owners[cell] != null && owners[cell - 1] === owners[cell] && cell % cols !== 0) button.classList.add("link-w");
        button.append(pip);
        button.setAttribute("aria-label", `Pip ${values[cell]}`);
      } else button.setAttribute("aria-label", "Empty square");
      button.disabled = !interactive;
      grid.append(button);
    }
    const tray = document.createElement("div");
    tray.className = "tray-row";
    const used = new Set(owners.filter((id) => id != null));
    for (const item of dominoes) {
      if (used.has(item.id)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `domino-btn is-art${item.id === selected ? " is-selected" : ""}`;
      button.dataset.domino = String(item.id);
      const first = item.id === selected && flipped ? item.b : item.a;
      const second = item.id === selected && flipped ? item.a : item.b;
      button.append(facePips(first), facePips(second));
      button.setAttribute("aria-label", `Domino ${item.a} and ${item.b}`);
      button.disabled = !interactive;
      tray.append(button);
    }
    const status = root.querySelector(".how-status");
    root.replaceChildren(grid, tray);
    if (status) root.append(status);
    if (!interactive) {
      if (regionOk(regions[0])) note(root, "That’s it");
      return;
    }
    const top = regionOk(regions[0]);
    const bottom = regionOk(regions[1]);
    if ((top || bottom) && !done) {
      done = true;
      cheer(root, onSolved);
    } else if (top === false || bottom === false) note(root, "That area is full, but it does not add to 3.");
    else note(root, "Drag 1 and 2 onto Add to 3.");
  };
  const clearId = (id) => {
    owners.forEach((owner, index) => {
      if (owner === id) {
        owners[index] = null;
        values[index] = null;
      }
    });
  };
  bindDominoDrag(root, {
    enabled: () => interactive && !done,
    onTapTray(id) {
      if (selected === id) flipped = !flipped;
      else {
        selected = id;
        flipped = false;
      }
      anchor = null;
      paint();
    },
    onTapPlaced(id) {
      const cells = [];
      owners.forEach((owner, index) => {
        if (owner === id) cells.push(index);
      });
      cells.sort((a, b) => a - b);
      if (cells.length !== 2) return;
      const [c0, c1] = cells;
      const next = nextRotation(c0, c1, values[c0], values[c1], cols, 2, (cell) => owners[cell] != null && owners[cell] !== id);
      clearId(id);
      next.cells.forEach((cell, index) => {
        owners[cell] = id;
        values[cell] = next.values[index];
      });
      selected = null;
      anchor = null;
      paint();
    },
    onPlace(id, a, b, head, tail) {
      clearId(id);
      values[a] = head;
      values[b] = tail;
      owners[a] = id;
      owners[b] = id;
      selected = null;
      flipped = false;
      anchor = null;
      paint();
    },
    onReturn(id) {
      clearId(id);
      selected = id;
      flipped = false;
      anchor = null;
      paint();
    },
    onCancel: paint,
  });
  root.addEventListener("click", (event) => {
    if (!interactive || done || event.detail !== 0) return;
    const dominoBtn = event.target.closest("[data-domino]");
    if (dominoBtn) {
      const id = Number(dominoBtn.dataset.domino);
      if (selected === id) flipped = !flipped;
      else {
        selected = id;
        flipped = false;
      }
      anchor = null;
      paint();
      return;
    }
    const cellBtn = event.target.closest("[data-cell]");
    if (!cellBtn) return;
    const cell = Number(cellBtn.dataset.cell);
    if (owners[cell] != null) {
      const id = owners[cell];
      clearId(id);
      selected = id;
      flipped = false;
      anchor = null;
      paint();
      return;
    }
    if (selected == null) {
      note(root, "Pick a domino first.");
      return;
    }
    if (anchor == null) {
      anchor = cell;
      paint();
      return;
    }
    const neighbour = Math.abs(Math.floor(anchor / cols) - Math.floor(cell / cols)) + Math.abs((anchor % cols) - (cell % cols)) === 1;
    if (!neighbour || owners[cell] != null) {
      anchor = cell;
      paint();
      return;
    }
    const tile = dominoes.find((item) => item.id === selected);
    values[anchor] = flipped ? tile.b : tile.a;
    values[cell] = flipped ? tile.a : tile.b;
    owners[anchor] = tile.id;
    owners[cell] = tile.id;
    selected = null;
    flipped = false;
    anchor = null;
    paint();
  });
  paint();
}

const MOUNTS = {
  sauce: mountSauce,
  slip: mountSlip,
  twirl: mountTwirl,
  bowls: mountBowls,
  ravioli: mountRavioli,
  pips: mountPips,
};

export function mountTutorial(root, id, options = {}) {
  if (!root || !MOUNTS[id]) return;
  root.classList.add("how-stage", `how-stage-${id}`);
  MOUNTS[id](root, options);
}
