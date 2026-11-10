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

function cleanSvg(body, label = "", view = "0 0 32 32") {
  const labelled = label ? ` role="img" aria-label="${label}"` : ` aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"${labelled}>${body}</svg>`;
}

const CLEAN_ICONS = {
  sauce: `<rect x="6" y="14" width="20" height="11" rx="3" fill="#e23b2f"/><rect x="4" y="11" width="24" height="4" rx="2" fill="#b42318"/><path d="M16 11V6h9" fill="none" stroke="#e0a82e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  slip: `<rect x="3" y="9" width="14" height="14" rx="3" fill="#f08a6a"/><circle cx="24" cy="16" r="6" fill="#f6c945"/>`,
  twirl: `<circle cx="8" cy="16" r="5" fill="#e23b2f"/><circle cx="24" cy="16" r="5" fill="#e23b2f"/><path d="M13 16h6" stroke="#e23b2f" stroke-width="3" stroke-linecap="round"/>`,
  bowls: `<path d="M3 12h12v5a6 6 0 0 1-12 0z" fill="#f6c945" stroke="#1e2a2a" stroke-width="1.6"/><path d="M17 12h12v5a6 6 0 0 1-12 0z" fill="#fff" stroke="#1e2a2a" stroke-width="1.6"/>`,
  ravioli: `<rect x="3" y="9" width="12" height="14" rx="3" fill="#f6c945"/><rect x="17" y="9" width="12" height="14" rx="3" fill="#fff" stroke="#e0a82e" stroke-width="1.6"/>`,
  pips: `<rect x="3" y="9" width="26" height="14" rx="3" fill="#f6c945"/><path d="M16 11v10" stroke="#1e2a2a" stroke-width="1.4"/><circle cx="9" cy="16" r="1.7" fill="#1e2a2a"/><circle cx="23" cy="13.5" r="1.7" fill="#1e2a2a"/><circle cx="23" cy="18.5" r="1.7" fill="#1e2a2a"/>`,
};

const CLEAN_TOPPINGS = {
  tomato: `<circle cx="16" cy="18" r="8" fill="#e23b2f"/><path d="M16 9c1.5 2.2 3.2 2.4 5 1.4" fill="none" stroke="#2f8f4e" stroke-width="2" stroke-linecap="round"/>`,
  shell: `<path d="M7 22c1-9 17-9 18 0H7z" fill="#f6c945"/>`,
  basil: `<ellipse cx="16" cy="16" rx="6" ry="10" fill="#2f8f4e" transform="rotate(-28 16 16)"/>`,
  olive: `<ellipse cx="16" cy="16" rx="7" ry="9" fill="#355f78"/><ellipse cx="16" cy="16" rx="2.2" ry="3.2" fill="#f6ecd1"/>`,
  meatball: `<circle cx="16" cy="16" r="8" fill="#a56b3c"/>`,
  cheese: `<path d="M8 24 16 7l8 17H8z" fill="#f6c945"/>`,
  pepper: `<path d="M16 5 27 16 16 27 5 16Z" fill="#2f8f4e"/>`,
  garlic: `<circle cx="16" cy="18" r="7" fill="#fff" stroke="#1e2a2a" stroke-width="1.4"/><path d="M16 6v5" stroke="#2f8f4e" stroke-width="2" stroke-linecap="round"/>`,
  chili: `<path d="M12 24c6-2 10-8 12-16-5 1-9 6-12 16z" fill="#e23b2f"/>`,
  mushroom: `<path d="M6 17a10 8 0 0 1 20 0z" fill="#c47a4a"/><rect x="13" y="16" width="6" height="8" rx="2" fill="#f3d2a6"/>`,
  bow: `<path d="M6 16c3-6 6-6 10 0 4-6 7-6 10 0-3 6-6 6-10 0-4 6-7 6-10 0z" fill="#f0b7c4"/>`,
  ravioli: `<rect x="8" y="8" width="16" height="16" rx="3" fill="#f6c945" stroke="#e0a82e" stroke-width="1.6"/>`,
};

export function iconSvg(id) {
  return cleanSvg(CLEAN_ICONS[id] || CLEAN_ICONS.sauce);
}

export function toppingSvg(id) {
  return cleanSvg(CLEAN_TOPPINGS[id] || CLEAN_TOPPINGS.tomato, id);
}

export function arrowSvg(dir) {
  const rot = { E: 0, S: 90, W: 180, N: -90 }[dir] ?? 0;
  return cleanSvg(
    `<g transform="rotate(${rot} 12 12)"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="#1e6b38" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    "Green arrow",
    "0 0 24 24",
  );
}
