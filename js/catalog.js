export const GAMES = [
  {
    id: "sauce",
    href: "sauce-pipes.html",
    name: "Sauce Pipes",
    lines: ["SAUCE", "PIPES"],
    short: "Pipes",
    goal: "Turn the pipes so the sauce reaches the plate.",
    noun: "turn",
    cart: "tomato",
    win: "The sauce reached the plate.",
  },
  {
    id: "slip",
    href: "slip.html",
    name: "Slip",
    lines: ["SLIP"],
    short: "Slip",
    goal: "Slide the trays so the meatball reaches the green arrow.",
    noun: "move",
    cart: "lasagne",
    win: "The meatball got out.",
  },
  {
    id: "twirl",
    href: "twirl.html",
    name: "Twirl",
    lines: ["TWIRL"],
    short: "Twirl",
    goal: "Join each matching pair and cover every square.",
    noun: "pair",
    cart: "basil",
    win: "Every square is covered.",
  },
  {
    id: "bowls",
    href: "even-bowls.html",
    name: "Even Bowls",
    lines: ["EVEN", "BOWLS"],
    short: "Bowls",
    goal: "Put every number in a bowl so the totals match.",
    noun: "move",
    cart: "pasta",
    win: "The bowls match.",
  },
  {
    id: "ravioli",
    href: "ravioli.html",
    name: "Ravioli",
    lines: ["RAVIOLI"],
    short: "Words",
    goal: "Tap two halves that make one real word.",
    noun: "try",
    cart: "blush",
    win: "You made every word.",
  },
  {
    id: "pips",
    href: "pasta-pips.html",
    name: "Pasta Pips",
    lines: ["PASTA", "PIPS"],
    short: "Pips",
    goal: "Place every domino so each colored area follows its rule.",
    noun: "domino",
    cart: "ink",
    win: "Every area follows its rule.",
  },
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id);
}

export const DIFFICULTIES = ["easy", "medium", "hard"];
