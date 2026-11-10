export function fitCells(count, maxWidth, unit = 128) {
  const room = Math.max(32, maxWidth || unit);
  for (const scale of [1, 2, 4]) {
    const size = unit / scale;
    if (size * count <= room) return size;
  }
  return unit / 4;
}

const SAUCE = {
  10: ["straight-empty.png", "straight-filled.png"],
  5: ["straight-empty-v.png", "straight-filled-v.png"],
  6: ["corner-empty.png", "corner-filled.png"],
  12: ["corner-empty-sw.png", "corner-filled-sw.png"],
  9: ["corner-empty-nw.png", "corner-filled-nw.png"],
  3: ["corner-empty-ne.png", "corner-filled-ne.png"],
  14: ["tee-empty.png", "tee-filled.png"],
  13: ["tee-empty-w.png", "tee-filled-w.png"],
  11: ["tee-empty-n.png", "tee-filled-n.png"],
  7: ["tee-empty-e.png", "tee-filled-e.png"],
  15: ["cross-empty.png", "cross-filled.png"],
};

export function sauceFile(mask, filled) {
  const pair = SAUCE[mask];
  if (!pair) return "tile-empty.png";
  return pair[filled ? 1 : 0];
}

export function sauceUrl(mask, filled) {
  return `/assets/art/sauce/${sauceFile(mask, filled)}`;
}

const PATH = {
  ew: ["path-h-gold-alt.png", "path-h-sauce-clean.png"],
  ns: ["path-v-gold-alt.png", "path-v-sauce.png"],
  ne: ["path-corner-tr-alt.png", "path-corner-tr-sauce.png"],
  se: ["path-corner-rd.png", "path-corner-sauce-rd.png"],
  sw: ["path-corner-dl.png", "path-corner-sauce-dl.png"],
  nw: ["path-corner-lu.png", "path-corner-sauce-lu.png"],
};

export function pathFile(dirs, preview) {
  const key = [...dirs].sort().join("");
  const pair = PATH[key] || (key === "e" || key === "w" ? PATH.ew : key === "n" || key === "s" ? PATH.ns : null);
  if (!pair) return null;
  return `/assets/art/twirl/${pair[preview ? 1 : 0]}`;
}

export function toppingUrl(id) {
  const name = id === "bow" ? "farfalle" : id;
  return `/assets/art/twirl/${name}.png`;
}

const SLIP = {
  "1x1": "lasagne-1x1.png",
  "2x1": "cannelloni-2x1.png",
  "1x2": "rigatoni-1x2.png",
  "3x1": "cannelloni-3x1.png",
  "1x3": "rigatoni-1x3.png",
  "2x2": "lasagne-2x2.png",
  "3x2": "lasagne-3x2.png",
  "2x3": "lasagne-2x3.png",
};

export function slipUrl(piece) {
  if (piece.ball) return "/assets/art/slip/meatball.png";
  return `/assets/art/slip/${SLIP[`${piece.w}x${piece.h}`] || "lasagne-1x1.png"}`;
}

export function gateUrl(dir) {
  return `/assets/art/slip/gate-${String(dir || "E").toLowerCase()}.png`;
}

const REGIONS = ["region-tomato.png", "region-cheese.png", "region-basil.png", "region-cream.png", "region-pink.png", "region-apricot.png", "region-olive.png", "region-peach.png"];

export function regionUrl(index) {
  return `/assets/art/pips/${REGIONS[index % REGIONS.length]}`;
}

export function faceUrl(value) {
  const n = Math.max(0, Math.min(6, value | 0));
  return `/assets/art/pips/face-${n}.png`;
}

export function bowlUrl(count) {
  if (count <= 0) return "/assets/art/bowls/bowl-empty.png";
  if (count === 1) return "/assets/art/bowls/bowl-sauce.png";
  if (count === 2) return "/assets/art/bowls/bowl-half.png";
  return "/assets/art/bowls/bowl-full.png";
}

export function numberUrl(n) {
  return `/assets/art/bowls/number-${n}.png`;
}
