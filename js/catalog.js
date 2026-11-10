export const GAMES = [
  {
    id: "sauce",
    href: "sauce-pipes.html",
    name: "Sauce Pipes",
    lines: ["SAUCE", "PIPES"],
    short: "Pipes",
    tagline: "Rotate the pipes. Get the sauce to the plate.",
    noun: "turn",
    cart: "tomato",
    win: "That's al dente!",
  },
  {
    id: "slip",
    href: "slip.html",
    name: "Slip",
    lines: ["SLIP"],
    short: "Slip",
    tagline: "Slide the trays. Get the meatball out.",
    noun: "move",
    cart: "lasagne",
    win: "The meatball is out!",
  },
  {
    id: "twirl",
    href: "twirl.html",
    name: "Twirl",
    lines: ["TWIRL"],
    short: "Twirl",
    tagline: "Connect the matching shapes. Fill the grid.",
    noun: "path",
    cart: "basil",
    win: "Fully twirled.",
  },
  {
    id: "bowls",
    href: "even-bowls.html",
    name: "Even Bowls",
    lines: ["EVEN", "BOWLS"],
    short: "Bowls",
    tagline: "Same total in every bowl.",
    noun: "move",
    cart: "pasta",
    win: "Even. Beautifully even.",
  },
  {
    id: "ravioli",
    href: "ravioli.html",
    name: "Ravioli",
    lines: ["RAVIOLI"],
    short: "Words",
    tagline: "Tap two halves to make a word.",
    noun: "try",
    cart: "blush",
    win: "A full plate of words.",
  },
  {
    id: "pips",
    href: "pasta-pips.html",
    name: "Pasta Pips",
    lines: ["PASTA", "PIPS"],
    short: "Pips",
    tagline: "Place the dominoes. Satisfy every region.",
    noun: "placement",
    cart: "ink",
    win: "Every sauce is satisfied.",
  },
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id);
}

export const DIFFICULTIES = ["easy", "medium", "hard"];
