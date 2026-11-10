/** Crisp pixel sprites. Each character is one pixel; "." is empty. */

export const PALETTE = {
  K: "#1E2A2A",
  Y: "#F6C945",
  S: "#E0A82E",
  R: "#E23B2F",
  D: "#B42318",
  G: "#2F8F4E",
  g: "#1E6B38",
  C: "#F6ECD1",
  W: "#FFF8EA",
  B: "#A56B3C",
  b: "#6E4324",
  L: "#F3D2A6",
  N: "#E7A090",
  F: "#D5DDE6",
  P: "#1E2A2A",
  O: "#2A241E",
  M: "#C4A574",
  Q: "#F08B78",
  H: "#FFF8EA",
};

const WOMBAT_ROWS = [
  "..........HHHHHH..........",
  ".........HKKKKKKH.........",
  ".........HKYYYYKH.........",
  "..........KKKKKK..........",
  "........KKKKKKKKKK........",
  ".......KBBBBBBBBBBK.......",
  "......KBBBBBBBBBBBBK......",
  ".....KBBBWWKBBBWWBBK......",
  ".....KBBBWPKBBBWPKBK......",
  ".....KBBBBBBBBBBBBBBK.....",
  ".....KBBBBBBNNBBBBBBK.....",
  ".....KBBBBBBBBBBBBBBK.....",
  "......KBBBLLLLLLBBBK......",
  ".......KBBBBBBBBBBK.......",
  "........KKKKKKKKKK........",
  ".......KBBK....KBBK.......",
  ".......KBBK....KBBK.......",
  ".......KKKK....KKKK.......",
];

const BOWL_ROWS = [
  "..FF......................",
  "..FK..YYYYYY..............",
  "..FY.YRRRYRRY.............",
  ".FFFYYYYYYYYYY............",
  "..FY.YYYRRYYYY............",
  "..FK..YYYYYY..............",
  "....KKKKKKKKKKKKKK........",
  "...KWWWWWWWWWWWWWWK.......",
  "..KWWWWWWWWWWWWWWWWK......",
  "..KWWWWRRRYYYYWWWWWK......",
  "..KWWWWWWWWWWWWWWWWK......",
  "...KWWWWWWWWWWWWWWK.......",
  "....KKKKKKKKKKKKKK........",
  "......KKKKKKKKKK..........",
];

const ICONS = {
  sauce: [
    "................",
    "....RRRRRRR.....",
    "...RRRRRRRRR....",
    "...RRKKKKRRR....",
    "....RRRRRRR.....",
    "......YYY.......",
    "......YKY.......",
    ".....YY.YY......",
    ".....Y...Y......",
    ".....YY.YY......",
    "......YYY.......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  slip: [
    "................",
    ".RRRRRRRRRRRR...",
    ".RRRRRRRRRRRR...",
    ".RRKKKKKKKKRR...",
    ".RRRRRRRRRRRR...",
    "................",
    "......YYYY......",
    ".....YYYYYY.....",
    ".....YYKYYY.....",
    "......YYYY......",
    ".......GG.......",
    "......GGGG......",
    "................",
    "................",
    "................",
    "................",
  ],
  twirl: [
    "................",
    "...RRR....RRR...",
    "..RRRRR..RRRRR..",
    "..RRKRR..RRKRR..",
    "...RRR....RRR...",
    "....G......G....",
    "....YYYYYYYY....",
    ".........YYY....",
    ".........YYY....",
    "....YYYYYYYY....",
    "....G...........",
    "...RRR....RRR...",
    "..RRRRR..RRRRR..",
    "..RRKRR..RRKRR..",
    "...RRR....RRR...",
    "................",
  ],
  bowls: [
    "................",
    "...YYYY..YYYY...",
    "..YKKYY..YYKKY..",
    "..YYYYY..YYYYY..",
    ".KKKKKK..KKKKKK.",
    "KWWWWWWKKWWWWWWK",
    "KWWWWWWKKWWWWWWK",
    ".KWWWWKKKKWWWWK.",
    "..KKKKK..KKKKK..",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  ravioli: [
    "................",
    ".YYYYYYYYYYYYY..",
    ".YKKKKKKKKKKKY..",
    ".YKYYYYYYYYYKY..",
    ".YKYKKKKKKKYKY..",
    ".YKYYYYYYYYYKY..",
    ".YKYKKKKKKKYKY..",
    ".YKYYYYYYYYYKY..",
    ".YKKKKKKKKKKKY..",
    ".YYYYYYYYYYYYY..",
    "......GGG.......",
    ".....GGGGG......",
    "................",
    "................",
    "................",
    "................",
  ],
  pips: [
    "................",
    ".YYYYYYYYYYYYY..",
    ".YKKYYYYYYKKKY..",
    ".YKYYYYYYYYYKY..",
    ".YKYYYYYYYYYKY..",
    ".YKKKKKKKKKKKY..",
    ".YKYYYYYYYYYKY..",
    ".YKYYYYYYYYYKY..",
    ".YKKYYYYYYKKKY..",
    ".YYYYYYYYYYYYY..",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

const TOPPINGS = {
  tomato: ["...GG...", "..KKKK..", ".KRRRRK.", "KRKRRRRK", "KRRRRRRK", "KRRRRRRK", ".KRRRRK.", "..KKKK.."],
  shell: ["...KKKK.", "..KYSSSK", ".KYSYYYK", "KYSSSSYK", ".KYYYYK.", "..KYYK..", "...KK...", "........"],
  basil: [".....GG.", "...GGGGG", "..GGGGGG", ".GGGGG..", "GGG.....", ".GG.....", "..G.....", "........"],
  olive: ["........", "..KKKK..", ".KOOOOK.", "KOOKOOOK", "KOOOOOOK", "KOOOOOOK", ".KOOOOK.", "..KKKK.."],
  meatball: ["........", "..KKKK..", ".KBBBBK.", "KBKBBBBK", "KBBBBBBK", "KBBBBBBK", ".KBBBBK.", "..KKKK.."],
  cheese: ["KKKKKKK.", "KYYYYYYK", "KYYKYKYK", ".KYYYYK.", "..KYYYK.", "...KYK..", "....K...", "........"],
  pepper: ["...GG...", "..GGGG..", ".GGGGGG.", "GGGGGGG.", ".GGGGGG.", "..GGGG..", "...GG...", "....G..."],
  garlic: ["...KK...", "..KWWK..", ".KWWWWK.", "KWWKWWWK", "KWWWWWWK", ".KWWWWK.", "..KWWK..", "...KK..."],
  chili: [".....RK.", "....RRK.", "...RRRK.", "..RRRR..", ".RRRR...", "RRRK....", "RK......", "........"],
  mushroom: ["........", ".KKKKKK.", "KBBBBBBK", "KBBBBBBK", "..KWWK..", "..KWWK..", "..KWWK..", "...KK..."],
  bow: ["KK....KK", "KYY..YYK", "KYYYYYYK", "KYYKKYYK", "KYYYYYYK", "KYY..YYK", "KK....KK", "........"],
  ravioli: ["KKKKKKKK", "KYYYYYYK", "KYKKKKYK", "KYYKKYYK", "KYKKKKYK", "KYYYYYYK", "KKKKKKKK", "........"],
};

function rowsOf(value) {
  return Array.isArray(value) ? value : value.split("\n");
}

export function pixelSvg(rows, label = "") {
  const lines = rowsOf(rows).filter((row) => row.length);
  const height = lines.length;
  const width = lines[0].length;
  let body = "";
  for (let y = 0; y < height; y++) {
    if (lines[y].length !== width) {
      throw new Error(`Pixel row ${y} is ${lines[y].length}, expected ${width}`);
    }
    for (let x = 0; x < width; x++) {
      const fill = PALETTE[lines[y][x]];
      if (!fill) continue;
      body += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    }
  }
  const labelled = label
    ? ` role="img" aria-label="${label}"`
    : ` aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"${labelled}>${body}</svg>`;
}

export const SPRITES = {
  wombat: WOMBAT_ROWS,
  bowl: BOWL_ROWS,
  icons: ICONS,
};

export function wombatSvg(label = "Wombat mascot") {
  return pixelSvg(WOMBAT_ROWS, label);
}

export function bowlSvg() {
  return pixelSvg(BOWL_ROWS, "Bowl of spaghetti");
}

export function iconSvg(id) {
  return pixelSvg(ICONS[id] || ICONS.sauce, "");
}

export function toppingSvg(id) {
  return pixelSvg(TOPPINGS[id] || TOPPINGS.tomato, id);
}

export function arrowSvg(dir) {
  const map = {
    E: ["....G", "...GG", "GGGGG", "...GG", "....G"],
    W: ["G....", "GG...", "GGGGG", "GG...", "G...."],
    N: ["..G..", "..G..", "..G..", ".GGG.", "GGGGG"],
    S: ["GGGGG", ".GGG.", "..G..", "..G..", "..G.."],
  };
  return pixelSvg(map[dir] || map.E, "Exit");
}
