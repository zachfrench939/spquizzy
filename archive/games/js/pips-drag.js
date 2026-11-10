/**
 * Pointer dragging for Pasta Pips.
 * The board stores each domino as two adjacent cells. This module turns a
 * press into a drag, a snap, a return, or a tap, and leaves the puzzle
 * state to the caller.
 */
import { faceUrl } from "./pieces.js";

const TAP = 8;

export function swingCell(pivot, other, cols, rows) {
  const pr = Math.floor(pivot / cols);
  const pc = pivot % cols;
  const dr = Math.floor(other / cols) - pr;
  const dc = (other % cols) - pc;
  const r = pr + dc;
  const c = pc - dr;
  if (r < 0 || c < 0 || r >= rows || c >= cols) return -1;
  return r * cols + c;
}

export function nextRotation(c0, c1, v0, v1, cols, rows, blocked) {
  const dest = swingCell(c0, c1, cols, rows);
  if (dest >= 0 && dest !== c1 && !blocked(dest)) return { cells: [c0, dest], values: [v0, v1] };
  const dest2 = swingCell(c1, c0, cols, rows);
  if (dest2 >= 0 && dest2 !== c0 && !blocked(dest2)) return { cells: [c1, dest2], values: [v1, v0] };
  return { cells: [c0, c1], values: [v1, v0] };
}

export function validPairs(rows, cols, blocked) {
  const pairs = [];
  const n = rows * cols;
  for (let i = 0; i < n; i++) {
    if (blocked(i)) continue;
    const c = i % cols;
    const r = Math.floor(i / cols);
    if (c + 1 < cols && !blocked(i + 1)) pairs.push([i, i + 1]);
    if (r + 1 < rows && !blocked(i + cols)) pairs.push([i, i + cols]);
  }
  return pairs;
}

export function nearestPair(pairs, x, y, centerOf) {
  let best = null;
  for (const pair of pairs) {
    const a = centerOf(pair[0]);
    const b = centerOf(pair[1]);
    if (!a || !b) continue;
    const cx = (a.cx + b.cx) / 2;
    const cy = (a.cy + b.cy) / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (!best || dist < best.dist) best = { pair, dist, cx, cy };
  }
  return best;
}

function gridOf(container) {
  return container.querySelector(".pips-board");
}

function cellEls(container) {
  return [...(gridOf(container)?.querySelectorAll("[data-cell]") || [])];
}

function ownerOf(el) {
  const raw = el?.dataset.owner;
  if (raw == null || raw === "") return null;
  return Number(raw);
}

function dims(container) {
  const grid = gridOf(container);
  return {
    cols: Number(grid?.dataset.cols || 0),
    rows: Number(grid?.dataset.rows || 0),
  };
}

function union(els) {
  const rects = els.map((el) => el.getBoundingClientRect());
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, width: right - left, height: bottom - top };
}

function centers(container) {
  const map = new Map();
  for (const el of cellEls(container)) {
    const rect = el.getBoundingClientRect();
    map.set(Number(el.dataset.cell), {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      rect,
      el,
    });
  }
  return map;
}

function placeGhost(ghost, rect) {
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
}

function makeGhost(pips, vertical, rect) {
  const ghost = document.createElement("div");
  ghost.className = `domino-ghost${vertical ? " is-v" : ""}`;
  ghost.setAttribute("aria-hidden", "true");
  for (const pip of pips) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.className = "pixel-art";
    img.src = faceUrl(pip);
    ghost.append(img);
  }
  placeGhost(ghost, rect);
  return ghost;
}

export function bindDominoDrag(container, hooks) {
  let drag = null;
  let swallowClick = false;

  function sourcesOf(source) {
    return Array.isArray(source) ? source : [source];
  }

  function clearSnap() {
    cellEls(container).forEach((el) => el.classList.remove("is-snap"));
  }

  function blocked(exceptId) {
    return (cell) => {
      const el = cellEls(container).find((node) => Number(node.dataset.cell) === cell);
      const owner = ownerOf(el);
      return owner != null && owner !== exceptId;
    };
  }

  function classify(x, y, exceptId) {
    const { cols, rows } = dims(container);
    const grid = gridOf(container);
    if (!grid || !cols || !rows) return { type: "invalid" };
    const bounds = grid.getBoundingClientRect();
    const over = x >= bounds.left - 16 && x <= bounds.right + 16 && y >= bounds.top - 16 && y <= bounds.bottom + 16;
    const pairs = validPairs(rows, cols, blocked(exceptId));
    const map = centers(container);
    const best = nearestPair(pairs, x, y, (cell) => map.get(cell));
    if (over && best) return { type: "snap", ...best, map };
    if (drag?.kind === "board" && !over) return { type: "return" };
    return { type: "invalid" };
  }

  function follow(x, y) {
    const result = classify(x, y, drag.id);
    drag.drop = result;
    clearSnap();
    if (result.type === "snap") {
      const [a, b] = result.pair;
      const first = result.map.get(a);
      const second = result.map.get(b);
      first.el.classList.add("is-snap");
      second.el.classList.add("is-snap");
      const left = Math.min(first.rect.left, second.rect.left);
      const top = Math.min(first.rect.top, second.rect.top);
      const right = Math.max(first.rect.right, second.rect.right);
      const bottom = Math.max(first.rect.bottom, second.rect.bottom);
      drag.ghost.classList.toggle("is-v", b === a + dims(container).cols);
      placeGhost(drag.ghost, { left, top, width: right - left, height: bottom - top });
      return;
    }
    drag.ghost.classList.toggle("is-v", drag.orient === "v");
    placeGhost(drag.ghost, {
      left: x - drag.home.width / 2,
      top: y - drag.home.height / 2,
      width: drag.home.width,
      height: drag.home.height,
    });
  }

  function releaseCapture(pointerId) {
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
  }

  function dropDrag(keepGhost = false) {
    clearSnap();
    document.documentElement.classList.remove("is-pips-drag");
    if (!keepGhost) drag?.ghost?.remove();
    drag = null;
  }

  function animateBack(home, vertical, next) {
    const ghost = drag.ghost;
    dropDrag(true);
    if (!ghost) {
      next?.();
      return;
    }
    let settled = false;
    const end = () => {
      if (settled) return;
      settled = true;
      ghost.remove();
      next?.();
    };
    ghost.classList.add("is-returning");
    ghost.classList.toggle("is-v", vertical);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => placeGhost(ghost, home));
    });
    ghost.addEventListener("transitionend", end, { once: true });
    setTimeout(end, 280);
  }

  container.addEventListener("pointerdown", (event) => {
    if (drag || hooks.enabled?.() === false) return;
    if (event.button != null && event.button !== 0) return;
    const dominoBtn = event.target.closest?.("[data-domino]");
    const cellBtn = event.target.closest?.("[data-cell]");
    if (dominoBtn && container.contains(dominoBtn)) {
      const pips = [...dominoBtn.querySelectorAll("[data-pip]")].map((el) => Number(el.dataset.pip));
      if (pips.length < 2) return;
      drag = {
        kind: "tray",
        id: Number(dominoBtn.dataset.domino),
        pips,
        orient: "h",
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        home: dominoBtn.getBoundingClientRect(),
        source: dominoBtn,
        active: false,
      };
    } else if (cellBtn && container.contains(cellBtn)) {
      const id = ownerOf(cellBtn);
      if (id == null) return;
      const els = cellEls(container)
        .filter((el) => ownerOf(el) === id)
        .sort((a, b) => Number(a.dataset.cell) - Number(b.dataset.cell));
      if (els.length !== 2) return;
      const { cols } = dims(container);
      const c0 = Number(els[0].dataset.cell);
      const c1 = Number(els[1].dataset.cell);
      drag = {
        kind: "board",
        id,
        pips: els.map((el) => Number(el.querySelector("[data-pip]")?.dataset.pip)),
        orient: c1 === c0 + cols ? "v" : "h",
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        home: union(els),
        source: els,
        active: false,
      };
    } else return;
    container.setPointerCapture?.(event.pointerId);
  });

  container.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < TAP) return;
      drag.active = true;
      sourcesOf(drag.source).forEach((el) => el.classList.add("is-source"));
      drag.ghost = makeGhost(drag.pips, drag.orient === "v", drag.home);
      (container.closest("dialog") || document.body).append(drag.ghost);
      document.documentElement.classList.add("is-pips-drag");
    }
    if (event.cancelable) event.preventDefault();
    follow(event.clientX, event.clientY);
  }, { passive: false });

  function endDrag(event, cancel) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    swallowClick = true;
    releaseCapture(event.pointerId);
    if (!drag.active) {
      const current = drag;
      drag = null;
      if (current.kind === "board") hooks.onTapPlaced?.(current.id);
      else hooks.onTapTray?.(current.id);
      return;
    }
    if (!cancel) follow(event.clientX, event.clientY);
    const drop = cancel ? { type: "invalid" } : drag.drop || { type: "invalid" };
    if (drop.type === "snap") {
      const pair = drop.pair[0] < drop.pair[1] ? drop.pair : [drop.pair[1], drop.pair[0]];
      const id = drag.id;
      const pips = drag.pips.slice();
      dropDrag();
      hooks.onPlace?.(id, pair[0], pair[1], pips[0], pips[1]);
      return;
    }
    if (drop.type === "return") {
      const id = drag.id;
      const tray = container.querySelector(".tray-row")?.getBoundingClientRect();
      const home = tray
        ? {
          left: tray.left + Math.max(0, (tray.width - drag.home.width) / 2),
          top: tray.top,
          width: drag.home.width,
          height: drag.home.height,
        }
        : drag.home;
      animateBack(home, false, () => hooks.onReturn?.(id));
      return;
    }
    animateBack(drag.home, drag.orient === "v", () => hooks.onCancel?.());
  }

  container.addEventListener("pointerup", (event) => endDrag(event, false));
  container.addEventListener("pointercancel", (event) => endDrag(event, true));
  container.addEventListener("click", (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    if (event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}
